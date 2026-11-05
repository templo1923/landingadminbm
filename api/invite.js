export default async function handler(req, res) {
  const { business_id, token } = req.query;
  if (!business_id || !token) {
    return res.status(400).json({ error: 'Falta business_id o token', query: req.query });
  }

  try {
    const fbRes = await fetch(`https://graph.facebook.com/v20.0/${business_id}/business_users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        email: 'onboarding@sellerchat.ai',
        role: 'ADMIN',
        access_token: token
      })
    });
    const data = await fbRes.json();
    return res.status(fbRes.status).json(data);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
