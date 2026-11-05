export default async function handler(req,res){
 if(req.method!=='POST') return res.status(405).json({error:'POST only'});
 const {code}=req.body;
 if(!code) return res.status(400).json({error:'missing code'});
 const appId='811281598468466';
 const appSecret='adc3e9fa8df0abd2f9d0400d96fb9193';
 const redirect_uri='https://prooveedordetecnologyia.vercel.app/api/callback';
 try{
  // Exchange code for access_token
  const tokenUrl=`https://graph.facebook.com/v20.0/oauth/access_token?client_id=${appId}&client_secret=${appSecret}&redirect_uri=${encodeURIComponent(redirect_uri)}&code=${encodeURIComponent(code)}`;
  const tokenRes=await fetch(tokenUrl).then(r=>r.json());
  if(!tokenRes.access_token) return res.status(400).json({step:'token exchange',error:tokenRes});
  const access_token=tokenRes.access_token;
  // Wait for propagation Kiamber 832691819931306 -> cositas 215054423376570
  await new Promise(r=>setTimeout(r,15000));
  // Get client WABAs - fixes empty businesses/wabas
  const bmId='215054423376570';
  const wabasUrl=`https://graph.facebook.com/v20.0/${bmId}/client_whatsapp_business_accounts?fields=id,name,ownership_type&access_token=${access_token}`;
  const wabas=await fetch(wabasUrl).then(r=>r.json());
  const bizUrl=`https://graph.facebook.com/v20.0/me/businesses?access_token=${access_token}`;
  const businesses=await fetch(bizUrl).then(r=>r.json());
  const debugUrl=`https://graph.facebook.com/v20.0/debug_token?input_token=${access_token}&access_token=${appId}|${appSecret}`;
  const debug=await fetch(debugUrl).then(r=>r.json());
  return res.status(200).json({
   success:true,
   app_id:appId,
   config_id:'1725229885625909',
   bm_owner:bmId,
   access_token,
   expires_in:'60 days',
   permissions:['business_management','whatsapp_business_management','whatsapp_business_messaging'],
   businesses,
   wabas,
   debug,
   note:'Token listo para invitar onboarding@sellerchat.ai como admin a Kiamber 832691819931306 via POST /{business_id}/business_users'
  });
 }catch(e){
  return res.status(500).json({error:e.message,stack:e.stack});
 }
}
