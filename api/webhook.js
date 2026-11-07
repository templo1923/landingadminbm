const crypto = require('crypto');
const { db } = require('./_lib');

const rawBody = req => new Promise((resolve, reject) => {
  const c = []; req.on('data', d => c.push(d)); req.on('end', () => resolve(Buffer.concat(c))); req.on('error', reject);
});
const textOf = m => m.type === 'text' ? (m.text && m.text.body)
  : m.type === 'button' ? (m.button && m.button.text)
  : m.type === 'interactive' ? (m.interactive && ((m.interactive.button_reply && m.interactive.button_reply.title) || (m.interactive.list_reply && m.interactive.list_reply.title)))
  : null;

module.exports = async (req, res) => {
  if (req.method === 'GET') {
    const q = req.query;
    if (q['hub.mode'] === 'subscribe' && q['hub.verify_token'] === (process.env.WEBHOOK_VERIFY_TOKEN || '').trim()) return res.status(200).send(q['hub.challenge']);
    return res.status(403).send('Forbidden');
  }
  if (req.method !== 'POST') { res.setHeader('Allow', 'GET, POST'); return res.status(405).end(); }

  const body = await rawBody(req);
  const sig = req.headers['x-hub-signature-256'] || '';
  const exp = 'sha256=' + crypto.createHmac('sha256', (process.env.APP_SECRET || '').trim()).update(body).digest('hex');
  if (sig.length !== exp.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(exp))) return res.status(401).send('Invalid signature');

  // Se procesa ANTES de responder: en Vercel, lo que corre después de responder puede cortarse.
  try {
    const payload = JSON.parse(body.toString('utf8'));
    for (const entry of payload.entry || []) {
      const { data: conn } = await db.from('connections').select('id,org_id').eq('waba_id', String(entry.id)).maybeSingle();
      if (!conn) continue;
      for (const ch of entry.changes || []) {
        const v = ch.value || {};
        if (ch.field === 'messages') {
          const names = {}; (v.contacts || []).forEach(c => { names[c.wa_id] = c.profile && c.profile.name; });
          const rows = (v.messages || []).map(m => ({ connection_id: conn.id, wa_message_id: m.id, contact_wa_id: m.from, contact_name: names[m.from] || null,
            direction: 'in', type: m.type, body: textOf(m) || `[${m.type}]`, at: new Date(Number(m.timestamp) * 1000).toISOString() }));
          if (rows.length) await db.from('messages').upsert(rows, { onConflict: 'wa_message_id' });
          for (const s of v.statuses || []) await db.from('messages').update({ status: s.status }).eq('wa_message_id', s.id).eq('connection_id', conn.id);
        } else if (ch.field === 'phone_number_quality_update') {
          if (v.current_limit) await db.from('connections').update({ tier: v.current_limit }).eq('id', conn.id);
          await db.from('audit_log').insert({ org_id: conn.org_id, action: 'quality.' + (v.event || 'update'), meta: { tier: v.current_limit || null } });
        } else if (ch.field === 'message_template_status_update') {
          await db.from('templates').upsert({ connection_id: conn.id, name: v.message_template_name, language: v.message_template_language || 'und', status: v.event, updated_at: new Date().toISOString() }, { onConflict: 'connection_id,name,language' });
        } else if (ch.field === 'account_update' || ch.field === 'account_review_update') {
          await db.from('audit_log').insert({ org_id: conn.org_id, action: ch.field, meta: { event: v.event || v.decision || null } });
        }
      }
    }
  } catch (e) { console.error('webhook error:', e.message); }
  return res.status(200).send('EVENT_RECEIVED');
};
module.exports.config = { api: { bodyParser: false } };
