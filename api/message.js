const { db, G, graph, dec, authUser, ensureOrg } = require('./_lib');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const user = await authUser(req);
  if (!user) return res.status(401).json({ error: 'No autorizado' });
  const { connection_id, to, text } = req.body || {};
  if (!connection_id || !to || !text) return res.status(400).json({ error: 'Conexión, destinatario y mensaje son obligatorios' });
  const recipient = String(to).replace(/[^0-9]/g, '');
  if (recipient.length < 8) return res.status(400).json({ error: 'Número destinatario no válido' });
  try {
    const orgId = await ensureOrg(user);
    const { data: conn, error } = await db.from('connections').select('*').eq('id', connection_id).eq('org_id', orgId).maybeSingle();
    if (error || !conn) return res.status(404).json({ error: 'Conexión no encontrada' });
    if (!conn.phone_number_id) return res.status(400).json({ error: 'La conexión todavía no tiene phone_number_id sincronizado' });
    const result = await graph(G(`${conn.phone_number_id}/messages`), {
      method: 'POST',
      headers: { Authorization: `Bearer ${dec(conn.token_cipher)}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ messaging_product: 'whatsapp', recipient_type: 'individual', to: recipient, type: 'text', text: { preview_url: false, body: String(text).slice(0, 4096) } })
    });
    return res.status(200).json({ ok: true, result });
  } catch (e) {
    console.error('message send error:', e.message);
    return res.status(500).json({ error: e.message || 'No se pudo enviar el mensaje' });
  }
};
