-- supabase/migrations/008_score_history.sql

create table if not exists public.member_score_history (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null,
  member_id text not null,

  churn_score double precision not null,     -- 0..100
  score_date timestamptz not null default now(),

  created_at timestamptz not null default now(),

  constraint member_score_history_score_range check (churn_score >= 0 and churn_score <= 100)
);

create index if not exists member_score_history_gym_member_date_idx
on public.member_score_history (gym_id, member_id, score_date desc);

alter table public.member_score_history enable row level security;

-- RLS: only own gym (same “profiles.gym_id” pattern you already use) [web:49]
drop policy if exists "Score history: select own gym" on public.member_score_history;
create policy "Score history: select own gym"
on public.member_score_history
for select
to authenticated
using (
  gym_id = (select p.gym_id from public.profiles p where p.user_id = (select auth.uid()))
);

drop policy if exists "Score history: insert own gym" on public.member_score_history;
create policy "Score history: insert own gym"
on public.member_score_history
for insert
to authenticated
with check (
  gym_id = (select p.gym_id from public.profiles p where p.user_id = (select auth.uid()))
);
