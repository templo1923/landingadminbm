// api/usage.js — Usage en vivo desde Meta conversation_analytics. GET ?connection_id=...
// MTD en 0 hasta que Meta devuelva real. No cuenta mensajes locales, no inventa.
// Usa /{waba_id}/conversation_analytics con granularity MONTHLY si esta disponible, si no, devuelve 0 con nota.
const { db, G, graph, dec, authUser, ensureOrg } = require('./_lib');
module.exports = async (req,res)=>{
  const user = await authUser(req); if(!user) return res.status(401).json({ok:false,error:'No autorizado'});
  try{
    const orgId = await ensureOrg(user);
    const connectionId = req.query.connection_id;
    if(!connectionId) return res.status(400).json({ok:false,error:'Falta connection_id'});
    const { data: conn } = await db.from('connections').select('id,waba_id,token_cipher').eq('id',connectionId).eq('org_id',orgId).maybeSingle();
    if(!conn) return res.status(404).json({ok:false,error:'Conexion no encontrada'});
    const token = dec(conn.token_cipher);
    const h = { headers:{ Authorization: `Bearer ${token}` } };
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = now;
    let mtd = 0, details = null, note = 'Meta no devolvio analytics, MTD en 0.';
    try{
      const out = await graph(`${G(conn.waba_id+'/conversation_analytics')}?fields=conversation_types&start=${Math.floor(start.getTime()/1000)}&end=${Math.floor(end.getTime()/1000)}&granularity=MONTHLY`, h);
      details = out;
      // Si Meta devuelve data, suma. Si no, queda 0.
      if(out && out.data && out.data.length){
        // Estructura varia segun Meta, sumamos lo que venga como conversation count si existe
        for(const d of out.data){ if(d.data_points) for(const p of d.data_points){ mtd += (p.conversation||0); } }
        note = 'Datos reales de Meta.';
      }
    }catch(e){ console.log('usage analytics no disponible:', e.message); }
    return res.status(200).json({ok:true, waba_id: conn.waba_id, mtd, month: start.toISOString().slice(0,7), details, note});
  }catch(e){ console.error('usage error:',e.message); return res.status(500).json({ok:false,error:'No se pudo cargar Usage'}); }
};
