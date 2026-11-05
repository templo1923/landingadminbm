export default async function handler(req, res) {
  const { business_id, token } = req.query;
  // token de verificación opcional - usa el token del cliente o uno permanente tuyo
  if (!business_id) return res.status(400).json({ error: 'Falta business_id' });
  
  try {
    const checkToken = token || process.env.ADMIN_TOKEN;
    const fbRes = await fetch(`https://graph.facebook.com/v20.0/${business_id}/pending_users?access_token=${checkToken}`);
    const data = await fbRes.json();
    return res.status(200).json(data);
  } catch(e) {
    return res.status(500).json({ error: e.message });
  }
}
