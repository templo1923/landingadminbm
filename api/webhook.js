// api/webhook.js — COMPLETO, message-blind, forward + drop. Antes guardaba mensajes, eso estaba mal.
// Flujo real:
// 1) GET: Meta verifica con WEBHOOK_VERIFY_TOKEN de la app (no del cliente).
// 2) POST: verifica X-Hub-Signature-256 con APP_SECRET, si falla -> 401, no procesa.
// 3) Busca la conexion por waba_id, toma su customer_webhook_url.
// 4) Hace forward del payload COMPLETO a esa URL, con la misma firma, timeout 5s, sin guardar contenido.
// 5) Audita solo metadatos: waba_id, tipo de evento, status_code. Nunca body.
// 6) Si no hay customer_webhook_url, dropea y audita webhook.dropped_no_override.
// 7) Si el evento es de calidad / template / cuenta (management), audita para Health y Recent activity.
// Nunca escribe en tabla messages (que no existe).
const crypto = require('crypto');
const { db } = require('./_lib');
const rawBody = req => new Promise((resolve, reject) => { const c=[]; req.on('data', d=>c.push(d)); req.on('end', ()=>resolve(Buffer.concat(c))); req.on('error', reject); });

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
  let payload; try { payload = JSON.parse(body.toString('utf8')); } catch { return res.status(400).send('Bad JSON'); }
  // Responder rapido a Meta, el forward va despues sin bloquear.
  res.status(200).send('EVENT_RECEIVED');
  try {
    const entries = payload.entry || [];
    for (const entry of entries) {
      const wabaId = entry.id;
      const changes = entry.changes || [];
      // Buscar conexion por waba_id para saber a donde hacer forward
      const { data: conn } = await db.from('connections').select('id,org_id,waba_id,customer_webhook_url').eq('waba_id', wabaId).maybeSingle();
      // Auditar solo management events, sin contenido de mensajes
      for (const ch of changes) {
        if (ch.field && ch.field !== 'messages') {
          if (conn) await db.from('audit_log').insert({ org_id: conn.org_id, actor: 'meta-webhook', action: 'webhook.'+ch.field, meta: { connection_id: conn.id, waba_id: wabaId, field: ch.field } });
        }
      }
      if (!conn || !conn.customer_webhook_url) {
        if (conn) await db.from('audit_log').insert({ org_id: conn.org_id, actor: 'system', action: 'webhook.dropped_no_override', meta: { connection_id: conn.id, waba_id: wabaId } });
        continue;
      }
      // Forward: mismo body, misma firma, a la URL del cliente. Sin guardar.
      try {
        const r = await fetch(conn.customer_webhook_url, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Hub-Signature-256': sig }, body, signal: AbortSignal.timeout(5000) });
        await db.from('audit_log').insert({ org_id: conn.org_id, actor: 'system', action: 'webhook.forwarded', meta: { connection_id: conn.id, waba_id: wabaId, status: r.status } });
      } catch (e) {
        await db.from('audit_log').insert({ org_id: conn.org_id, actor: 'system', action: 'webhook.forward_failed', meta: { connection_id: conn.id, waba_id: wabaId, error: e.message } });
      }
    }
  } catch (e) { console.error('webhook forward error:', e.message); }
};
