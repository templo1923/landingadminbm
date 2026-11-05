# WhatSeller Final - Config 1889600718898450

App: 811281598468466
Config ID: 1889600718898450 (WhatSeller)
BM: COSITAS DELICIOSAS S.A.S 215054423376570 verificado
Kiamber BM: 832691819931306

Flujo nuevo con Embedded Signup (sin api/invite):
1. index.html -> FB.login con config_id 1889600718898450
2. Usuario elige empresa y WABA (ej: Kiamber 832691819931306 y WABA 1146913454580655)
3. Facebook devuelve code
4. api/callback.js cambia code por access_token de System User (60 dias)
5. Con ese token ya puedes llamar a /me/businesses y /me/whatsapp_business_accounts

No necesita POST /business_users por eso no da error (#100) ni Request is no longer pending.

Para deployar en Vercel:
- Sube estos 2 archivos: index.html y api/callback.js
- No uses vercel.json
- En App 811281598468466 > Facebook Login > Valid OAuth Redirect URIs: https://prooveedordetecnologyia.vercel.app/
- En Dominios: prooveedordetecnologyia.vercel.app
