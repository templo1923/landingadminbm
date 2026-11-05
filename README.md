# WhatKiamber Landing Simple - Solo Admin

Flujo:
1. /index.html -> Login Facebook con scope business_management, whatsapp_business_management, whatsapp_business_messaging
2. /api/callback.js -> Cambia code por EAAL token + lista BMs (Kiamber 832691819931306, cositas 215054423376570, etc)
3. /callback.html?token=EAAL...&businesses=[...] -> Muestra portafolios y botón Autorizar
4. /api/invite?business_id=ID&token=EAAL -> Invita a onboarding@sellerchat.ai como ADMIN al BM

No crea System User 61583364092265 ni pide token de app. Por eso no sale "Request is no longer pending".

Para desplegar en Vercel:
- Sube este zip
- Framework: Other
- No necesita env vars
- Dominios OAuth en App 811281598468466: https://prooveedordetecnologyia.vercel.app/api/callback
