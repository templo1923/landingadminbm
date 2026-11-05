export default async function handler(req, res) {
  const { code } = req.query;
  if (!code) return res.status(400).json({ error: 'Falta code', query: req.query });

  try {
    // Intercambiar code por access_token del system user
    const params = new URLSearchParams({
      client_id: '811281598468466',
      client_secret: 'adc3e9fa8df0abd2f9d0400d96fb9193',
      code: code,
      grant_type: 'authorization_code'
    });

    const tokenRes = await fetch(`https://graph.facebook.com/v20.0/oauth/access_token?${params}`);
    const tokenData = await tokenRes.json();
    
    if (!tokenData.access_token) {
      return res.status(400).json({ error: 'No se pudo obtener token', details: tokenData });
    }

    // Obtener info de WABA y negocios con ese token
    const bizRes = await fetch(`https://graph.facebook.com/v20.0/me/businesses?fields=id,name&access_token=${tokenData.access_token}`);
    const bizData = await bizRes.json();

    const wabaRes = await fetch(`https://graph.facebook.com/v20.0/me/whatsapp_business_accounts?fields=id,name&access_token=${tokenData.access_token}`);
    const wabaData = await wabaRes.json();

    return res.status(200).json({
      success: true,
      config_id: '1889600718898450',
      access_token: tokenData.access_token,
      businesses: bizData.data || [],
      wabas: wabaData.data || [],
      note: 'Token de System User valido 60 dias con whatsapp_business_management + whatsapp_business_messaging'
    });

  } catch(e) {
    return res.status(500).json({ error: e.message, stack: e.stack });
  }
}
