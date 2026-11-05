module.exports = async (req, res) => {
  const code = req.query.code;
  if(!code) return res.status(400).json({error:'no code'});
  res.redirect(`/callback.html?code=${code}`);
}
