-- supabase/migrations/001_create_members.sql

create extension if not exists "pgcrypto";

create table if not exists public.members (
  id uuid primary key default gen_random_uuid(),

  -- Tenant separation
  gym_id uuid not null,

  -- Gym's source identifier for the member
  member_id text not null,

  first_name text not null,
  last_name text not null,
  phone text null,
  email text null,

  -- Latest churn results persisted for fast UI loads
  last_churn_score double precision null,      -- Float (0..100)
  last_score_date timestamptz null,            -- Timestamp
  is_high_risk boolean not null default false, -- true when last_churn_score >= 70.0

  -- Used for the “remove from Home for 1 day” workflow
  last_contacted_at timestamptz null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint members_gym_member_unique unique (gym_id, member_id),
  constraint members_score_range check (
    last_churn_score is null
    or (last_churn_score >= 0 and last_churn_score <= 100)
  )
);

-- Performance for Home screen (filter + sort)
create index if not exists members_gym_id_idx on public.members (gym_id);
create index if not exists members_gym_score_idx on public.members (gym_id, last_churn_score desc);
create index if not exists members_gym_contacted_idx on public.members (gym_id, last_contacted_at desc);

-- RLS must be enabled on exposed tables [web:49]
alter table public.members enable row level security;

-- SELECT: only rows for the user's gym_id
create policy "Members: select own gym"
on public.members
for select
to authenticated
using (
  gym_id = ((auth.jwt() -> 'app_metadata' ->> 'gym_id')::uuid)
);

-- INSERT: can only insert rows for the user's gym_id
create policy "Members: insert own gym"
on public.members
for insert
to authenticated
with check (
  gym_id = ((auth.jwt() -> 'app_metadata' ->> 'gym_id')::uuid)
);

-- UPDATE: can only update rows for the user's gym_id
create policy "Members: update own gym"
on public.members
for update
to authenticated
using (
  gym_id = ((auth.jwt() -> 'app_metadata' ->> 'gym_id')::uuid)
)
with check (
  gym_id = ((auth.jwt() -> 'app_metadata' ->> 'gym_id')::uuid)
);

-- DELETE: optional but included for completeness
create policy "Members: delete own gym"
on public.members
for delete
to authenticated
using (
  gym_id = ((auth.jwt() -> 'app_metadata' ->> 'gym_id')::uuid)
);
