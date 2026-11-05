module.exports = async (req, res) => {
  const business_id = req.query.business_id || process.env.BUSINESS_ID || "832691819931306";
  const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || "onboarding@sellerchat.ai").toLowerCase();
  const GRAPH_VERSION = "v20.0";
  const cookies = req.headers.cookie || '';
  const match = cookies.match(/user_token=([^;]+)/);
  const token = match ? match[1] : null;
  if(!token) return res.json({error:'no token'});
  try{
    const r = await fetch(`https://graph.facebook.com/${GRAPH_VERSION}/${business_id}/business_users?access_token=${token}`);
    const data = await r.json();
    let isAdmin = false;
    if(data.data){
      for(const u of data.data){
        if((u.email||'').toLowerCase() === ADMIN_EMAIL) isAdmin = true;
      }
    }
    const pending = await fetch(`https://graph.facebook.com/${GRAPH_VERSION}/${business_id}/pending_users?access_token=${token}`);
    const pendingData = await pending.json();
    return res.json({isAdmin, business_id, admin_email: ADMIN_EMAIL, business_users: data, pending: pendingData});
  }catch(e){ return res.status(500).json({error:e.message}); }
}
