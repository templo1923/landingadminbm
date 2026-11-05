# Onboard WhatKiamber - Vercel

Repo listo para Vercel sin hosting PHP.

## Deploy en 1 click:

1. Sube este repo a GitHub (crea repo onboard-whatkiamber)
2. Ve a vercel.com > New Project > Import ese repo
3. En Environment Variables agrega:
```
APP_ID=811281598468466
APP_SECRET=adc3e9fa8df0abd2f9d0400d96fb9193
BUSINESS_ID=832691819931306
SYSTEM_USER_ID=122096076987112136
ADMIN_EMAIL=onboarding@sellerchat.ai
NEXT_PUBLIC_REDIRECT_URI=https://TU-PROYECTO.vercel.app/api/callback
```
4. Deploy

5. Luego ve a developers.facebook.com > App 811281598468466 > Facebook Login > Valid OAuth Redirects y agrega:
https://TU-PROYECTO.vercel.app/api/callback

6. Entra a https://TU-PROYECTO.vercel.app y prueba.

Flujo:
Home -> Login con Facebook -> Lista BMs -> Autorizar Kiamber 832691819931306 -> Verificando (polling cada 3s) -> Datos WhatsApp

IMPORTANTE: Rota el APP_SECRET después de probar porque quedó expuesto.
