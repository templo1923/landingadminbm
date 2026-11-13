// api/webhook.js - message-blind: forward a customer_webhook_url, dropea contenido
const crypto=require('crypto');
const { db } = require('../lib');
const rawBody=req=>new Promise((resolve,reject)=>{const c=[]; req.on('data',d=>c.push(d)); req.on('end',()=>resolve(Buffer.concat(c))); req.on('error',reject);});
module.exports=async(req,res)=>{
  if(req.method==='GET'){
    const q=req.query;
    if(q['hub.mode']==='subscribe' && q['hub.verify_token']===(process.env.WEBHOOK_VERIFY_TOKEN||'').trim()) return res.status(200).send(q['hub.challenge']);
    return res.status(403).send('Forbidden');
  }
  if(req.method!=='POST'){ res.setHeader('Allow','GET, POST'); return res.status(405).end(); }
  const body=await rawBody(req);
  const sig=req.headers['x-hub-signature-256']||'';
  const exp='sha256='+crypto.createHmac('sha256',(process.env.APP_SECRET||'').trim()).update(body).digest('hex');
  if(sig.length!==exp.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(exp))) return res.status(401).send('Invalid signature');
  let payload; try{ payload=JSON.parse(body.toString('utf8')); }catch{ return res.status(400).send('Bad JSON'); }
  res.status(200).send('EVENT_RECEIVED');
  try{
    for(const entry of (payload.entry||[])){
      const wabaId=entry.id;
      const {data: conn}=await db.from('connections').select('id,org_id,waba_id,customer_webhook_url').eq('waba_id', wabaId).maybeSingle();
      for(const ch of (entry.changes||[])){
        if(ch.field && ch.field!=='messages' && conn) await db.from('audit_log').insert({org_id:conn.org_id, actor:'meta-webhook', action:'webhook.'+ch.field, meta:{connection_id:conn.id, waba_id:wabaId, field:ch.field}});
      }
      if(!conn || !conn.customer_webhook_url){
        if(conn) await db.from('audit_log').insert({org_id:conn.org_id, actor:'system', action:'webhook.dropped_no_override', meta:{connection_id:conn.id, waba_id:wabaId}});
        continue;
      }
      try{
        const r=await fetch(conn.customer_webhook_url,{method:'POST', headers:{'Content-Type':'application/json','X-Hub-Signature-256':sig}, body, signal:AbortSignal.timeout(5000)});
        await db.from('audit_log').insert({org_id:conn.org_id, actor:'system', action:'webhook.forwarded', meta:{connection_id:conn.id, waba_id:wabaId, status:r.status}});
      }catch(e){ await db.from('audit_log').insert({org_id:conn.org_id, actor:'system', action:'webhook.forward_failed', meta:{connection_id:conn.id, waba_id:wabaId, error:e.message}}); }
    }
  }catch(e){ console.error('webhook forward:',e.message); }
};
