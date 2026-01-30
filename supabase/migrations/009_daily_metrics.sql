-- supabase/migrations/009_daily_metrics.sql

create table if not exists public.gym_daily_metrics (
  id uuid primary key default gen_random_uuid(),

  gym_id uuid not null,
  metric_date date not null, -- one row per gym per day (ex: 2026-01-29)

  -- Member risk snapshot
  high_risk_count int not null default 0,        -- members where last_churn_score >= 70.0
  contacted_last_1d_count int not null default 0, -- members contacted within last 24 hours

  -- Sending volume (real provider or “queued” counts)
  sms_sent_count int not null default 0,
  email_sent_count int not null default 0,

  -- Engagement
  sms_click_count int not null default 0,
  email_open_count int not null default 0,
  email_click_count int not null default 0,

  created_at timestamptz not null default now(),

  constraint gym_daily_metrics_unique unique (gym_id, metric_date)
);

create index if not exists gym_daily_metrics_gym_date_idx
on public.gym_daily_metrics (gym_id, metric_date desc);

alter table public.gym_daily_metrics enable row level security;

-- RLS: only own gym (same profiles.gym_id pattern as your other tables) [web:49]
drop policy if exists "Daily metrics: select own gym" on public.gym_daily_metrics;
create policy "Daily metrics: select own gym"
on public.gym_daily_metrics
for select
to authenticated
using (
  gym_id = (select p.gym_id from public.profiles p where p.user_id = (select auth.uid()))
);

drop policy if exists "Daily metrics: insert own gym" on public.gym_daily_metrics;
create policy "Daily metrics: insert own gym"
on public.gym_daily_metrics
for insert
to authenticated
with check (
  gym_id = (select p.gym_id from public.profiles p where p.user_id = (select auth.uid()))
);

drop policy if exists "Daily metrics: update own gym" on public.gym_daily_metrics;
create policy "Daily metrics: update own gym"
on public.gym_daily_metrics
for update
to authenticated
using (
  gym_id = (select p.gym_id from public.profiles p where p.user_id = (select auth.uid()))
)
with check (
  gym_id = (select p.gym_id from public.profiles p where p.user_id = (select auth.uid()))
);
