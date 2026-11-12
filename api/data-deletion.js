// api/data-deletion.js — Meta Data Deletion Callback. Requerido por Meta para App Review.
// Meta envia signed_request, verificamos firma, borramos org del usuario si existe, respondemos con URL de confirmacion.
const crypto = require('crypto');
const { db } = require('./_lib');
module.exports = async (req,res)=>{
  if(req.method!=='POST') return res.status(405).json({ok:false});
  try{
    const { signed_request } = req.body||{};
    if(!signed_request) return res.status(400).json({ok:false,error:'Falta signed_request'});
    const [sig, payload] = signed_request.split('.');
    const expected = crypto.createHmac('sha256', process.env.APP_SECRET).update(payload).digest('base64').replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
    if(sig!==expected) return res.status(401).json({ok:false,error:'Firma invalida'});
    const data = JSON.parse(Buffer.from(payload,'base64').toString('utf8'));
    const userId = data.user_id;
    // Borrar org y conexiones asociadas a ese user_id (si el user_id de Meta coincide con owner_user_id)
    // No borramos por error si no hay coincidencia exacta.
    await db.from('orgs').delete().eq('owner_user_id', userId);
    const code = 'DEL-' + Date.now();
    return res.status(200).json({ url: `https://prooveedordetecnologyia.vercel.app/data-deletion.html?code=${code}`, confirmation_code: code });
  }catch(e){ return res.status(500).json({ok:false,error:e.message}); }
};
