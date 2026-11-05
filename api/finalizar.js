module.exports = async (req, res) => {
  try{
    let body = '';
    if(req.body && typeof req.body === 'object' && !(req.body instanceof Buffer)){
      return res.json({data:req.body});
    }
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const raw = Buffer.concat(chunks).toString();
    const params = new URLSearchParams(raw);
    const data = {
      business_id: params.get('business_id'),
      phone: params.get('phone'),
      verified_name: params.get('verified_name'),
      callback_url: params.get('callback_url'),
      verify_token: params.get('verify_token'),
      pin: params.get('pin'),
      system_user_id: process.env.SYSTEM_USER_ID || "122096076987112136",
      app_id: process.env.APP_ID || "811281598468466",
      timestamp: new Date().toISOString()
    };
    return res.json({message:'Datos guardados', data});
  }catch(e){ return res.status(500).json({error:e.message}); }
}
