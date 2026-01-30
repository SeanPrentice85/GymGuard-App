-- supabase/migrations/002_gyms_profiles_onboarding_rls.sql

-- ================
-- A) Core tables
-- ================

create table if not exists public.gyms (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'My Gym',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  gym_id uuid not null references public.gyms(id) on delete restrict,
  role text not null default 'gym_owner',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint profiles_role_check check (role in ('admin', 'gym_owner'))
);

create index if not exists profiles_gym_id_idx on public.profiles(gym_id);

-- ================
-- B) updated_at helper
-- ================

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_updated_at_gyms on public.gyms;
create trigger set_updated_at_gyms
before update on public.gyms
for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at_profiles on public.profiles;
create trigger set_updated_at_profiles
before update on public.profiles
for each row execute function public.set_updated_at();

-- ================
-- C) RLS enable (Supabase requires RLS on exposed tables) [page:6]
-- ================

alter table public.gyms enable row level security;
alter table public.profiles enable row level security;

-- Users can read/update only their own profile row (auth.uid() identifies current user) [page:6]
drop policy if exists "Profiles: select own row" on public.profiles;
create policy "Profiles: select own row"
on public.profiles
for select
to authenticated
using (
  (select auth.uid()) is not null
  and user_id = (select auth.uid())
);

drop policy if exists "Profiles: update own row" on public.profiles;
create policy "Profiles: update own row"
on public.profiles
for update
to authenticated
using (
  (select auth.uid()) is not null
  and user_id = (select auth.uid())
)
with check (
  (select auth.uid()) is not null
  and user_id = (select auth.uid())
);

-- Gyms: users can only see their own gym (via their profile) [page:6]
drop policy if exists "Gyms: select own gym" on public.gyms;
create policy "Gyms: select own gym"
on public.gyms
for select
to authenticated
using (
  (select auth.uid()) is not null
  and id = (select p.gym_id from public.profiles p where p.user_id = (select auth.uid()))
);

-- ================
-- D) Automatic onboarding: on signup, create a gym + profile
-- Use a private schema for security-definer functions (Supabase warns about exposed schemas). [page:6]
-- ================

create schema if not exists private;

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  new_gym_id uuid;
begin
  -- Create a new gym for this new user
  insert into public.gyms (name)
  values ('My Gym')
  returning id into new_gym_id;

  -- Create a profile linking user -> gym
  insert into public.profiles (user_id, gym_id, role)
  values (new.id, new_gym_id, 'gym_owner');

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function private.handle_new_user();

-- ================
-- E) Update members RLS to use profiles.gym_id
-- (Drop Phase 1 member policies and replace them)
-- Policies are implicit WHERE clauses on every query. [page:6]
-- ================

drop policy if exists "Members: select own gym" on public.members;
drop policy if exists "Members: insert own gym" on public.members;
drop policy if exists "Members: update own gym" on public.members;
drop policy if exists "Members: delete own gym" on public.members;

create policy "Members: select own gym"
on public.members
for select
to authenticated
using (
  (select auth.uid()) is not null
  and gym_id = (select p.gym_id from public.profiles p where p.user_id = (select auth.uid()))
);

create policy "Members: insert own gym"
on public.members
for insert
to authenticated
with check (
  (select auth.uid()) is not null
  and gym_id = (select p.gym_id from public.profiles p where p.user_id = (select auth.uid()))
);

create policy "Members: update own gym"
on public.members
for update
to authenticated
using (
  (select auth.uid()) is not null
  and gym_id = (select p.gym_id from public.profiles p where p.user_id = (select auth.uid()))
)
with check (
  (select auth.uid()) is not null
  and gym_id = (select p.gym_id from public.profiles p where p.user_id = (select auth.uid()))
);

create policy "Members: delete own gym"
on public.members
for delete
to authenticated
using (
  (select auth.uid()) is not null
  and gym_id = (select p.gym_id from public.profiles p where p.user_id = (select auth.uid()))
);
