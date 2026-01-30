-- supabase/migrations/007_reliability.sql

-- 1) Enhance message_sends for retries
alter table public.message_sends
add column if not exists attempt_count int not null default 0,
add column if not exists next_retry_at timestamptz null,
add column if not exists final_status text not null default 'pending', -- sent, failed, gave_up
add column if not exists last_error text null;

create index if not exists message_sends_retry_idx on public.message_sends(next_retry_at) where next_retry_at is not null;

-- 2) Raw Webhook Events Log
create table if not exists public.provider_webhook_events (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid null, -- nullable because sometimes we don't know who it is yet from raw payload
  provider text not null, -- 'twilio', 'sendgrid'
  event_type text null,
  provider_message_id text null,
  payload jsonb not null,
  received_at timestamptz not null default now()
);

alter table public.provider_webhook_events enable row level security;

-- 3) Dead Letter Queue (DLQ)
create table if not exists public.dead_letter_messages (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null,
  member_id text not null,
  channel text not null,
  message_body text not null,
  reason text not null,
  original_send_id uuid null, -- link back to message_sends if applicable
  created_at timestamptz not null default now()
);

alter table public.dead_letter_messages enable row level security;

-- RLS Policies

-- Webhook Events (Admin/Debug view mostly, but let owners see if we link gym_id)
create policy "Webhook Events: select own gym"
on public.provider_webhook_events for select to authenticated
using (
  gym_id = (select p.gym_id from public.profiles p where p.user_id = (select auth.uid()))
);

-- Dead Letter Policies
create policy "DLQ: select own gym"
on public.dead_letter_messages for select to authenticated
using (
  gym_id = (select p.gym_id from public.profiles p where p.user_id = (select auth.uid()))
);

create policy "DLQ: insert own gym"
on public.dead_letter_messages for insert to authenticated
with check (
  gym_id = (select p.gym_id from public.profiles p where p.user_id = (select auth.uid()))
);

create policy "DLQ: delete own gym" -- Allow retry logic to delete or archive
on public.dead_letter_messages for delete to authenticated
using (
  gym_id = (select p.gym_id from public.profiles p where p.user_id = (select auth.uid()))
);
