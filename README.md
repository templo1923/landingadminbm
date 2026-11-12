# WhatKiamber — COMPLETO Y FUNCIONAL
Panel tipo Ranvedix, message-blind, sin datos falsos, todo por API real de Meta.

## Que hay en este ZIP
- panel.html — UN SOLO panel: Overview, Connections, Detalle (Overview / Routing / Health / Danger), Templates, Usage. No hay HTML aparte.
- app.js — Onboard con override_callback_uri: pasa customer_webhook_url + customer_verify_token + mode a /api/callback.
- api/overview.js — Overview en vivo.
- api/callback.js — Onboard, obliga URL https + token antes de Launch.
- api/connections.js — Lista en vivo desde Meta, search, filtro, Export CSV, Resync.
- api/routing.js — Routing: Save & re-apply, Test ping.
- api/webhook.js — Message-blind: verifica firma, hace forward al webhook del cliente, dropea contenido, solo audita metadatos. NO guarda mensajes.
- api/health.js — Health: quality en vivo, history desde audit_log, heartbeat manual, identity-key toggle, webhook activity.
- api/disconnect.js — Danger: borra config del control plane, no borra WABA en Meta.
- api/templates.js — Templates en vivo desde Meta.
- api/usage.js — Usage en vivo, MTD 0 si Meta no devuelve.
- api/diagnostic.js — Diagnostico de conexion.
- api/data-deletion.js — Callback de borrado requerido por Meta.
- api/_lib.js — Supabase + Graph + crypto + auth + audit.
- schema_overview_patch.sql — Aplicar en Supabase.

## Como instalar
1. Supabase > SQL Editor > pega schema_overview_patch.sql > Run.
2. Copia todo este contenido a tu repo landingadminbm, reemplaza los archivos que ya tienes.
3. Vercel > tu proyecto > Settings > Environment Variables (Production):
   - SUPABASE_URL
   - SUPABASE_SERVICE_ROLE_KEY
   - TOKEN_ENC_KEY (base64 32 bytes, genera con: openssl rand -base64 32)
   - APP_SECRET (de tu App de Meta)
   - WEBHOOK_VERIFY_TOKEN (el de tu app, no el del cliente)
   - WHATSAPP_API_VERSION = v21.0
4. Push a main, Vercel despliega.
5. Entra a /panel, Onboard con tu numero de prueba, pon Destination webhook URL + Verify token, marca Coexistence, Launch signup.

## Como probar que funciona
- Overview: 1 conexion live, Recent activity con Connection created / went live.
- Connections: tu numero en verde, Manage abre detalle.
- Routing: tu URL guardada, Save & re-apply en verde, Test ping en verde.
- Health: Quality Green, Diagnostics en verde, Heartbeat con boton I opened the app.
- Templates: lista real de Meta.
- Usage: MTD 0 si Meta no devuelve analytics, no inventa.
- Webhook: manda un mensaje de prueba al numero, debe llegar a tu customer_webhook_url, no debe quedar guardado en WhatKiamber.

## Que NO hace
- No guarda contenido de mensajes.
- No inventa datos.
- No usa business_management.
- Solo whatsapp_business_messaging + whatsapp_business_management.
