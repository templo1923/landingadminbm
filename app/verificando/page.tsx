'use client';
import { useEffect, useState } from 'react';

export default function Verificando(){
  const [bid, setBid] = useState('832691819931306');
  const [state, setState] = useState('Verificando cada 3s...');
  
  useEffect(()=>{
    const p = new URLSearchParams(window.location.search);
    const b = p.get('business_id');
    if(b) setBid(b);
  },[]);

  useEffect(()=>{
    const check = () => {
      fetch(`/api/check-admin?business_id=${bid}`)
        .then(r=>r.json())
        .then(j=>{
          setState(JSON.stringify(j, null, 2));
          if(j.isAdmin){
            window.location.href = `/datos-wsp?business_id=${bid}`;
          }
        });
    };
    const id = setInterval(check, 3000);
    check();
    return ()=> clearInterval(id);
  },[bid]);

  return (
    <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'#f6f7f8',fontFamily:'system-ui'}}>
      <div style={{background:'#fff',padding:32,borderRadius:16,maxWidth:420,textAlign:'center'}}>
        <h2>⏳ Esperando tu aprobación</h2>
        <p>Te abrimos verificación de Meta. Aprueba con SMS, app o huella.</p>
        <small>BM: {bid}<br/>Invitando a: onboarding@sellerchat.ai</small>
        <pre style={{textAlign:'left',background:'#f5f5f5',padding:12,borderRadius:8,marginTop:12,overflow:'auto',maxHeight:200}}>{state}</pre>
        <a href="https://business.facebook.com/requests" target="_blank" style={{display:'block',marginTop:12}}>Abrir business.facebook.com/requests</a>
      </div>
    </div>
  )
}
