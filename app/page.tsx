'use client';
import { useState } from 'react';

export default function Home(){
  const APP_ID = "811281598468466";
  const REDIRECT_URI = typeof window !== 'undefined' ? `${window.location.origin}/api/callback` : "";
  
  const login = () => {
    const scope = "business_management,whatsapp_business_management,whatsapp_business_messaging";
    const url = `https://www.facebook.com/v20.0/dialog/oauth?client_id=${APP_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&scope=${encodeURIComponent(scope)}&response_type=code`;
    window.location.href = url;
  };

  return (
    <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'#f6f7f8',fontFamily:'system-ui'}}>
      <div style={{background:'#fff',padding:32,borderRadius:16,boxShadow:'0 8px 30px rgba(0,0,0,.08)',maxWidth:420,width:'90%',textAlign:'center'}}>
        <h1 style={{fontSize:22,margin:'0 0 8px'}}>Conecta tu WhatsApp</h1>
        <p style={{color:'#666',fontSize:14}}>Conexión segura con Meta. 30 segundos.<br/>1 verificación para autorizar.</p>
        <button onClick={login} style={{background:'#1877F2',color:'#fff',border:'none',padding:'12px 20px',borderRadius:8,fontSize:15,cursor:'pointer',width:'100%',marginTop:16,fontWeight:600}}>Continuar con Facebook</button>
        <p style={{fontSize:11,color:'#999',marginTop:12}}>App: WhatKiamber 811281598468466<br/>BM prueba: Kiamber 832691819931306<br/>Email admin: onboarding@sellerchat.ai</p>
      </div>
    </div>
  )
}
