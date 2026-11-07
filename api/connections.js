const { db, dec, authUser, ensureOrg, audit, syncWaba } = require('./_lib');
const COLS = 'id,business_id,waba_id,name,phone_number_id,display_phone,verified_name,status,quality,tier,token_expires_at,synced_at,created_at';

module.exports = async (req, res) => {
  const user = await authUser(req);
  if (!user) return res.status(401).json({ error: 'No autorizado' });
  try {
    const orgId = await ensureOrg(user);
    let { data: conns } = await db.from('connections').select(COLS + ',token_cipher').eq('org_id', orgId).order('created_at', { ascending: false });
    conns = conns || [];

    if (req.method === 'POST' && (req.body || {}).action === 'sync') {
      for (const c of conns) {
        try { await syncWaba(c, dec(c.token_cipher)); } catch (e) { await db.from('connections').update({ status: 'error' }).eq('id', c.id); console.error('sync', c.waba_id, e.message); }
      }
      await audit(orgId, user.id, 'connections.synced', { count: conns.length });
      ({ data: conns } = await db.from('connections').select(COLS + ',token_cipher').eq('org_id', orgId).order('created_at', { ascending: false }));
    }

    const safe = (conns || []).map(({ token_cipher, ...c }) => c); // el token jamás sale del backend
    const ids = safe.map(c => c.id);
    const { data: templates } = ids.length ? await db.from('templates').select('connection_id,name,language,category,status').in('connection_id', ids).order('name') : { data: [] };
    const { data: activity } = await db.from('audit_log').select('action,meta,at').eq('org_id', orgId).order('at', { ascending: false }).limit(10);
    res.status(200).json({ email: user.email, connections: safe, templates: templates || [], activity: activity || [] });
  } catch (e) {
    console.error('connections error:', e.message);
    res.status(500).json({ error: 'Error del servidor' });
  }
};
