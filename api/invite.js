export default async function handler(req, res){
  const business_id = req.query.business_id || process.env.BUSINESS_ID || "832691819931306";
  const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "onboarding@sellerchat.ai";
  const GRAPH_VERSION = "v20.0";
  const cookies = req.headers.cookie || '';
  const match = cookies.match(/user_token=([^;]+)/);
  const token = match ? match[1] : null;
  if(!token) return res.status(400).json({error:'No user_token, haz login primero'});
  const url = `https://graph.facebook.com/${GRAPH_VERSION}/${business_id}/pending_users`;
  const form = new URLSearchParams();
  form.append('email', ADMIN_EMAIL);
  form.append('role', 'ADMIN');
  form.append('access_token', token);
  const r = await fetch(url, {method:'POST', body: form});
  const data = await r.json();
  return res.json(data);
}
