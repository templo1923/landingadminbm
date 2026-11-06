# WhatKiamber — Embedded Signup + Panel

1. Supabase → SQL Editor → pega `schema.sql` y ejecútalo.
2. Supabase → Authentication → URL Configuration: Site URL `https://prooveedordetecnologyia.vercel.app` y la misma URL en Redirect URLs.
   (Para la revisión de Meta puedes desactivar "Confirm email" en Providers → Email.)
3. Vercel → Environment Variables (marca Production): APP_ID, APP_SECRET, BUSINESS_ID, SUPABASE_URL, SUPABASE_ANON_KEY,
   SUPABASE_SERVICE_ROLE_KEY (ya las tienes) + META_CONFIG_ID, WEBHOOK_VERIFY_TOKEN, SYSTEM_USER_TOKEN, TOKEN_ENC_KEY.
4. Sube esta carpeta a Git (o `vercel --prod`) y haz Redeploy.
5. Meta: Redirect/Webhook = https://prooveedordetecnologyia.vercel.app/api/callback y /api/webhook; campos del webhook:
   account_update, phone_number_quality_update, message_template_status_update.
