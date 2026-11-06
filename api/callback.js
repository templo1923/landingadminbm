const { db, G, graph, enc, authUser, ensureOrg, audit, syncWaba } = require('./_lib');
module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Method not allowed' });
  const user = await authUser(req);
  if (!user) return res.status(401).json({ ok: false, error: 'Inicia sesión primero' });
  const { code, waba_id, phone_number_id, business_id } = req.body || {};
  if (!code) return res.status(400).json({ ok: false, error: 'Missing code' });

  try {
    const orgId = await ensureOrg(user);

    // 1) Cambiar el code de inmediato (vence en segundos). Con el SDK no se envía redirect_uri.
    const short = await graph(`${G('oauth/access_token')}?` + new URLSearchParams({
      client_id: process.env.APP_ID, client_secret: process.env.APP_SECRET, code }));

    // Embedded Signup devuelve aquí el Business Integration System User token.
    // No se debe convertir a un token de usuario largo con fb_exchange_token.
    const token = short.access_token;
    const expires = short.expires_in ? new Date(Date.now() + short.expires_in * 1000).toISOString() : null;

    // El waba_id devuelto por Embedded Signup es la fuente primaria.
    // El endpoint de client WABAs queda solo como reconciliación secundaria.

    // 4) WABAs del BM verificado (+ la que reportó el evento de Embedded Signup)
    const ids = new Map();
    if (process.env.SYSTEM_USER_TOKEN) {
      try {
        const list = await graph(`${G(process.env.BUSINESS_ID + '/client_whatsapp_business_accounts')}?fields=id,name&limit=100`,
          { headers: { Authorization: `Bearer ${process.env.SYSTEM_USER_TOKEN}` } });
        (list.data || []).forEach(w => ids.set(w.id, w.name));
      } catch (e) { console.error('client_wabas:', e.message); }
    }
    if (waba_id) ids.set(waba_id, ids.get(waba_id) || null);
    if (!ids.size) { // último respaldo: granular_scopes del token
      const dbg = await graph(`${G('debug_token')}?` + new URLSearchParams({
        input_token: token, access_token: `${process.env.APP_ID}|${process.env.APP_SECRET}` }));
      const s = (dbg.data.granular_scopes || []).find(x => x.scope === 'whatsapp_business_management');
      ((s && s.target_ids) || []).forEach(id => ids.set(id, null));
    }
    if (!ids.size) return res.status(202).json({ ok: false, pending: true });

    // 5) Guardar (token cifrado), suscribir webhooks y sincronizar
    for (const [id, name] of ids) {
      const { data: conn, error } = await db.from('connections').upsert(
        { org_id: orgId, waba_id: id, name, phone_number_id: id === waba_id ? phone_number_id || null : null, token_cipher: enc(token), token_expires_at: expires },
        { onConflict: 'waba_id' }).select().single();
      if (error) throw error;
      await graph(G(`${id}/subscribed_apps`), { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
      try { await syncWaba(conn, token); } catch (e) { console.error('sync:', e.message); }
      await audit(orgId, user.id, 'connection.created', { waba_id: id });
    }
    return res.status(200).json({ ok: true, connected: ids.size });
  } catch (e) {
    console.error('callback error:', e.message);
    return res.status(500).json({ ok: false, error: 'No se pudo completar la conexión' });
  }
};
