-- supabase/migrations/005_provider_messaging.sql

-- 1) Message Sends: track every attempt via provider
create table if not exists public.message_sends (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null,
  member_id text not null,
  channel text not null, -- 'sms' or 'email'
  provider text not null, -- 'twilio', 'sendgrid', etc.
  provider_message_id text null, -- ID returned by provider
  status text not null default 'queued', -- queued, sent, delivered, failed, undelivered
  error_code text null,
  error_message text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  
  constraint message_sends_channel_check check (channel in ('sms','email'))
);

create index if not exists message_sends_gym_id_idx on public.message_sends(gym_id);
create index if not exists message_sends_provider_id_idx on public.message_sends(provider_message_id);

alter table public.message_sends enable row level security;

-- 2) Add opt-out columns to members
alter table public.members 
add column if not exists sms_opted_out boolean not null default false,
add column if not exists sms_opted_out_at timestamptz null;

-- RLS Policies for message_sends
-- Only allow gym owners to see their own sends (read-only mostly, writes come from API via service role usually, but if UI reads it needs policy)
create policy "Message Sends: select own gym"
on public.message_sends for select to authenticated
using (
  gym_id = (select p.gym_id from public.profiles p where p.user_id = (select auth.uid()))
);

-- Note: Inserting into message_sends handles by API (Service Role) normally, but if we do it from UI (not recommended in Phase 7C, Phase 7C says "Call your API"), 
-- we technically don't need an INSERT policy for authenticated users if the API does it. 
-- However, creating it purely for consistency or if we debug via dashboard.
create policy "Message Sends: insert own gym"
on public.message_sends for insert to authenticated
with check (
  gym_id = (select p.gym_id from public.profiles p where p.user_id = (select auth.uid()))
);

-- RLS Update: users should be able to read/update members (already exists), so the new columns are covered by existing policies on ‘members’.
