// app.js CORREGIDO - ahora SI pasa URL + token + mode
let CFG, sb, SESSION=null, signup={};
window.__onboard=null;
window.addEventListener('message', ev=>{
  if(!ev.origin.endsWith('facebook.com')) return;
  try{ const d=typeof ev.data==='string'?JSON.parse(ev.data):ev.data; if(d&&d.type==='WA_EMBEDDED_SIGNUP') signup=d.data||{}; }catch(_){}
});
async function boot(){
  CFG=await (await fetch('/api/config')).json();
  sb=supabase.createClient(CFG.supabaseUrl, CFG.supabaseAnonKey);
  const {data}=await sb.auth.getSession(); SESSION=data.session;
  sb.auth.onAuthStateChange((_e,s)=>{SESSION=s;});
  await new Promise(resolve=>{
    window.fbAsyncInit=()=>{FB.init({appId:CFG.appId, xfbml:false, version:CFG.version}); resolve();};
    const s=document.createElement('script'); s.src='https://connect.facebook.net/en_US/sdk.js'; s.async=true; s.crossOrigin='anonymous'; s.onerror=resolve; document.body.appendChild(s);
  });
}
function connectWA(done){
  if(!SESSION){ location.href='/panel'; return; }
  if(!window.__onboard || !window.__onboard.customer_webhook_url || !window.__onboard.customer_verify_token){
    return done({ok:false, error:'Primero pon Destination webhook URL y Verify token en el modal.'});
  }
  signup={}; const token=SESSION.access_token; const ob=window.__onboard;
  FB.login(resp=>{
    const code=resp.authResponse&&resp.authResponse.code;
    if(!code) return done({cancel:true});
    const t0=Date.now();
    const send=async()=>{
      try{
        const r=await fetch('/api/callback',{method:'POST', headers:{'Content-Type':'application/json', Authorization:'Bearer '+token}, body:JSON.stringify({code, waba_id:signup.waba_id, phone_number_id:signup.phone_number_id, business_id:signup.business_id, mode:ob.mode, customer_webhook_url:ob.customer_webhook_url, customer_verify_token:ob.customer_verify_token})});
        done(await r.json());
      }catch(_){ done({ok:false}); }
    };
    const wait=()=>(signup.waba_id||Date.now()-t0>6000)?send():setTimeout(wait,300);
    wait();
  },{config_id:CFG.configId, response_type:'code', override_default_response_type:true, override_callback_uri:ob.customer_webhook_url, extras:{setup:{}, featureType:'', sessionInfoVersion:'3'}});
}
