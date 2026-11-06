// Solo valores públicos que el navegador necesita. Los secretos nunca salen de aquí.
module.exports = (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.status(200).json({
    appId: process.env.APP_ID,
    configId: process.env.META_CONFIG_ID,
    version: process.env.GRAPH_VERSION || 'v20.0',
    supabaseUrl: process.env.SUPABASE_URL,
    supabaseAnonKey: process.env.SUPABASE_ANON_KEY
  });
};
