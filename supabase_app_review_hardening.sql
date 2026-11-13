-- App Review hardening for Suscripta. Safe to run once in Supabase SQL Editor.
ALTER TABLE public.whatsapp_connections
  ADD COLUMN IF NOT EXISTS access_token_encrypted TEXT;

ALTER TABLE public.whatsapp_connections
  ALTER COLUMN access_token DROP NOT NULL;

CREATE INDEX IF NOT EXISTS whatsapp_connections_user_active_idx
  ON public.whatsapp_connections (user_id, is_active, created_at DESC);

CREATE INDEX IF NOT EXISTS whatsapp_message_events_phone_idx
  ON public.whatsapp_message_events (phone_number_id, updated_at DESC);

-- New connections are written to access_token_encrypted by the application.
-- Existing plaintext rows are kept temporarily for a controlled re-connect migration.
-- After the review test account is reconnected successfully, remove old plaintext values:
-- UPDATE public.whatsapp_connections SET access_token = NULL WHERE access_token_encrypted IS NOT NULL;
