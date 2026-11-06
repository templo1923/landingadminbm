const { db, G, graph, dec, authUser, ensureOrg, syncWaba } = require('./_lib');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const user = await authUser(req);
  if (!user) return res.status(401).json({ error: 'No autorizado' });
  const { connection_id, name, language, category, body } = req.body || {};
  if (!connection_id || !name || !language || !category || !body) return res.status(400).json({ error: 'Faltan campos de la plantilla' });
  if (!/^[a-z0-9_]{1,512}$/.test(name)) return res.status(400).json({ error: 'El nombre solo puede usar minúsculas, números y guion bajo' });
  if (!['UTILITY', 'MARKETING', 'AUTHENTICATION'].includes(category)) return res.status(400).json({ error: 'Categoría no válida' });
  try {
    const orgId = await ensureOrg(user);
    const { data: conn, error } = await db.from('connections').select('*').eq('id', connection_id).eq('org_id', orgId).maybeSingle();
    if (error || !conn) return res.status(404).json({ error: 'Conexión no encontrada' });
    const token = dec(conn.token_cipher);
    const created = await graph(G(`${conn.waba_id}/message_templates`), {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, language, category, components: [{ type: 'BODY', text: body }] })
    });
    try { await syncWaba(conn, token); } catch (e) { console.error('template sync:', e.message); }
    return res.status(200).json({ ok: true, template: created });
  } catch (e) {
    console.error('template create error:', e.message);
    return res.status(500).json({ error: e.message || 'No se pudo crear la plantilla' });
  }
};
