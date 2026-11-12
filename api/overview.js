// api/overview.js — Overview del dashboard, todo por API, como Ranvedix.
// NO guarda mensajes. NO cuenta local. NO escribe en Supabase en cada carga.
// Supabase solo es indice: id, waba_id, phone_number_id, token_cipher, customer_webhook_url.
// Fuente de verdad: Meta Graph API en vivo. Messages MTD = 0 hasta que Meta devuelva real.

const { db, G, graph, dec, authUser, ensureOrg } = require('./_lib');

const safeInt = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);

// Intento de analitica de Meta. Best-effort: si Meta no devuelve, es 0.
// No se inventa, no se cuenta local, no se lee tabla messages (que no existe).
async function fetchMessagesMTD(conn, token) {
  // Meta Conversation Analytics: GET /{waba_id}/conversation_analytics
  // Requiere rango. Si la cuenta no tiene datos o no tiene permiso, Meta devuelve error o vacio.
  // En ese caso devolvemos 0 con source meta_analytics, como hace Ranvedix cuando aun no hay dato.
  try {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const end = now.toISOString().split('T')[0];
    const h = { headers: { Authorization: `Bearer ${token}` } };
    const q = new URLSearchParams({
      start, end, granularity: 'MONTHLY',
      phone_numbers: JSON.stringify([conn.phone_number_id]),
      metric_types: JSON.stringify(['conversation']),
      conversation_types: JSON.stringify(['utility', 'marketing', 'authentication', 'service']),
      conversation_directions: JSON.stringify(['business_initiated', 'user_initiated']),
    });
    const r = await graph(`${G(conn.waba_id + '/conversation_analytics')}?${q.toString()}`, h);
    const rows = (r && r.data) || [];
    let total = 0;
    for (const row of rows) {
      const pts = row.data_points || row.dataPoints || [];
      for (const p of pts) total += safeInt(p.conversation);
    }
    // Si Meta devuelve estructura pero sin puntos, es 0 real, no error.
    return { value: total, source: 'meta_analytics', hasData: rows.length > 0 };
  } catch (e) {
    // No hay dato de Meta todavia: 0, sin inventar.
    return { value: 0, source: 'meta_analytics', hasData: false, analyticsError: e.message };
  }
}

module.exports = async (req, res) => {
  if (req.method !== 'GET') return res.status(405).json({ ok: false, error: 'Method not allowed' });
  const user = await authUser(req);
  if (!user) return res.status(401).json({ ok: false, error: 'No autorizado' });

  try {
    const orgId = await ensureOrg(user);

    // 1) Solo indice desde Supabase. Nunca el token en plano, nunca el webhook completo en Overview.
    // Overview del dashboard NO devuelve la URL completa, solo si esta configurado.
    // La URL completa solo la devuelve el detalle Routing, como en Ranvedix.
    const { data: conns, error } = await db
      .from('connections')
      .select('id,business_id,waba_id,phone_number_id,display_phone,verified_name,status,quality,tier,mode,customer_webhook_url,synced_at,created_at,token_cipher')
      .eq('org_id', orgId)
      .order('created_at', { ascending: false });
    if (error) throw error;

    const list = conns || [];
    const lastCheckedAt = new Date().toISOString();

    // 2) En vivo por cada conexion, como Diagnostic. Si una falla, no tumba todo Overview.
    const live = [];
    let messagesMTD = 0;
    let messagesMTDSource = 'meta_analytics';
    let messagesMTDHasData = false;

    for (const c of list) {
      let phone = null;
      let liveError = null;
      let token = null;
      try { token = dec(c.token_cipher); } catch (e) { liveError = 'Token no se pudo desencriptar'; }

      if (token) {
        try {
          const h = { headers: { Authorization: `Bearer ${token}` } };
          // Equivalente a lo que muestra Ranvedix en Connections: quality, tier, status.
          const ph = await graph(
            `${G(c.waba_id + '/phone_numbers')}?fields=id,display_phone_number,verified_name,quality_rating,messaging_limit_tier,status`,
            h
          );
          phone = (ph.data || []).find((p) => p.id === c.phone_number_id) || (ph.data || [])[0] || null;
        } catch (e) {
          liveError = e.message;
        }
      }

      // Messages MTD: solo analitica de Meta, por conexion, sumado.
      // Si no hay token o falla, esa conexion aporta 0.
      if (token && c.phone_number_id) {
        const m = await fetchMessagesMTD(c, token);
        messagesMTD += m.value;
        if (m.hasData) messagesMTDHasData = true;
      }

      const qualityRaw = (phone && phone.quality_rating) || c.quality || 'UNKNOWN';
      const quality = String(qualityRaw).toUpperCase(); // GREEN, YELLOW, RED, UNKNOWN
      const tier = (phone && phone.messaging_limit_tier) || c.tier || null;
      const statusRaw = (phone && phone.status) || c.status || 'pending';
      const isLive = statusRaw === 'CONNECTED' || statusRaw === 'live';
      const needsAttention = quality === 'RED' || quality === 'YELLOW' || !isLive;

      live.push({
        id: c.id,
        business_id: c.business_id || null,
        waba_id: c.waba_id,
        phone_number_id: c.phone_number_id,
        display_phone: (phone && phone.display_phone_number) || c.display_phone,
        verified_name: (phone && phone.verified_name) || c.verified_name,
        // Lo que muestra Ranvedix en la lista: STATE, QUALITY, TIER
        state: isLive ? 'live' : 'pending',
        status: statusRaw,
        quality: quality.toLowerCase(), // green, yellow, red, unknown
        tier: tier, // TIER_250, etc. o null si Meta aun no devuelve
        mode: c.mode || 'dedicado', // dedicado | coexistencia, como en Ranvedix TYPE
        // En Overview del dashboard NO devolvemos la URL completa.
        // Solo si esta configurado, como en Ranvedix que muestra el bloque Receiving messages.
        hasWebhookOverride: Boolean(c.customer_webhook_url),
        // Heartbeat: NO lo inventamos. Ranvedix lo muestra como "healthy" en lista y
        // "Last opened / Next due" en Health, que es un click manual del usuario.
        // Aqui solo devolvemos lastChecked en vivo. lastOpened vendra de Health en el paso 2.
        heartbeat: { status: liveError ? 'error' : 'checked', lastCheckedAt },
        checkedAt: lastCheckedAt,
        liveError,
        created_at: c.created_at,
        synced_at: c.synced_at,
      });
    }

    // 3) KPIs calculados en backend, no en frontend, no con datos ficticios.
    const total = live.length;
    const liveCount = live.filter((x) => x.state === 'live').length;
    const needsAttentionCount = live.filter((x) => x.quality === 'red' || x.quality === 'yellow' || x.state !== 'live').length;
    const qualityDistribution = {
      green: live.filter((x) => x.quality === 'green').length,
      yellow: live.filter((x) => x.quality === 'yellow').length,
      red: live.filter((x) => x.quality === 'red').length,
      unknown: live.filter((x) => x.quality === 'unknown').length,
    };

    // 4) Actividad: solo audit_log, acciones de admin. Nunca mensajes.
    // Ejemplo: connections.synced, template.created, webhook.forwarded, routing.saved.
    const { data: activity } = await db
      .from('audit_log')
      .select('action,meta,at')
      .eq('org_id', orgId)
      .order('at', { ascending: false })
      .limit(10);

    // 5) Respuesta limpia, sin token_cipher, sin webhook URL completa, sin mensajes.
    return res.status(200).json({
      ok: true,
      email: user.email,
      lastCheckedAt,
      kpis: {
        connections: total,
        live: liveCount,
        needsAttention: needsAttentionCount,
        // Messages MTD: 0 hasta que Meta devuelva real. Nunca conteo local.
        messagesMTD,
        messagesMTDSource,
        messagesMTDHasData,
      },
      qualityDistribution,
      connections: live,
      recentConnections: live.slice(0, 3),
      recentActivity: (activity || []).map((a) => ({
        action: a.action,
        at: a.at,
        meta: a.meta || {},
      })),
    });
  } catch (e) {
    console.error('overview error:', e.message);
    return res.status(500).json({ ok: false, error: 'No se pudo cargar Overview en vivo' });
  }
};
