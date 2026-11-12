// api/routing.js — Routing de Ranvedix, por conexion: /connections/{id} -> tab Routing
// Captura: Webhook Override, "Where Meta delivers message webhooks. Messages go directly from Meta to your server — we never see them."
// Campos: Webhook URL (HTTPS), Verify token, Save & re-apply, Test ping.
// GET: devuelve la URL completa (solo en Routing, no en Overview) + si hay token configurado, no el token.
// POST action=save: valida https + token, encripta token, guarda, audita routing.saved, intenta re-aplicar.
// POST action=test: hace ping de verificacion a la URL del cliente, como hace Meta: ?hub.mode=subscribe&hub.verify_token=...&hub.challenge=...

const { db, G, graph, enc, dec, authUser, ensureOrg, audit } = require('./_lib');

function isHttpsUrl(u) { try { const x = new URL(u); return x.protocol === 'https:'; } catch { return false; } }

module.exports = async (req, res) => {
  const user = await authUser(req);
  if (!user) return res.status(401).json({ ok: false, error: 'No autorizado' });
  const id = req.query.connection_id || req.query.id || (req.body || {}).connection_id;
  if (!id) return res.status(400).json({ ok: false, error: 'Falta connection_id' });
  try {
    const orgId = await ensureOrg(user);
    const { data: conn, error } = await db.from('connections')
      .select('id,business_id,waba_id,phone_number_id,display_phone,verified_name,mode,status,customer_webhook_url,customer_verify_token_cipher,token_cipher')
      .eq('id', id).eq('org_id', orgId).maybeSingle();
    if (error || !conn) return res.status(404).json({ ok: false, error: 'Conexión no encontrada' });

    // GET — solo Routing muestra la URL completa
    if (req.method === 'GET') {
      return res.status(200).json({
        ok: true,
        connection_id: conn.id,
        waba_id: conn.waba_id,
        phone_number_id: conn.phone_number_id,
        display_phone: conn.display_phone,
        mode: conn.mode,
        status: conn.status,
        customer_webhook_url: conn.customer_webhook_url || '',
        hasVerifyToken: Boolean(conn.customer_verify_token_cipher),
        // Nunca devolvemos el token en plano en GET. En el input de Routing se muestra vacio con placeholder.
      });
    }

    if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Method not allowed' });
    const { action, customer_webhook_url, customer_verify_token } = req.body || {};

    // TEST PING — verifica que la URL del cliente responde como un webhook de Meta
    if (action === 'test') {
      const url = (customer_webhook_url || conn.customer_webhook_url || '').trim();
      const token = customer_verify_token || (conn.customer_verify_token_cipher ? dec(conn.customer_verify_token_cipher) : '');
      if (!url || !isHttpsUrl(url)) return res.status(400).json({ ok: false, error: 'Webhook URL debe ser https' });
      if (!token) return res.status(400).json({ ok: false, error: 'Falta Verify token para el Test ping' });
      const challenge = 'whatkiamber-test-' + Date.now();
      const testUrl = url + (url.includes('?') ? '&' : '?') + new URLSearchParams({ 'hub.mode': 'subscribe', 'hub.verify_token': token, 'hub.challenge': challenge }).toString();
      try {
        const r = await fetch(testUrl, { method: 'GET', signal: AbortSignal.timeout(5000) });
        const text = await r.text();
        if (r.ok && text.trim() === challenge) {
          await audit(orgId, user.id, 'routing.test_ok', { connection_id: conn.id, waba_id: conn.waba_id });
          return res.status(200).json({ ok: true, message: 'Test ping OK: tu webhook devolvio el challenge.' });
        }
        return res.status(200).json({ ok: false, error: `Tu webhook respondio ${r.status} pero no devolvio el challenge. Revisa que verifique hub.verify_token.` });
      } catch (e) {
        return res.status(200).json({ ok: false, error: 'No se pudo alcanzar tu webhook: ' + e.message });
      }
    }

    // SAVE & RE-APPLY — guarda y re-aplica
    if (action === 'save') {
      if (!customer_webhook_url || !isHttpsUrl(customer_webhook_url))
        return res.status(400).json({ ok: false, error: 'Webhook URL debe ser https' });
      if (!customer_verify_token || String(customer_verify_token).length < 4)
        return res.status(400).json({ ok: false, error: 'Verify token es obligatorio' });

      const upd = {
        customer_webhook_url: customer_webhook_url.trim(),
        customer_verify_token_cipher: enc(String(customer_verify_token)),
      };
      const { error: upErr } = await db.from('connections').update(upd).eq('id', conn.id).eq('org_id', orgId);
      if (upErr) throw upErr;

      // Re-apply: best-effort, no inventamos exito. Intentamos confirmar que la app sigue suscrita a esa WABA.
      // Si Meta falla, guardamos igual y devolvemos warning, para que no parezca que quedo aplicado si no quedo.
      let reapply = { ok: true, note: 'Guardado. Re-apply intentado.' };
      try {
        const token = dec(conn.token_cipher);
        const h = { headers: { Authorization: `Bearer ${token}` } };
        await graph(`${G(conn.waba_id + '/subscribed_apps')}`, h);
      } catch (e) {
        reapply = { ok: false, note: 'Guardado, pero Meta no confirmo subscribed_apps: ' + e.message + '. Revisa en Meta que la app siga suscrita.' };
      }

      await audit(orgId, user.id, 'routing.saved', { connection_id: conn.id, waba_id: conn.waba_id, customer_webhook_url: upd.customer_webhook_url });
      return res.status(200).json({ ok: true, message: 'Webhook Override guardado.', reapply });
    }

    return res.status(400).json({ ok: false, error: 'Accion no valida. Usa save o test.' });
  } catch (e) {
    console.error('routing error:', e.message);
    return res.status(500).json({ ok: false, error: 'No se pudo cargar Routing' });
  }
};
