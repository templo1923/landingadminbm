// api/health.js — Health completo, como en tu captura. GET ?connection_id=...
// Phone health en vivo, Quality history desde audit_log (no inventada), Heartbeat manual, Identity-Key toggle, Webhook activity desde audit_log.
// POST action=heartbeat -> guarda last_opened_at = ahora, next due = +13 dias.
// POST action=identity -> guarda identity_key_check = true/false.
const { db, G, graph, dec, authUser, ensureOrg, audit } = require('./_lib');
module.exports = async (req, res) => {
  const user = await authUser(req); if(!user) return res.status(401).json({ok:false,error:'No autorizado'});
  const id = req.query.connection_id || (req.body||{}).connection_id; if(!id) return res.status(400).json({ok:false,error:'Falta connection_id'});
  try{
    const orgId = await ensureOrg(user);
    const { data: conn } = await db.from('connections').select('id,waba_id,phone_number_id,display_phone,quality,tier,last_opened_at,identity_key_check,token_cipher').eq('id',id).eq('org_id',orgId).maybeSingle();
    if(!conn) return res.status(404).json({ok:false,error:'Conexión no encontrada'});
    if(req.method==='POST'){
      const { action, value } = req.body||{};
      if(action==='heartbeat'){
        const now=new Date(); await db.from('connections').update({ last_opened_at: now.toISOString() }).eq('id',id);
        await audit(orgId,user.id,'health.heartbeat',{connection_id:id}); return res.status(200).json({ok:true,lastOpenedAt:now.toISOString(),nextDue:new Date(now.getTime()+13*24*3600*1000).toISOString()});
      }
      if(action==='identity'){
        await db.from('connections').update({ identity_key_check: Boolean(value) }).eq('id',id);
        await audit(orgId,user.id,'health.identity',{connection_id:id,value:Boolean(value)}); return res.status(200).json({ok:true,identity_key_check:Boolean(value)});
      }
      return res.status(400).json({ok:false,error:'Accion no valida'});
    }
    // GET en vivo
    let phone=null, err=null; try{ const token=dec(conn.token_cipher); const h={headers:{Authorization:`Bearer ${token}`}}; const ph=await graph(`${G(conn.waba_id+'/phone_numbers')}?fields=id,quality_rating,messaging_limit_tier,status`,h); phone=(ph.data||[])[0]||null; }catch(e){ err=e.message; }
    const { data: audits } = await db.from('audit_log').select('action,meta,at').eq('org_id',orgId).order('at',{ascending:false}).limit(100);
    const qualityHistory = (audits||[]).filter(a=>a.action.startsWith('webhook.')||a.action==='connections.synced').slice(0,33).map(a=>({at:a.at,field:a.action}));
    const webhookActivity = (audits||[]).filter(a=>a.action.startsWith('webhook.')).slice(0,20).map(a=>({action:a.action,at:a.at,meta:a.meta||{}}));
    const lastOpened = conn.last_opened_at ? new Date(conn.last_opened_at) : null;
    const nextDue = lastOpened ? new Date(lastOpened.getTime()+13*24*3600*1000) : null;
    const daysRemaining = nextDue ? Math.max(0, Math.ceil((nextDue - new Date())/ (24*3600*1000))) : null;
    return res.status(200).json({ ok:true, phoneHealth:{ quality:String((phone&&phone.quality_rating)||conn.quality||'UNKNOWN').toLowerCase(), tier:(phone&&phone.messaging_limit_tier)||conn.tier, lastChecked:new Date().toISOString(), liveError:err },
      qualityHistory, qualityHistoryCount: qualityHistory.length,
      heartbeat:{ lastOpenedAt: conn.last_opened_at||null, nextDue: nextDue?nextDue.toISOString():null, daysRemaining },
      identityKeyCheck: Boolean(conn.identity_key_check),
      webhookActivity, webhookActivityCount: webhookActivity.length });
  }catch(e){ console.error('health error:',e.message); return res.status(500).json({ok:false,error:'No se pudo cargar Health'}); }
};
