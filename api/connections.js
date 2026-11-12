// api/connections.js — COMPLETO EN VIVO, reemplaza el viejo que devolvia Supabase stale.
// Lista como Ranvedix: NUMBER, STATE, QUALITY, TIER, HEARTBEAT, TYPE, Manage.
// Cada fila se valida en vivo contra Meta. Si una falla, sale con error, no tumba la lista.
// Query: ?search=...&state=live|pending|all
const { db, G, graph, dec, authUser, ensureOrg, audit } = require('./_lib');
module.exports = async (req, res) => {
  const user = await authUser(req); if (!user) return res.status(401).json({ ok: false, error: 'No autorizado' });
  try {
    const orgId = await ensureOrg(user);
    const { data: conns } = await db.from('connections').select('id,business_id,waba_id,phone_number_id,display_phone,verified_name,status,quality,tier,mode,customer_webhook_url,synced_at,created_at,token_cipher').eq('org_id', orgId).order('created_at', { ascending: false });
    const list = conns || [];
    const search = String(req.query.search || '').toLowerCase();
    const stateFilter = String(req.query.state || 'all').toLowerCase();
    // POST action=sync: revalida en vivo y actualiza solo quality/tier/status en Supabase (cache, no contenido)
    if (req.method === 'POST' && (req.body || {}).action === 'sync') {
      for (const c of list) {
        try {
          const token = dec(c.token_cipher); const h = { headers: { Authorization: `Bearer ${token}` } };
          const ph = await graph(`${G(c.waba_id + '/phone_numbers')}?fields=id,display_phone_number,verified_name,quality_rating,messaging_limit_tier,status`, h);
          const p = (ph.data || [])[0]; if (!p) continue;
          await db.from('connections').update({ display_phone: p.display_phone_number, verified_name: p.verified_name, quality: p.quality_rating, tier: p.messaging_limit_tier, status: p.status === 'CONNECTED' ? 'live' : 'pending', synced_at: new Date().toISOString() }).eq('id', c.id);
        } catch (e) { console.error('sync', c.waba_id, e.message); }
      }
      await audit(orgId, user.id, 'connections.synced', { count: list.length });
    }
    const live = [];
    for (const c of list) {
      let phone=null, err=null, token=null; try{ token=dec(c.token_cipher);}catch(e){ err='Token no desencripta'; }
      if (token) { try{ const h={headers:{Authorization:`Bearer ${token}`}}; const ph=await graph(`${G(c.waba_id+'/phone_numbers')}?fields=id,display_phone_number,verified_name,quality_rating,messaging_limit_tier,status`,h); phone=(ph.data||[]).find(p=>p.id===c.phone_number_id)||(ph.data||[])[0]||null; }catch(e){ err=e.message; } }
      const quality=String((phone&&phone.quality_rating)||c.quality||'UNKNOWN').toLowerCase();
      const statusRaw=(phone&&phone.status)||c.status||'pending'; const isLive=statusRaw==='CONNECTED'||statusRaw==='live';
      const item={ id:c.id, detailUrl:`/connections/${c.id}`, waba_id:c.waba_id, phone_number_id:c.phone_number_id, display_phone:(phone&&phone.display_phone_number)||c.display_phone, verified_name:(phone&&phone.verified_name)||c.verified_name, state:isLive?'live':'pending', status:statusRaw, quality, tier:(phone&&phone.messaging_limit_tier)||c.tier, mode:c.mode||'dedicado', hasWebhookOverride:Boolean(c.customer_webhook_url), heartbeat:{status:err?'error':'healthy', lastCheckedAt:new Date().toISOString()}, liveError:err, created_at:c.created_at, synced_at:c.synced_at };
      if (search && !(item.display_phone||'').toLowerCase().includes(search) && !(item.waba_id||'').toLowerCase().includes(search)) continue;
      if (stateFilter!=='all' && item.state!==stateFilter) continue;
      live.push(item);
    }
    // Export CSV: ?export=csv devuelve CSV de la lista en vivo
    if (req.query.export === 'csv') {
      const csv = 'number,waba_id,state,quality,tier,mode\n' + live.map(x=>`${x.display_phone},${x.waba_id},${x.state},${x.quality},${x.tier||''},${x.mode}`).join('\n');
      res.setHeader('Content-Type','text/csv'); res.setHeader('Content-Disposition','attachment; filename=connections.csv'); return res.status(200).send(csv);
    }
    return res.status(200).json({ ok:true, email:user.email, connections:live });
  } catch(e){ console.error('connections error:',e.message); return res.status(500).json({ok:false,error:'No se pudo cargar Connections en vivo'}); }
};
