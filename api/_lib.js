const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');

for (const k of Object.keys(process.env)) if (typeof process.env[k] === 'string') process.env[k] = process.env[k].trim(); // evita saltos de línea ocultos
const V = process.env.GRAPH_VERSION || 'v26.0';
const G = p => `https://graph.facebook.com/${V}/${p}`;
const db = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

async function graph(url, opts) {
  const r = await fetch(url, opts);
  const j = await r.json().catch(() => ({}));
  if (!r.ok || j.error) { const err = new Error(j.error ? j.error.message : `HTTP ${r.status}`); err.code = j.error && j.error.code; throw err; }
  return j;
}

const key = () => Buffer.from(process.env.TOKEN_ENC_KEY || '', 'base64');
function enc(text) {
  const iv = crypto.randomBytes(12);
  const c = crypto.createCipheriv('aes-256-gcm', key(), iv);
  const ct = Buffer.concat([c.update(text, 'utf8'), c.final()]);
  return [iv, c.getAuthTag(), ct].map(b => b.toString('base64')).join('.');
}
function dec(s) {
  const [iv, tag, ct] = s.split('.').map(x => Buffer.from(x, 'base64'));
  const d = crypto.createDecipheriv('aes-256-gcm', key(), iv);
  d.setAuthTag(tag);
  return Buffer.concat([d.update(ct), d.final()]).toString('utf8');
}

async function authUser(req) {
  const t = (req.headers.authorization || '').replace(/^Bearer /, '');
  if (!t) return null;
  const { data, error } = await db.auth.getUser(t);
  return error ? null : data.user;
}

async function ensureOrg(user) {
  const { data: m } = await db.from('members').select('org_id').eq('user_id', user.id).limit(1);
  if (m && m.length) return m[0].org_id;
  const { data: o, error } = await db.from('orgs').insert({ name: user.email }).select().single();
  if (error) throw error;
  await db.from('members').insert({ user_id: user.id, org_id: o.id, role: 'owner' });
  return o.id;
}

const audit = (org_id, actor, action, meta) => db.from('audit_log').insert({ org_id, actor, action, meta: meta || {} });

// Actualiza número (calidad, nivel, estado) y plantillas de una WABA.
async function syncWaba(conn, token) {
  const h = { headers: { Authorization: `Bearer ${token}` } };
  const ph = await graph(`${G(conn.waba_id + '/phone_numbers')}?fields=id,display_phone_number,verified_name,quality_rating,messaging_limit_tier,status`, h);
  const p = (ph.data || [])[0];
  const upd = { status: p && p.status === 'CONNECTED' ? 'live' : 'pending', synced_at: new Date().toISOString() };
  if (p) Object.assign(upd, { phone_number_id: p.id, display_phone: p.display_phone_number, verified_name: p.verified_name, quality: p.quality_rating, tier: p.messaging_limit_tier });
  await db.from('connections').update(upd).eq('id', conn.id);
  try {
    const tp = await graph(`${G(conn.waba_id + '/message_templates')}?fields=name,category,status,language&limit=100`, h);
    const rows = (tp.data || []).map(t => ({ connection_id: conn.id, name: t.name, language: t.language || 'und', category: t.category, status: t.status, updated_at: new Date().toISOString() }));
    if (rows.length) await db.from('templates').upsert(rows, { onConflict: 'connection_id,name,language' });
  } catch (e) { console.error('templates sync:', e.message); }
}

const userError = e => ({
  131047: 'Pasaron más de 24 h desde el último mensaje del cliente: envía una plantilla aprobada.',
  131030: 'Ese número no está en la lista de destinatarios permitidos de tu cuenta de pruebas.',
  132001: 'La plantilla no existe o no está aprobada en ese idioma.',
  190: 'El acceso expiró: vuelve a conectar el número.'
})[e && e.code] || (e && e.code ? `Meta rechazó la solicitud (código ${e.code}).` : 'No se pudo completar la acción.');

module.exports = { userError, db, G, graph, enc, dec, authUser, ensureOrg, audit, syncWaba };
