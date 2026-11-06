create extension if not exists pgcrypto;
create table if not exists orgs (id uuid primary key default gen_random_uuid(), name text not null, created_at timestamptz default now());
create table if not exists members (user_id uuid references auth.users on delete cascade, org_id uuid references orgs on delete cascade, role text default 'owner', primary key (user_id, org_id));
create table if not exists connections (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references orgs on delete cascade,
  waba_id text not null unique, name text, phone_number_id text, display_phone text, verified_name text,
  status text default 'pending', quality text, tier text,
  token_cipher text, token_expires_at timestamptz, synced_at timestamptz, created_at timestamptz default now());
create table if not exists templates (
  id uuid primary key default gen_random_uuid(),
  connection_id uuid not null references connections on delete cascade,
  name text not null, language text not null default 'und', category text, status text, updated_at timestamptz default now(),
  unique (connection_id, name, language));
create table if not exists audit_log (id bigserial primary key, org_id uuid, actor uuid, action text not null, meta jsonb default '{}', at timestamptz default now());

alter table orgs enable row level security; alter table members enable row level security;
alter table connections enable row level security; alter table templates enable row level security; alter table audit_log enable row level security;
create policy "members read own" on members for select using (user_id = auth.uid());
create policy "orgs read own" on orgs for select using (id in (select org_id from members where user_id = auth.uid()));
create policy "connections read own" on connections for select using (org_id in (select org_id from members where user_id = auth.uid()));
create policy "templates read own" on templates for select using (connection_id in (select c.id from connections c join members m on m.org_id = c.org_id where m.user_id = auth.uid()));
create policy "audit read own" on audit_log for select using (org_id in (select org_id from members where user_id = auth.uid()));
-- Escrituras y tokens: solo desde el backend con la service role (ignora RLS).
revoke all on connections from anon, authenticated; grant select (id, org_id, waba_id, name, phone_number_id, display_phone, verified_name, status, quality, tier, token_expires_at, synced_at, created_at) on connections to authenticated;
