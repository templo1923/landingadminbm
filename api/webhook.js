export default function handler(req,res){
 if(req.method==='GET'){
  const mode=req.query['hub.mode'];
  const verify_token=req.query['hub.verify_token'];
  const challenge=req.query['hub.challenge'];
  // Use same verify token as in App Dashboard Webhook settings
  if(mode==='subscribe' && verify_token==='whatkiamber_verify_2026'){
   return res.status(200).send(challenge);
  }
  return res.status(403).send('Forbidden');
 }
 if(req.method==='POST'){
  console.log('Webhook POST', JSON.stringify(req.body).slice(0,2000));
  // Here you would handle inbound messages, template status, etc.
  return res.status(200).send('EVENT_RECEIVED');
 }
 return res.status(405).end();
}
