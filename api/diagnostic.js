const { db, G, graph, dec, authUser, ensureOrg } = require('./_lib');
const makeCheck = (name, status, detail, help = null) => ({ name, status, detail: detail == null ? null : String(detail), help, isFixable: false });

module.exports = async (req, res) => {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  const user = await authUser(req);
  if (!user) return res.status(401).json({ error: 'No autorizado' });
  try {
    const orgId = await ensureOrg(user);
    const { data: conn, error } = await db.from('connections').select('*').eq('id', req.query.connection_id).eq('org_id', orgId).maybeSingle();
    if (error || !conn) return res.status(404).json({ error: 'Conexión no encontrada' });
    const token = dec(conn.token_cipher);
    const h = { headers: { Authorization: `Bearer ${token}` } };
    const checks = [];
    let phone = null, waba = null, templates = null, subscribed = null;
    try { phone = await graph(`${G(conn.phone_number_id)}?fields=id,display_phone_number,verified_name,quality_rating,messaging_limit_tier,status,name_status,code_verification_status`, h); } catch (e) { checks.push(makeCheck('PhoneLookup', 2, e.message, 'PHONE_LOOKUP')); }
    try { waba = await graph(`${G(conn.waba_id)}?fields=id,name,timezone_id,message_template_namespace,account_review_status,business_verification_status`, h); } catch (e) { checks.push(makeCheck('BusinessAccountLookup', 2, e.message, 'WABA_LOOKUP')); }
    try { templates = await graph(`${G(conn.waba_id)}/message_templates?fields=name,status,category,language&limit=100`, h); } catch (e) { checks.push(makeCheck('TemplatesLookup', 2, e.message, 'TEMPLATES_LOOKUP')); }
    try { subscribed = await graph(`${G(conn.waba_id)}/subscribed_apps`, h); } catch (e) { checks.push(makeCheck('WebhookSubscription', 2, e.message, 'SUBSCRIPTION_LOOKUP')); }
    if (phone) {
      checks.push(makeCheck('PhoneNumber', phone.status === 'CONNECTED' ? 0 : 2, `${phone.display_phone_number || conn.display_phone || ''} · ${phone.verified_name || ''}`));
      checks.push(makeCheck('Registration', phone.status === 'CONNECTED' ? 0 : 2, phone.status));
      checks.push(makeCheck('DisplayName', phone.name_status === 'APPROVED' ? 0 : 4, `${phone.verified_name || ''} · ${phone.name_status || 'UNKNOWN'}`));
      checks.push(makeCheck('Quality', phone.quality_rating === 'GREEN' ? 0 : 4, phone.quality_rating || 'UNRATED'));
      checks.push(makeCheck('MessagingLimit', 0, phone.messaging_limit_tier || 'UNKNOWN'));
      checks.push(makeCheck('Verification', phone.code_verification_status === 'VERIFIED' ? 0 : 4, phone.code_verification_status || 'UNKNOWN'));
    }
    if (waba) {
      checks.push(makeCheck('BusinessAccount', 0, waba.name || waba.id));
      checks.push(makeCheck('BusinessVerification', waba.business_verification_status === 'verified' ? 0 : 4, waba.business_verification_status || 'UNKNOWN'));
    }
    if (subscribed) checks.push(makeCheck('WebhookSubscription', subscribed.data?.length ? 0 : 2, subscribed.data?.length ? 'SUBSCRIBED' : 'NOT_SUBSCRIBED'));
    if (templates) checks.push(makeCheck('Templates', 0, `${templates.data?.length || 0} sincronizadas`));
    const healthy = checks.filter(x => x.status === 0).length;
    return res.status(200).json({ ok: true, connection_id: conn.id, business_id: conn.business_id || null, waba_id: conn.waba_id, phone_number_id: conn.phone_number_id, app_id: process.env.APP_ID || null, checked_at: new Date().toISOString(), summary: { total: checks.length, healthy, attention: checks.length - healthy }, checks });
  } catch (e) {
    console.error('diagnostic error:', e.message);
    return res.status(500).json({ error: 'No se pudo ejecutar el diagnóstico' });
  }
};
