// api/disconnect.js — Danger: Disconnect. No borra la WABA en Meta, solo borra la config del control plane.
// POST { connection_id, confirm: "DISCONNECT" } -> borra token_cipher y webhook, borra la fila, audita.
const { db, authUser, ensureOrg, audit } = require('./_lib');
module.exports = async (req,res)=>{
  if(req.method!=='POST') return res.status(405).json({ok:false,error:'Method not allowed'});
  const user=await authUser(req); if(!user) return res.status(401).json({ok:false,error:'No autorizado'});
  const { connection_id, confirm } = req.body||{}; if(!connection_id) return res.status(400).json({ok:false,error:'Falta connection_id'});
  if(confirm!=='DISCONNECT') return res.status(400).json({ok:false,error:'Escribe DISCONNECT para confirmar'});
  try{
    const orgId=await ensureOrg(user);
    const { data: conn } = await db.from('connections').select('id,waba_id').eq('id',connection_id).eq('org_id',orgId).maybeSingle();
    if(!conn) return res.status(404).json({ok:false,error:'Conexión no encontrada'});
    await db.from('connections').delete().eq('id',connection_id).eq('org_id',orgId);
    await audit(orgId,user.id,'connection.disconnected',{connection_id,waba_id:conn.waba_id});
    return res.status(200).json({ok:true,message:'Desconectado. La configuracion salio del control plane.'});
  }catch(e){ return res.status(500).json({ok:false,error:'No se pudo desconectar'}); }
};
