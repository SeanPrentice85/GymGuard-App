-- supabase/migrations/004_messaging_tables.sql

-- 1) Templates: reusable text/email drafts
create table if not exists public.templates (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null,
  type text not null, -- 'sms' or 'email'
  name text not null,
  body text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint templates_type_check check (type in ('sms','email'))
);

create index if not exists templates_gym_id_idx on public.templates(gym_id);

alter table public.templates enable row level security;

-- 2) Contact log: records that the gym attempted contact (even if provider is not connected yet)
create table if not exists public.contacted_log (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null,
  member_id text not null,
  channel text not null, -- 'sms' or 'email'
  message_body text not null,
  sent_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint contacted_log_channel_check check (channel in ('sms','email'))
);

create index if not exists contacted_log_gym_id_sent_at_idx on public.contacted_log(gym_id, sent_at desc);
create index if not exists contacted_log_gym_member_idx on public.contacted_log(gym_id, member_id);

alter table public.contacted_log enable row level security;

-- 3) Engagement events (stub for later): open/click tracking
create table if not exists public.engagement_events (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null,
  member_id text not null,
  channel text not null, -- 'sms' or 'email'
  event_type text not null, -- 'open' or 'click'
  url text null,
  created_at timestamptz not null default now(),
  constraint engagement_channel_check check (channel in ('sms','email')),
  constraint engagement_event_type_check check (event_type in ('open','click'))
);

create index if not exists engagement_events_gym_created_at_idx on public.engagement_events(gym_id, created_at desc);

alter table public.engagement_events enable row level security;

-- RLS Policies:
-- These policies assume you already have public.profiles(user_id, gym_id)
-- and you want "only users of a gym can access rows for that gym".
-- Policies are enforced automatically on every query. [web:49]

-- Templates policies
drop policy if exists "Templates: select own gym" on public.templates;
create policy "Templates: select own gym"
on public.templates for select to authenticated
using (
  gym_id = (select p.gym_id from public.profiles p where p.user_id = (select auth.uid()))
);

drop policy if exists "Templates: insert own gym" on public.templates;
create policy "Templates: insert own gym"
on public.templates for insert to authenticated
with check (
  gym_id = (select p.gym_id from public.profiles p where p.user_id = (select auth.uid()))
);

drop policy if exists "Templates: update own gym" on public.templates;
create policy "Templates: update own gym"
on public.templates for update to authenticated
using (
  gym_id = (select p.gym_id from public.profiles p where p.user_id = (select auth.uid()))
)
with check (
  gym_id = (select p.gym_id from public.profiles p where p.user_id = (select auth.uid()))
);

drop policy if exists "Templates: delete own gym" on public.templates;
create policy "Templates: delete own gym"
on public.templates for delete to authenticated
using (
  gym_id = (select p.gym_id from public.profiles p where p.user_id = (select auth.uid()))
);

-- Contacted_log policies
drop policy if exists "Contacted log: select own gym" on public.contacted_log;
create policy "Contacted log: select own gym"
on public.contacted_log for select to authenticated
using (
  gym_id = (select p.gym_id from public.profiles p where p.user_id = (select auth.uid()))
);

drop policy if exists "Contacted log: insert own gym" on public.contacted_log;
create policy "Contacted log: insert own gym"
on public.contacted_log for insert to authenticated
with check (
  gym_id = (select p.gym_id from public.profiles p where p.user_id = (select auth.uid()))
);

-- Engagement events policies (read own gym; inserts later via provider webhooks)
drop policy if exists "Engagement: select own gym" on public.engagement_events;
create policy "Engagement: select own gym"
on public.engagement_events for select to authenticated
using (
  gym_id = (select p.gym_id from public.profiles p where p.user_id = (select auth.uid()))
);
