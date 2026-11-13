// api/callback.js CORREGIDO - guarda override + mode
const { db, G, graph, enc, authUser, ensureOrg, audit, syncWaba } = require('../lib');
module.exports = async (req,res)=>{
  if(req.method!=='POST') return res.status(405).json({ok:false, error:'Method not allowed'});
  const user=await authUser(req); if(!user) return res.status(401).json({ok:false, error:'Inicia sesion primero'});
  const { code, waba_id, phone_number_id, business_id, mode, customer_webhook_url, customer_verify_token } = req.body||{};
  if(!code) return res.status(400).json({ok:false, error:'Missing code'});
  const cleanMode = mode==='coexistencia'?'coexistencia':'dedicado';
  if(customer_webhook_url && !/^https:\/\//.test(customer_webhook_url)) return res.status(400).json({ok:false, error:'Webhook URL debe ser https'});
  try{
    const orgId=await ensureOrg(user);
    const short=await graph(`${G('oauth/access_token')}?`+new URLSearchParams({client_id:process.env.APP_ID, client_secret:process.env.APP_SECRET, code}));
    const token=short.access_token;
    const expires=short.expires_in?new Date(Date.now()+short.expires_in*1000).toISOString():null;
    const ids=new Map(); if(waba_id) ids.set(waba_id, null);
    if(!ids.size){
      const dbg=await graph(`${G('debug_token')}?`+new URLSearchParams({input_token:token, access_token:`${process.env.APP_ID}|${process.env.APP_SECRET}`}));
      const s=(dbg.data.granular_scopes||[]).find(x=>x.scope==='whatsapp_business_management');
      ((s&&s.target_ids)||[]).forEach(id=>ids.set(id,null));
    }
    if(!ids.size) return res.status(202).json({ok:false, pending:true});
    for(const [id] of ids){
      const row={org_id:orgId, waba_id:id, token_cipher:enc(token), token_expires_at:expires, mode:cleanMode};
      if(id===waba_id){ if(phone_number_id) row.phone_number_id=phone_number_id; if(business_id) row.business_id=business_id; }
      if(customer_webhook_url) row.customer_webhook_url=customer_webhook_url.trim();
      if(customer_verify_token) row.customer_verify_token_cipher=enc(customer_verify_token);
      let {data: conn, error}=await db.from('connections').upsert(row,{onConflict:'waba_id'}).select().single();
      if(error) throw error;
      await graph(G(`${id}/subscribed_apps`),{method:'POST', headers:{Authorization:`Bearer ${token}`}});
      try{ await syncWaba(conn, token); }catch(e){ console.error('sync:',e.message); }
      await audit(orgId, user.id, 'connection.created',{waba_id:id, mode:cleanMode, has_override: Boolean(customer_webhook_url)});
    }
    return res.status(200).json({ok:true, connected:ids.size, mode:cleanMode});
  }catch(e){ console.error('callback error:',e.message); return res.status(500).json({ok:false, error:'No se pudo completar la conexion'}); }
};
