-- supabase/migrations/010_outreach_effectiveness.sql

-- 1) One row per contact attempt, with “before” and “after” scores
create table if not exists public.outreach_outcomes (
  id uuid primary key default gen_random_uuid(),

  gym_id uuid not null,
  contacted_log_id uuid not null, -- links to contacted_log.id
  member_id text not null,

  channel text not null,          -- 'sms' or 'email'
  contacted_at timestamptz not null,

  score_before double precision null,
  score_after_7d double precision null,

  delta_7d double precision null,          -- score_after_7d - score_before
  improved_7d boolean not null default false, -- true if delta_7d <= -5.0 (simple first rule)

  created_at timestamptz not null default now(),

  constraint outreach_channel_check check (channel in ('sms','email')),
  constraint outreach_outcomes_unique unique (gym_id, contacted_log_id)
);

create index if not exists outreach_outcomes_gym_contacted_at_idx
on public.outreach_outcomes (gym_id, contacted_at desc);

alter table public.outreach_outcomes enable row level security;

-- 2) Daily rollup per gym for the Reports page
create table if not exists public.gym_outreach_effectiveness_daily (
  id uuid primary key default gen_random_uuid(),

  gym_id uuid not null,
  metric_date date not null,

  contacts_count int not null default 0,
  measured_count int not null default 0,
  avg_delta_7d double precision null,
  improved_percent_7d double precision null,

  created_at timestamptz not null default now(),

  constraint gym_outreach_effectiveness_daily_unique unique (gym_id, metric_date)
);

create index if not exists gym_outreach_effectiveness_daily_gym_date_idx
on public.gym_outreach_effectiveness_daily (gym_id, metric_date desc);

alter table public.gym_outreach_effectiveness_daily enable row level security;

-- RLS policies: “own gym only”
-- NOTE: policies are like an implicit WHERE clause on every query. [page:1]

drop policy if exists "Outreach outcomes: select own gym" on public.outreach_outcomes;
create policy "Outreach outcomes: select own gym"
on public.outreach_outcomes for select to authenticated
using (
  gym_id = (select p.gym_id from public.profiles p where p.user_id = (select auth.uid()))
);

drop policy if exists "Outreach outcomes: insert own gym" on public.outreach_outcomes;
create policy "Outreach outcomes: insert own gym"
on public.outreach_outcomes for insert to authenticated
with check (
  gym_id = (select p.gym_id from public.profiles p where p.user_id = (select auth.uid()))
);

drop policy if exists "Effectiveness daily: select own gym" on public.gym_outreach_effectiveness_daily;
create policy "Effectiveness daily: select own gym"
on public.gym_outreach_effectiveness_daily for select to authenticated
using (
  gym_id = (select p.gym_id from public.profiles p where p.user_id = (select auth.uid()))
);

drop policy if exists "Effectiveness daily: insert own gym" on public.gym_outreach_effectiveness_daily;
create policy "Effectiveness daily: insert own gym"
on public.gym_outreach_effectiveness_daily for insert to authenticated
with check (
  gym_id = (select p.gym_id from public.profiles p where p.user_id = (select auth.uid()))
);

drop policy if exists "Effectiveness daily: update own gym" on public.gym_outreach_effectiveness_daily;
create policy "Effectiveness daily: update own gym"
on public.gym_outreach_effectiveness_daily for update to authenticated
using (
  gym_id = (select p.gym_id from public.profiles p where p.user_id = (select auth.uid()))
)
with check (
  gym_id = (select p.gym_id from public.profiles p where p.user_id = (select auth.uid()))
);
