module.exports = async (req, res) => {
  const code = req.query.code;
  const APP_ID = process.env.APP_ID || "811281598468466";
  const APP_SECRET = process.env.APP_SECRET || "adc3e9fa8df0abd2f9d0400d96fb9193";
  const REDIRECT_URI = process.env.NEXT_PUBLIC_REDIRECT_URI || `https://${req.headers.host}/api/callback`;
  const GRAPH_VERSION = "v20.0";
  if(!code) return res.status(400).json({error:'no code'});
  try{
    const url = `https://graph.facebook.com/${GRAPH_VERSION}/oauth/access_token?client_id=${APP_ID}&client_secret=${APP_SECRET}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&code=${code}`;
    const r = await fetch(url);
    const data = await r.json();
    if(!data.access_token) return res.json(data);
    const bizRes = await fetch(`https://graph.facebook.com/${GRAPH_VERSION}/me/businesses?access_token=${data.access_token}`);
    const bizData = await bizRes.json();
    res.setHeader('Set-Cookie', `user_token=${data.access_token}; Path=/; HttpOnly; Max-Age=3600; SameSite=Lax`);
    return res.json({token: data.access_token, businesses: bizData.data || [], raw: bizData});
  }catch(e){ return res.status(500).json({error:e.message}); }
}
