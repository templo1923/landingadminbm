const { db, G, graph, dec, authUser, ensureOrg } = require('./_lib');

module.exports = async (req, res) => {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  const user = await authUser(req);
  if (!user) return res.status(401).json({ error: 'No autorizado' });
  try {
    const orgId = await ensureOrg(user);
    const { data: conns, error } = await db.from('connections').select('id,waba_id,phone_number_id,display_phone,token_cipher').eq('org_id', orgId);
    if (error) throw error;
    const statuses = [];
    for (const conn of conns || []) {
      try {
        const result = await graph(G(`${conn.waba_id}/subscribed_apps`), { headers: { Authorization: `Bearer ${dec(conn.token_cipher)}` } });
        statuses.push({ id: conn.id, waba_id: conn.waba_id, display_phone: conn.display_phone, subscribed: true, data: result.data || [] });
      } catch (e) {
        statuses.push({ id: conn.id, waba_id: conn.waba_id, display_phone: conn.display_phone, subscribed: false, error: e.message });
      }
    }
    return res.status(200).json({ webhook_url: '/api/webhook', connections: statuses });
  } catch (e) {
    return res.status(500).json({ error: e.message || 'No se pudo comprobar el webhook' });
  }
};
