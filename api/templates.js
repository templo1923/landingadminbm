// api/templates.js — Templates en vivo desde Meta. GET lista, POST crea.
// GET ?connection_id=... -> llama a Meta /{waba_id}/message_templates, devuelve nombre, idioma, categoria, status.
// No usa Supabase para listar, solo Meta. Si Meta no devuelve, lista vacia, no inventa.
const { db, G, graph, dec, authUser, ensureOrg } = require('./_lib');
module.exports = async (req,res)=>{
  const user = await authUser(req); if(!user) return res.status(401).json({ok:false,error:'No autorizado'});
  try{
    const orgId = await ensureOrg(user);
    const connectionId = req.query.connection_id || (req.body||{}).connection_id;
    if(!connectionId) return res.status(400).json({ok:false,error:'Falta connection_id'});
    const { data: conn } = await db.from('connections').select('id,waba_id,token_cipher').eq('id',connectionId).eq('org_id',orgId).maybeSingle();
    if(!conn) return res.status(404).json({ok:false,error:'Conexion no encontrada'});
    const token = dec(conn.token_cipher);
    const h = { headers:{ Authorization: `Bearer ${token}` } };
    if(req.method==='GET'){
      const out = await graph(`${G(conn.waba_id+'/message_templates')}?fields=name,language,category,status,components&limit=100`, h);
      const templates = (out.data||[]).map(t=>({ name:t.name, language:t.language, category:t.category, status:t.status, components:t.components||[] }));
      return res.status(200).json({ok:true, waba_id: conn.waba_id, templates});
    }
    if(req.method==='POST'){
      const { name, language, category, components } = req.body||{};
      if(!name||!language||!category) return res.status(400).json({ok:false,error:'Falta name, language o category'});
      const created = await graph(`${G(conn.waba_id+'/message_templates')}`, { ...h, method:'POST', headers:{...h.headers,'Content-Type':'application/json'}, body: JSON.stringify({ name, language, category, components: components||[] }) });
      return res.status(200).json({ok:true, template: created});
    }
    return res.status(405).json({ok:false,error:'Method not allowed'});
  }catch(e){ console.error('templates error:',e.message); return res.status(500).json({ok:false,error:'No se pudo cargar Templates en vivo'}); }
};
