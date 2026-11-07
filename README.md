# WhatKiamber — Embedded Signup + Panel

1. Supabase → SQL Editor: ejecuta `schema_update.sql` (agrega la columna business_id y la tabla de mensajes; se puede correr varias veces).
2. Vercel → Variables (Production): APP_ID, APP_SECRET, BUSINESS_ID, SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY,
   META_CONFIG_ID, WEBHOOK_VERIFY_TOKEN, SYSTEM_USER_TOKEN, TOKEN_ENC_KEY y `GRAPH_VERSION=v26.0`.
3. Meta → tu app → WhatsApp → Configuración → Webhook:
   URL `https://prooveedordetecnologyia.vercel.app/api/webhook` · Verify token = WEBHOOK_VERIFY_TOKEN.
   Campos: `messages`, `account_update`, `phone_number_quality_update`, `message_template_status_update`.
4. Sube a Git y Vercel despliega solo.
