-- Ejecutar en Supabase → SQL Editor (se puede correr varias veces)
alter table connections add column if not exists business_id text;
create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  connection_id uuid not null references connections on delete cascade,
  wa_message_id text unique, contact_wa_id text not null, contact_name text,
  direction text not null check (direction in ('in','out')),
  type text, body text, status text, at timestamptz default now());
create index if not exists messages_conn_contact on messages (connection_id, contact_wa_id, at desc);
alter table messages enable row level security;
drop policy if exists "messages read own" on messages;
create policy "messages read own" on messages for select using (connection_id in (select c.id from connections c join members m on m.org_id = c.org_id where m.user_id = auth.uid()));
grant select (business_id) on connections to authenticated;
