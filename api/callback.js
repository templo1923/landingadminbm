export default async function handler(req, res){
  const code = req.query.code;
  if(!code) return res.status(400).json({error:'no code'});
  // Redirect to callback.html with code
  res.redirect(`/callback.html?code=${code}`);
}
