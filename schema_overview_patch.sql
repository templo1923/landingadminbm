-- schema_overview_patch.sql — Aplicar en Supabase SQL Editor, una sola vez.
-- Agrega columnas que usan Overview, Routing, Health, Danger. No borra datos.
alter table connections add column if not exists customer_webhook_url text;
alter table connections add column if not exists customer_verify_token_cipher text;
alter table connections add column if not exists mode text default 'dedicado';
alter table connections add column if not exists last_opened_at timestamptz;
alter table connections add column if not exists identity_key_check boolean default false;
alter table connections add column if not exists token_cipher text;
alter table connections add column if not exists synced_at timestamptz;
create table if not exists audit_log (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null,
  actor text,
  action text not null,
  meta jsonb default '{}'::jsonb,
  at timestamptz default now()
);
create table if not exists orgs (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null,
  name text,
  created_at timestamptz default now()
);
-- Si existe tabla messages, NO la uses para message-blind. No la borramos automaticamente, solo la dejamos sin uso.
-- DROP TABLE IF EXISTS messages; -- descomentar solo si quieres borrarla de verdad.
