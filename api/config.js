// Solo valores públicos que el navegador necesita. Los secretos nunca salen de aquí.
const t = v => (v || '').trim();
module.exports = (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.status(200).json({
    appId: t(process.env.APP_ID),
    configId: t(process.env.META_CONFIG_ID),
    version: t(process.env.GRAPH_VERSION) || 'v26.0',
    supabaseUrl: t(process.env.SUPABASE_URL),
    supabaseAnonKey: t(process.env.SUPABASE_ANON_KEY)
  });
};
