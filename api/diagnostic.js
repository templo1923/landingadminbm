// api/diagnostic.js — Diagnostico rapido de una conexion, usado por Health.
// GET ?connection_id=... -> verifica token, WABA, phone, webhook override, y devuelve checks.
const { db, G, graph, dec, authUser, ensureOrg } = require('./_lib');
module.exports = async (req,res)=>{
  const user = await authUser(req); if(!user) return res.status(401).json({ok:false,error:'No autorizado'});
  const id = req.query.connection_id; if(!id) return res.status(400).json({ok:false,error:'Falta connection_id'});
  try{
    const orgId = await ensureOrg(user);
    const { data: conn } = await db.from('connections').select('id,waba_id,phone_number_id,customer_webhook_url,token_cipher').eq('id',id).eq('org_id',orgId).maybeSingle();
    if(!conn) return res.status(404).json({ok:false,error:'Conexion no encontrada'});
    const checks = [];
    let token=null; try{ token=dec(conn.token_cipher); checks.push({name:'Token desencripta', ok:true}); }catch(e){ checks.push({name:'Token desencripta', ok:false, error:e.message}); }
    if(token){ try{ const h={headers:{Authorization:`Bearer ${token}`}}; const w=await graph(`${G(conn.waba_id)}?fields=id,name`,h); checks.push({name:'WABA accesible en Meta', ok:true, detail:w.name}); }catch(e){ checks.push({name:'WABA accesible en Meta', ok:false, error:e.message}); }
      try{ const h={headers:{Authorization:`Bearer ${token}`}}; const ph=await graph(`${G(conn.waba_id+'/phone_numbers')}?fields=id,status,quality_rating`,h); checks.push({name:'Phone number en Meta', ok:true, detail: JSON.stringify(ph.data||[])}); }catch(e){ checks.push({name:'Phone number en Meta', ok:false, error:e.message}); }
    }
    checks.push({name:'Webhook override configurado', ok: Boolean(conn.customer_webhook_url), detail: conn.customer_webhook_url||'Sin override - Meta mandara a webhook de la app, no al cliente'});
    return res.status(200).json({ok:true, connection_id:id, waba_id:conn.waba_id, checks});
  }catch(e){ return res.status(500).json({ok:false,error:e.message}); }
};
