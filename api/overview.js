// api/overview.js — V2 CORREGIDO, todo por API, como Ranvedix en tu captura.
// Overview del dashboard: https://ranvedix.com/ (tu captura)
// - Header: "Live health of your WhatsApp estate, at a glance."
// - Acciones: "Migrate a number" + "Manage connections" -> /connections
// - 4 KPIs: CONNECTIONS, LIVE (0 provisioning/other), NEEDS ATTENTION, MESSAGES (MTD) 0
// - Quality distribution: 1 live number, High / Medium / Low / Unrated
// - Recent connections: View all, + telefono, Coexistence, live, Manage -> /connections/{id}
// - Recent activity: "Connection went live" + "Connection created", 1d ago
// - Si hay 0 conexiones: estado vacio con "Onboard a WhatsApp number"
// NO guarda mensajes. NO cuenta local. Solo lectura, no escribe en cada carga.
// Messages MTD = 0 hasta que Meta devuelva real, analitica directa.

const { db, G, graph, dec, authUser, ensureOrg } = require('./_lib');
const safeInt = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);

async function fetchMessagesMTD(conn, token) {
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
    return { value: total, source: 'meta_analytics', hasData: rows.length > 0 };
  } catch (e) {
    return { value: 0, source: 'meta_analytics', hasData: false, analyticsError: e.message };
  }
}

// Mapeo de audit_log a lo que muestra Ranvedix en Recent activity.
// En callback.js debes auditar: 'connection.created' y 'connection.went_live'.
// Si solo tienes 'connections.synced' viejo, igual lo mostramos, no inventamos.
function mapActivity(a) {
  const labels = {
    'connection.created': 'Connection created',
    'connection.went_live': 'Connection went live',
    'connections.synced': 'Connection synced',
    'template.created': 'Template created',
    'routing.saved': 'Webhook Override saved',
    'webhook.forwarded': 'Webhook forwarded',
  };
  return { label: labels[a.action] || a.action, at: a.at, meta: a.meta || {} };
}

module.exports = async (req, res) => {
  if (req.method !== 'GET') return res.status(405).json({ ok: false, error: 'Method not allowed' });
  const user = await authUser(req);
  if (!user) return res.status(401).json({ ok: false, error: 'No autorizado' });
  try {
    const orgId = await ensureOrg(user);
    const { data: conns, error } = await db
      .from('connections')
      .select('id,business_id,waba_id,phone_number_id,display_phone,verified_name,status,quality,tier,mode,customer_webhook_url,synced_at,created_at,token_cipher')
      .eq('org_id', orgId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    const list = conns || [];
    const lastCheckedAt = new Date().toISOString();
    const live = [];
    let messagesMTD = 0;
    let messagesMTDHasData = false;

    for (const c of list) {
      let phone = null, liveError = null, token = null;
      try { token = dec(c.token_cipher); } catch (e) { liveError = 'Token no se pudo desencriptar'; }
      if (token) {
        try {
          const h = { headers: { Authorization: `Bearer ${token}` } };
          const ph = await graph(`${G(c.waba_id + '/phone_numbers')}?fields=id,display_phone_number,verified_name,quality_rating,messaging_limit_tier,status`, h);
          phone = (ph.data || []).find((p) => p.id === c.phone_number_id) || (ph.data || [])[0] || null;
        } catch (e) { liveError = e.message; }
      }
      if (token && c.phone_number_id) {
        const m = await fetchMessagesMTD(c, token);
        messagesMTD += m.value;
        if (m.hasData) messagesMTDHasData = true;
      }
      const quality = String((phone && phone.quality_rating) || c.quality || 'UNKNOWN').toUpperCase();
      const tier = (phone && phone.messaging_limit_tier) || c.tier || null;
      const statusRaw = (phone && phone.status) || c.status || 'pending';
      const isLive = statusRaw === 'CONNECTED' || statusRaw === 'live';
      live.push({
        id: c.id,
        detailUrl: `/connections/${c.id}`,
        business_id: c.business_id || null,
        waba_id: c.waba_id,
        phone_number_id: c.phone_number_id,
        display_phone: (phone && phone.display_phone_number) || c.display_phone,
        verified_name: (phone && phone.verified_name) || c.verified_name,
        state: isLive ? 'live' : 'pending',
        status: statusRaw,
        quality: quality.toLowerCase(),
        tier,
        mode: c.mode || 'dedicado',
        hasWebhookOverride: Boolean(c.customer_webhook_url),
        heartbeat: { status: liveError ? 'error' : 'checked', lastCheckedAt },
        liveError,
        created_at: c.created_at,
        synced_at: c.synced_at,
      });
    }

    const total = live.length;
    const liveCount = live.filter((x) => x.state === 'live').length;
    const provisioning = live.filter((x) => x.state !== 'live').length;
    const needsAttention = live.filter((x) => x.quality === 'red' || x.quality === 'yellow' || x.state !== 'live').length;

    const { data: activity } = await db.from('audit_log')
      .select('action,meta,at').eq('org_id', orgId)
      .order('at', { ascending: false }).limit(10);

    // Acciones que SI existen en tu captura de Overview. Sin esto, Overview no sirve para conectar.
    return res.status(200).json({
      ok: true, email: user.email, lastCheckedAt,
      // Para el header de Overview, igual que Ranvedix
      header: {
        title: 'Overview',
        subtitle: 'Live health of your WhatsApp estate, at a glance.',
        allHealthy: needsAttention === 0,
        actions: [
          { label: 'Migrate a number', href: '/connections?migrate=1' },
          { label: 'Manage connections', href: '/connections' },
        ],
      },
      // Estado vacio: si total 0, el frontend muestra "Onboard a WhatsApp number" con el modal.
      empty: total === 0,
      kpis: {
        connections: total,
        live: liveCount,
        provisioningOrOther: provisioning,
        needsAttention,
        needsAttentionLabel: needsAttention === 0 ? 'all healthy' : 'needs attention',
        messagesMTD,
        messagesMTDSource: 'meta_analytics',
        messagesMTDHasData,
        messagesMTDLabel: 'month to date',
      },
      qualityDistribution: {
        liveNumberLabel: `${liveCount} live number`,
        high: live.filter((x) => x.quality === 'green').length,
        medium: live.filter((x) => x.quality === 'yellow').length,
        low: live.filter((x) => x.quality === 'red').length,
        unrated: live.filter((x) => x.quality === 'unknown').length,
      },
      connections: live,
      recentConnections: live.slice(0, 3),
      recentActivity: (activity || []).map(mapActivity),
    });
  } catch (e) {
    console.error('overview error:', e.message);
    return res.status(500).json({ ok: false, error: 'No se pudo cargar Overview en vivo' });
  }
};
