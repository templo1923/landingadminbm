// api/panel.js CONSOLIDADO - 1 funcion para todo el panel
const { db, G, graph, enc, dec, authUser, ensureOrg, audit } = require('../lib');
module.exports = async (req,res)=>{
  const user=await authUser(req); if(!user) return res.status(401).json({ok:false,error:'No autorizado'});
  const route=String(req.query.route||'overview').toLowerCase();
  try{
    const orgId=await ensureOrg(user);
    const {data: conns}=await db.from('connections').select('id,business_id,waba_id,phone_number_id,display_phone,verified_name,status,quality,tier,mode,customer_webhook_url,customer_verify_token_cipher,last_opened_at,identity_key_check,synced_at,created_at,token_cipher').eq('org_id',orgId).order('created_at',{ascending:false});
    const list=conns||[];
    if(route==='overview'){
      const {data: audits}=await db.from('audit_log').select('action,meta,at').eq('org_id',orgId).order('at',{ascending:false}).limit(20);
      const live=[];
      for(const c of list){
        let phone=null, err=null, token=null; try{ token=dec(c.token_cipher); const h={headers:{Authorization:`Bearer ${token}`}}; const ph=await graph(`${G(c.waba_id+'/phone_numbers')}?fields=id,display_phone_number,verified_name,quality_rating,messaging_limit_tier,status`,h); phone=(ph.data||[]).find(p=>p.id===c.phone_number_id)||(ph.data||[])[0]||null; }catch(e){ err=e.message; }
        live.push({id:c.id, display_phone:(phone&&phone.display_phone_number)||c.display_phone, verified_name:(phone&&phone.verified_name)||c.verified_name, waba_id:c.waba_id, state:((phone&&phone.status)==='CONNECTED'||c.status==='live')?'live':'pending', quality:String((phone&&phone.quality_rating)||c.quality||'UNKNOWN').toLowerCase(), tier:(phone&&phone.messaging_limit_tier)||c.tier, liveError:err});
      }
      return res.status(200).json({ok:true, email:user.email, live, totalConnections:live.length, liveCount:live.filter(x=>x.state==='live').length, activity:(audits||[]).map(a=>({action:a.action, at:a.at, meta:a.meta||{}})), messages:{mtd:0, note:'MTD 0 hasta que Meta devuelva real.'}});
    }
    if(route==='connections'){
      const live=[];
      for(const c of list){
        let phone=null, err=null; try{ const token=dec(c.token_cipher); const h={headers:{Authorization:`Bearer ${token}`}}; const ph=await graph(`${G(c.waba_id+'/phone_numbers')}?fields=id,display_phone_number,verified_name,quality_rating,messaging_limit_tier,status`,h); phone=(ph.data||[]).find(p=>p.id===c.phone_number_id)||(ph.data||[])[0]||null; }catch(e){ err=e.message; }
        const quality=String((phone&&phone.quality_rating)||c.quality||'UNKNOWN').toLowerCase(); const statusRaw=(phone&&phone.status)||c.status||'pending'; const isLive=statusRaw==='CONNECTED'||statusRaw==='live';
        live.push({id:c.id, waba_id:c.waba_id, display_phone:(phone&&phone.display_phone_number)||c.display_phone, state:isLive?'live':'pending', quality, tier:(phone&&phone.messaging_limit_tier)||c.tier, mode:c.mode||'dedicado', hasWebhookOverride:Boolean(c.customer_webhook_url), liveError:err});
      }
      return res.status(200).json({ok:true, connections:live});
    }
    if(route==='routing'){
      const id=req.query.connection_id||(req.body||{}).connection_id; const conn=list.find(c=>c.id===id); if(!conn) return res.status(404).json({ok:false,error:'Conexion no encontrada'});
      if(req.method==='GET') return res.status(200).json({ok:true, connection_id:id, waba_id:conn.waba_id, customer_webhook_url:conn.customer_webhook_url||'', hasVerifyToken:Boolean(conn.customer_verify_token_cipher), mode:conn.mode||'dedicado'});
      const {customer_webhook_url, customer_verify_token, action}=req.body||{};
      if(action==='test'){
        const url=(customer_webhook_url||conn.customer_webhook_url||'').trim(); const token=customer_verify_token||(conn.customer_verify_token_cipher?dec(conn.customer_verify_token_cipher):'');
        if(!url||!/^https:/.test(url)) return res.status(400).json({ok:false,error:'URL debe ser https'});
        if(!token) return res.status(400).json({ok:false,error:'Falta Verify token'});
        const challenge='whatkiamber-test-'+Date.now(); const testUrl=url+(url.includes('?')?'&':'?')+new URLSearchParams({'hub.mode':'subscribe','hub.verify_token':token,'hub.challenge':challenge}).toString();
        try{ const r=await fetch(testUrl,{method:'GET', signal:AbortSignal.timeout(5000)}); const text=await r.text(); if(r.ok&&text.trim()===challenge){ await audit(orgId,user.id,'routing.test_ok',{connection_id:conn.id}); return res.status(200).json({ok:true, message:'Test ping OK'}); } return res.status(200).json({ok:false, error:'Respondio '+r.status+' pero no devolvio challenge'}); }catch(e){ return res.status(200).json({ok:false, error:'No se pudo alcanzar tu webhook: '+e.message}); }
      }
      if(customer_webhook_url && !/^https:/.test(customer_webhook_url)) return res.status(400).json({ok:false,error:'URL debe ser https'});
      const updates={}; if(customer_webhook_url!==undefined) updates.customer_webhook_url=customer_webhook_url; if(customer_verify_token) updates.customer_verify_token_cipher=enc(customer_verify_token);
      if(Object.keys(updates).length) await db.from('connections').update(updates).eq('id',id).eq('org_id',orgId);
      await audit(orgId,user.id,'routing.updated',{connection_id:id});
      return res.status(200).json({ok:true, message:'Routing guardado'});
    }
    if(route==='health'){
      const id=req.query.connection_id||(req.body||{}).connection_id; const conn=list.find(c=>c.id===id); if(!conn) return res.status(404).json({ok:false,error:'Conexion no encontrada'});
      if(req.method==='POST' && (req.body||{}).action==='heartbeat'){ const now=new Date(); await db.from('connections').update({last_opened_at:now.toISOString()}).eq('id',id); return res.status(200).json({ok:true,lastOpenedAt:now.toISOString()}); }
      let phone=null, err=null; try{ const token=dec(conn.token_cipher); const h={headers:{Authorization:`Bearer ${token}`}}; const ph=await graph(`${G(conn.waba_id+'/phone_numbers')}?fields=id,quality_rating,messaging_limit_tier,status`,h); phone=(ph.data||[])[0]||null; }catch(e){ err=e.message; }
      const {data: audits}=await db.from('audit_log').select('action,meta,at').eq('org_id',orgId).order('at',{ascending:false}).limit(100);
      return res.status(200).json({ok:true, phoneHealth:{quality:String((phone&&phone.quality_rating)||conn.quality||'UNKNOWN').toLowerCase(), tier:(phone&&phone.messaging_limit_tier)||conn.tier, lastChecked:new Date().toISOString(), liveError:err}, heartbeat:{lastOpenedAt:conn.last_opened_at||null}, identityKeyCheck:Boolean(conn.identity_key_check), webhookActivity:(audits||[]).filter(a=>a.action.startsWith('webhook.')).slice(0,20)});
    }
    if(route==='diagnostic'){
      const id=req.query.connection_id; const conn=list.find(c=>c.id===id); if(!conn) return res.status(404).json({ok:false,error:'Conexion no encontrada'});
      const checks=[]; let token=null; try{ token=dec(conn.token_cipher); checks.push({name:'Token desencripta',ok:true}); }catch(e){ checks.push({name:'Token desencripta',ok:false,error:e.message}); }
      if(token){ try{ const h={headers:{Authorization:`Bearer ${token}`}}; const w=await graph(`${G(conn.waba_id)}?fields=id,name`,h); checks.push({name:'WABA accesible',ok:true,detail:w.name}); }catch(e){ checks.push({name:'WABA accesible',ok:false,error:e.message}); } }
      checks.push({name:'Webhook override',ok:Boolean(conn.customer_webhook_url),detail:conn.customer_webhook_url||'Sin override'});
      return res.status(200).json({ok:true, checks});
    }
    if(route==='templates'){
      const id=req.query.connection_id; const conn=list.find(c=>c.id===id); if(!conn) return res.status(404).json({ok:false,error:'Conexion no encontrada'});
      if(req.method==='GET'){ const token=dec(conn.token_cipher); const out=await graph(`${G(conn.waba_id+'/message_templates')}?fields=name,language,category,status&limit=100`,{headers:{Authorization:`Bearer ${token}`}}); return res.status(200).json({ok:true, templates:(out.data||[])}); }
      const {name, language, category, body}=req.body||{}; if(!name||!language||!category||!body) return res.status(400).json({ok:false,error:'Faltan campos'});
      const token=dec(conn.token_cipher); const created=await graph(G(`${conn.waba_id}/message_templates`),{method:'POST', headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'}, body:JSON.stringify({name, language, category, components:[{type:'BODY', text:body}]})});
      return res.status(200).json({ok:true, template:created});
    }
    if(route==='usage'){
      const id=req.query.connection_id; const conn=list.find(c=>c.id===id); if(!conn) return res.status(404).json({ok:false,error:'Conexion no encontrada'});
      return res.status(200).json({ok:true, waba_id:conn.waba_id, mtd:0, month:new Date().toISOString().slice(0,7), note:'MTD 0 hasta que Meta devuelva real.'});
    }
    if(route==='disconnect'){
      if(req.method!=='POST') return res.status(405).json({ok:false,error:'Method not allowed'});
      const {connection_id, confirm}=req.body||{}; if(confirm!=='DISCONNECT') return res.status(400).json({ok:false,error:'Escribe DISCONNECT'});
      await db.from('connections').delete().eq('id',connection_id).eq('org_id',orgId);
      await audit(orgId,user.id,'connection.disconnected',{connection_id});
      return res.status(200).json({ok:true,message:'Desconectado'});
    }
    return res.status(400).json({ok:false,error:'Ruta no valida: '+route});
  }catch(e){ return res.status(500).json({ok:false,error:e.message}); }
};
