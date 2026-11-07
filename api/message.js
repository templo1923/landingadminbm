const { db, G, graph, dec, authUser, ensureOrg, userError } = require('./_lib');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const user = await authUser(req);
  if (!user) return res.status(401).json({ error: 'No autorizado' });
  const { connection_id, to, text, template } = req.body || {};
  const recipient = String(to || '').replace(/\D/g, '');
  const isTpl = !!(template && template.name);
  if (!connection_id || recipient.length < 8 || (!isTpl && !text)) return res.status(400).json({ error: 'Conexión, destinatario y mensaje (o plantilla) son obligatorios' });
  try {
    const orgId = await ensureOrg(user);
    const { data: conn } = await db.from('connections').select('id,phone_number_id,token_cipher').eq('id', connection_id).eq('org_id', orgId).maybeSingle();
    if (!conn) return res.status(404).json({ error: 'Conexión no encontrada' });
    if (!conn.phone_number_id) return res.status(400).json({ error: 'La conexión aún no tiene número sincronizado: pulsa Sincronizar.' });
    // Plantilla: sirve en cualquier momento. Texto libre: solo con la ventana de 24 h abierta.
    const payload = isTpl
      ? { messaging_product: 'whatsapp', to: recipient, type: 'template', template: { name: String(template.name), language: { code: String(template.language || 'en_US') } } }
      : { messaging_product: 'whatsapp', recipient_type: 'individual', to: recipient, type: 'text', text: { preview_url: false, body: String(text).slice(0, 4096) } };
    const result = await graph(G(`${conn.phone_number_id}/messages`), {
      method: 'POST', headers: { Authorization: `Bearer ${dec(conn.token_cipher)}`, 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    await db.from('messages').upsert({ connection_id: conn.id, wa_message_id: (result.messages && result.messages[0] && result.messages[0].id) || null,
      contact_wa_id: recipient, direction: 'out', type: payload.type, status: 'sent',
      body: isTpl ? '[plantilla] ' + payload.template.name : payload.text.body }, { onConflict: 'wa_message_id' });
    return res.status(200).json({ ok: true, result });
  } catch (e) {
    console.error('message send error:', e.code, e.message);
    return res.status(400).json({ error: userError(e) });
  }
};
