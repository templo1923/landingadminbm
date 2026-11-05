
export default async function handler(req,res){
 if(req.method!=='POST') return res.status(405).end();
 const {code}=req.body;
 const appId='811281598468466';
 const secret='adc3e9fa8df0abd2f9d0400d96fb9193';
 const redirect_uri='https://prooveedordetecnologyia.vercel.app/api/callback';
 try{
  const tokenRes=await fetch(`https://graph.facebook.com/v20.0/oauth/access_token?client_id=${appId}&client_secret=${secret}&redirect_uri=${encodeURIComponent(redirect_uri)}&code=${code}`).then(r=>r.json());
  const access_token=tokenRes.access_token;
  if(!access_token) return res.json({error:'no token',debug:tokenRes});
  await new Promise(r=>setTimeout(r,15000));
  const bmId='215054423376570';
  const wabas=await fetch(`https://graph.facebook.com/v20.0/${bmId}/client_whatsapp_business_accounts?access_token=${access_token}`).then(r=>r.json());
  const businesses=await fetch(`https://graph.facebook.com/v20.0/me/businesses?access_token=${access_token}`).then(r=>r.json());
  res.json({success:true,config_id:'1725229885625909',access_token,businesses,wabas,note:'Token 60 dias whatsapp_business_management + whatsapp_business_messaging + business_management'});
 }catch(e){ res.status(500).json({error:e.message}); }
}
