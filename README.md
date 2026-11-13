# WhatKiamber - CORRECCIONES COMPLETAS
Proveedor WhatsApp como Ranvedix, message-blind.

## Que corrige
1. app.js: ahora SI pasa URL + token + mode a callback.
2. callback.js: guarda override + mode.
3. lib.js en RAIZ, no en api/, no cuenta como funcion.
4. api/panel.js: 1 funcion para overview, connections, routing, health, diagnostic, templates, usage, disconnect.
5. vercel.json: quitado rewrite /data-deletion que chocaba con api/data-deletion.
6. schema: coincide con lib.js (orgs + members). NO crea messages.
7. BORRADO: inbox.js, message.js, webhook-status.js (guardaban mensajes, contradicen message-blind).

## Total funciones: 5 de 12
api/callback.js, api/webhook.js, api/panel.js, api/config.js, api/data-deletion/ (tu carpeta original)

## Como instalar
1. En GitHub BORRA de api/: overview.js, connections.js, routing.js, health.js, disconnect.js, diagnostic.js, templates.js, usage.js, _lib.js, lib.js, inbox.js, message.js, webhook-status.js, data-deletion.js (archivo, NO carpeta)
2. Copia este ZIP: panel.html, app.js, lib.js (RAIZ), vercel.json, api/callback.js, api/webhook.js, api/panel.js, api/config.js
3. Supabase: corre schema_overview_patch.sql UNA vez.
4. Vercel env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_ANON_KEY, TOKEN_ENC_KEY, APP_ID, CONFIG_ID, APP_SECRET, WEBHOOK_VERIFY_TOKEN, GRAPH_VERSION=v21.0
5. Push a main. Debe decir Ready.
