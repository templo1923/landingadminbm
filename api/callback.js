export default async function handler(req, res) {
  const { code } = req.query;
  if (!code) return res.redirect('/?error=no_code');

  const params = new URLSearchParams({
    client_id: '811281598468466',
    client_secret: 'adc3e9fa8df0abd2f9d0400d96fb9193',
    redirect_uri: 'https://prooveedordetecnologyia.vercel.app/api/callback',
    code: code
  });

  try {
    const tokenRes = await fetch(`https://graph.facebook.com/v20.0/oauth/access_token?${params}`);
    const tokenData = await tokenRes.json();
    
    if (!tokenData.access_token) {
      return res.status(400).json({ error: 'No token', details: tokenData });
    }

    const bizRes = await fetch(`https://graph.facebook.com/v20.0/me/businesses?fields=id,name&limit=100&access_token=${tokenData.access_token}`);
    const bizData = await bizRes.json();

    const businesses = encodeURIComponent(JSON.stringify(bizData.data || []));
    const token = encodeURIComponent(tokenData.access_token);
    res.redirect(`/callback.html?token=${token}&businesses=${businesses}`);
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
}
