'use client';
import { useState, useEffect } from 'react';

export default function DatosWsp(){
  const [bid, setBid] = useState('832691819931306');
  useEffect(()=>{
    const p = new URLSearchParams(window.location.search);
    const b = p.get('business_id');
    if(b) setBid(b);
  },[]);
  
  return (
    <div style={{padding:20,fontFamily:'system-ui',background:'#f6f7f8',minHeight:'100vh'}}>
      <div style={{background:'#fff',padding:24,borderRadius:12,maxWidth:500,margin:'auto'}}>
        <h2>✅ Ya eres admin de {bid}</h2>
        <p>Configura tu WhatsApp para terminar.</p>
        <form action="/api/finalizar" method="POST">
          <input type="hidden" name="business_id" value={bid} />
          <label>Número WhatsApp</label>
          <input name="phone" placeholder="+57 300 123 4567" required style={{width:'100%',padding:10,margin:'6px 0 12px',border:'1px solid #ddd',borderRadius:6}}/>
          <label>Nombre para mostrar</label>
          <input name="verified_name" placeholder="Kiamber" required style={{width:'100%',padding:10,margin:'6px 0 12px',border:'1px solid #ddd',borderRadius:6}}/>
          <label>URL Callback</label>
          <input name="callback_url" placeholder="https://tucliente.com/webhook" required style={{width:'100%',padding:10,margin:'6px 0 12px',border:'1px solid #ddd',borderRadius:6}}/>
          <label>Verify Token</label>
          <input name="verify_token" defaultValue={`kiamber_${Math.random().toString(36).slice(2,8)}`} required style={{width:'100%',padding:10,margin:'6px 0 12px',border:'1px solid #ddd',borderRadius:6}}/>
          <label>PIN 6 dígitos</label>
          <input name="pin" placeholder="123456" required style={{width:'100%',padding:10,margin:'6px 0 12px',border:'1px solid #ddd',borderRadius:6}}/>
          <button type="submit" style={{background:'#25D366',color:'#fff',border:'none',padding:12,width:'100%',borderRadius:8,cursor:'pointer',fontWeight:600}}>Registrar número y crear conexión</button>
        </form>
      </div>
    </div>
  )
}
