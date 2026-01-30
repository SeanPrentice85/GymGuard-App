-- supabase/migrations/011_audit_logs.sql

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),

  gym_id uuid not null,
  user_id uuid not null,

  action text not null,       -- e.g., 'send_sms', 'create_campaign'
  entity_type text null,      -- e.g., 'member', 'campaign'
  entity_id text null,        -- optional reference ID
  metadata jsonb null,        -- extra details

  created_at timestamptz not null default now()
);

-- Performance index: heavy filtering by gym + sorting by time
create index if not exists audit_logs_gym_created_idx
on public.audit_logs (gym_id, created_at desc);

alter table public.audit_logs enable row level security;

-- RLS: Own gym only
drop policy if exists "Audit: select own gym" on public.audit_logs;
create policy "Audit: select own gym"
on public.audit_logs for select to authenticated
using (
  gym_id = (select p.gym_id from public.profiles p where p.user_id = (select auth.uid()))
);

drop policy if exists "Audit: insert own gym" on public.audit_logs;
create policy "Audit: insert own gym"
on public.audit_logs for insert to authenticated
with check (
  gym_id = (select p.gym_id from public.profiles p where p.user_id = (select auth.uid()))
);
