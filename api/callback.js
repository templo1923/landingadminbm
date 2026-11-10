const { db, G, graph, enc, authUser, ensureOrg, audit, syncWaba } = require('./_lib');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Method not allowed' });
  const user = await authUser(req);
  if (!user) return res.status(401).json({ ok: false, error: 'Inicia sesión primero' });
  const { code, waba_id, phone_number_id, business_id, mode } = req.body || {};
  if (!code) return res.status(400).json({ ok: false, error: 'Missing code' });
  // mode: 'dedicado' o 'coexistencia' — viene del botón que usó el usuario. Si no viene, es 'dedicado' para no romper lo viejo.
  const cleanMode = mode === 'coexistencia' ? 'coexistencia' : 'dedicado';

  try {
    const orgId = await ensureOrg(user);

    // 1) Cambiar el code de inmediato (vence en segundos). Con el SDK no se envía redirect_uri.
    const short = await graph(`${G('oauth/access_token')}?` + new URLSearchParams({
      client_id: process.env.APP_ID, client_secret: process.env.APP_SECRET, code }));
    const token = short.access_token; // token de Business Integration System User: no se convierte
    const expires = short.expires_in ? new Date(Date.now() + short.expires_in * 1000).toISOString() : null;

    // 2) La WABA del popup es la fuente primaria. Solo 2 permisos: whatsapp_business_management + whatsapp_business_messaging.
    // Ya NO usamos SYSTEM_USER_TOKEN ni client_whatsapp_business_accounts (eso pedía business_management).
    const ids = new Map();
    if (waba_id) ids.set(waba_id, null);
    if (!ids.size) { // último respaldo: granular_scopes del token (solo whatsapp_business_management)
      const dbg = await graph(`${G('debug_token')}?` + new URLSearchParams({
        input_token: token, access_token: `${process.env.APP_ID}|${process.env.APP_SECRET}` }));
      const s = (dbg.data.granular_scopes || []).find(x => x.scope === 'whatsapp_business_management');
      ((s && s.target_ids) || []).forEach(id => ids.set(id, null));
    }
    if (!ids.size) return res.status(202).json({ ok: false, pending: true });

    // 3) Guardar (token cifrado), suscribir webhook y sincronizar — webhook único global /api/webhook, SIN override por ahora.
    for (const [id, name] of ids) {
      const row = { org_id: orgId, waba_id: id, token_cipher: enc(token), token_expires_at: expires };
      if (name) row.name = name;
      if (id === waba_id) { if (phone_number_id) row.phone_number_id = phone_number_id; if (business_id) row.business_id = business_id; }
      // Intentamos guardar mode si la columna existe; si no existe, reintentamos sin mode para no romper.
      let rowWithMode = { ...row, mode: cleanMode };
      let { data: conn, error } = await db.from('connections').upsert(rowWithMode, { onConflict: 'waba_id' }).select().single();
      if (error && rowWithMode.mode) { delete rowWithMode.mode; ({ data: conn, error } = await db.from('connections').upsert(rowWithMode, { onConflict: 'waba_id' }).select().single()); }
      if (error && row.business_id) { delete row.business_id; ({ data: conn, error } = await db.from('connections').upsert(row, { onConflict: 'waba_id' }).select().single()); }
      if (error) throw error;
      await graph(G(`${id}/subscribed_apps`), { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
      try { await syncWaba(conn, token); } catch (e) { console.error('sync:', e.message); }
      await audit(orgId, user.id, 'connection.created', { waba_id: id, mode: cleanMode });
    }
    return res.status(200).json({ ok: true, connected: ids.size, mode: cleanMode });
  } catch (e) {
    console.error('callback error:', e.message);
    return res.status(500).json({ ok: false, error: 'No se pudo completar la conexión' });
  }
};
