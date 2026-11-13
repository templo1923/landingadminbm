-- schema CORREGIDO - correr UNA sola vez en Supabase SQL Editor. Coincide con lib.js (orgs + members). NO crea messages.
create table if not exists orgs (id uuid primary key default gen_random_uuid(), name text, created_at timestamptz default now());
create table if not exists members (id uuid primary key default gen_random_uuid(), user_id uuid not null, org_id uuid not null references orgs(id) on delete cascade, role text default 'owner', created_at timestamptz default now(), unique(user_id, org_id));
create table if not exists connections (id uuid primary key default gen_random_uuid(), org_id uuid not null references orgs(id) on delete cascade, waba_id text not null unique, phone_number_id text, business_id text, display_phone text, verified_name text, status text default 'pending', quality text, tier text, mode text default 'dedicado', customer_webhook_url text, customer_verify_token_cipher text, token_cipher text, token_expires_at timestamptz, last_opened_at timestamptz, identity_key_check boolean default false, synced_at timestamptz, created_at timestamptz default now());
create table if not exists audit_log (id uuid primary key default gen_random_uuid(), org_id uuid not null, actor text, action text not null, meta jsonb default '{}'::jsonb, at timestamptz default now());
create table if not exists templates (id uuid primary key default gen_random_uuid(), connection_id uuid not null references connections(id) on delete cascade, name text, language text, category text, status text, updated_at timestamptz default now(), unique(connection_id, name, language));
alter table connections add column if not exists customer_webhook_url text;
alter table connections add column if not exists customer_verify_token_cipher text;
alter table connections add column if not exists mode text default 'dedicado';
alter table connections add column if not exists last_opened_at timestamptz;
alter table connections add column if not exists identity_key_check boolean default false;
