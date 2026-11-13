-- schema_update.sql — parche para Overview todo por API, como Ranvedix
-- 1) Agregar Webhook Override a connections (solo metadatos, nunca contenido)
alter table connections add column if not exists customer_webhook_url text;
alter table connections add column if not exists customer_verify_token_cipher text;
alter table connections add column if not exists mode text default 'dedicado';
-- 2) Borrar / no usar tabla de mensajes. Todo directo de Meta, message-blind.
drop table if exists messages;
-- 3) Audit solo para acciones de admin, no para contenido. Si no existe, crearla.
create table if not exists audit_log (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null,
  actor text,
  action text not null,
  meta jsonb default '{}'::jsonb,
  at timestamptz default now()
);
