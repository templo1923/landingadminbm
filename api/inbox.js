const { db, authUser, ensureOrg } = require('./_lib');

module.exports = async (req, res) => {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  const user = await authUser(req);
  if (!user) return res.status(401).json({ error: 'No autorizado' });
  try {
    const orgId = await ensureOrg(user);
    const { data: conns } = await db.from('connections').select('id').eq('org_id', orgId);
    const ids = (conns || []).map(c => c.id);
    if (!ids.length) return res.status(200).json({ messages: [] });
    const { data, error } = await db.from('messages').select('connection_id,contact_wa_id,contact_name,direction,type,body,status,at')
      .in('connection_id', ids).order('at', { ascending: false }).limit(400);
    return res.status(200).json({ messages: error ? [] : data || [] });
  } catch (e) {
    console.error('inbox error:', e.message);
    return res.status(500).json({ error: 'No se pudo cargar la bandeja' });
  }
};
