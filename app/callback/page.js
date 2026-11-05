'use client';
import { useEffect, useState } from 'react';
export default function Callback(){
  const [businesses, setBusinesses] = useState([]);
  const [status, setStatus] = useState('Cargando...');
  useEffect(()=>{
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    if(!code){ setStatus('No code'); return; }
    fetch(`/api/exchange?code=${code}`).then(r=>r.json()).then(j=>{
      if(j.businesses){ setBusinesses(j.businesses); setStatus('Selecciona tu portafolio'); }
      else { setStatus(JSON.stringify(j).slice(0,500)); }
    });
  },[]);
  const invite = (bid) => {
    setStatus('Enviando invitación...');
    fetch(`/api/invite?business_id=${bid}`).then(r=>r.json()).then(j=>{
      setStatus(JSON.stringify(j,null,2));
      if(j.approval_url) window.open(j.approval_url,'_blank');
      setTimeout(()=> window.location.href = `/verificando?business_id=${bid}`, 1200);
    });
  };
  return (
    <div style={{padding:20,fontFamily:'system-ui'}}>
      <div style={{background:'#fff',padding:24,borderRadius:12,maxWidth:600,margin:'20px auto'}}>
        <h2>Selecciona tu portafolio</h2>
        {businesses.map((b)=>(
          <div key={b.id} style={{border:'1px solid #eee',padding:12,borderRadius:8,margin:'8px 0',display:'flex',justifyContent:'space-between'}}>
            <div><b>{b.name}</b><br/><small>{b.id}</small></div>
            <button onClick={()=>invite(b.id)} style={{background:'#1877F2',color:'#fff',border:'none',padding:'8px 14px',borderRadius:6,cursor:'pointer'}}>Autorizar</button>
          </div>
        ))}
        <div style={{border:'1px dashed #ccc',padding:12,borderRadius:8,marginTop:12}}>
          <b>Kiamber (manual)</b><br/><small>832691819931306</small><br/>
          <button onClick={()=>invite('832691819931306')} style={{marginTop:8,background:'#25D366',color:'#fff',border:'none',padding:'8px 14px',borderRadius:6}}>Autorizar Kiamber</button>
        </div>
        <pre style={{marginTop:20,background:'#f5f5f5',padding:12,borderRadius:8,overflow:'auto',whiteSpace:'pre-wrap'}}>{status}</pre>
      </div>
    </div>
  )
}
