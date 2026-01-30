-- supabase/migrations/006_campaigns.sql

-- 1) Campaigns: tracks the overall mass outreach effort
create table if not exists public.campaigns (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null,
  type text not null default 'mass_risk_outreach',
  score_threshold double precision not null default 70.0,
  status text not null default 'draft', -- draft, running, completed, failed
  total_recipients int not null default 0,
  processed_count int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists campaigns_gym_id_idx on public.campaigns(gym_id);

alter table public.campaigns enable row level security;

-- 2) Campaign Recipients: individual send jobs per member per channel
create table if not exists public.campaign_recipients (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null,
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  member_id text not null,
  channel text not null, -- 'sms' or 'email'
  status text not null default 'queued', -- queued, sent, failed, skipped_opted_out
  provider_message_id text null, -- filtered back from message_sends if needed, or just link via member/time
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  
  -- Prevent duplicates: one send per member per channel per campaign
  constraint campaign_recipients_unique unique (campaign_id, member_id, channel),
  constraint campaign_recipients_channel_check check (channel in ('sms','email'))
);

create index if not exists campaign_recipients_campaign_idx on public.campaign_recipients(campaign_id);
create index if not exists campaign_recipients_status_idx on public.campaign_recipients(status);

alter table public.campaign_recipients enable row level security;

-- RLS Policies

-- Campaigns policies
create policy "Campaigns: select own gym"
on public.campaigns for select to authenticated
using (
  gym_id = (select p.gym_id from public.profiles p where p.user_id = (select auth.uid()))
);

create policy "Campaigns: insert own gym"
on public.campaigns for insert to authenticated
with check (
  gym_id = (select p.gym_id from public.profiles p where p.user_id = (select auth.uid()))
);

create policy "Campaigns: update own gym"
on public.campaigns for update to authenticated
using (
  gym_id = (select p.gym_id from public.profiles p where p.user_id = (select auth.uid()))
)
with check (
  gym_id = (select p.gym_id from public.profiles p where p.user_id = (select auth.uid()))
);

-- Recipients policies (mostly read by UI, written by API)
create policy "Campaign Recipients: select own gym"
on public.campaign_recipients for select to authenticated
using (
  gym_id = (select p.gym_id from public.profiles p where p.user_id = (select auth.uid()))
);

create policy "Campaign Recipients: insert own gym"
on public.campaign_recipients for insert to authenticated
with check (
  gym_id = (select p.gym_id from public.profiles p where p.user_id = (select auth.uid()))
);

create policy "Campaign Recipients: update own gym"
on public.campaign_recipients for update to authenticated
using (
  gym_id = (select p.gym_id from public.profiles p where p.user_id = (select auth.uid()))
)
with check (
  gym_id = (select p.gym_id from public.profiles p where p.user_id = (select auth.uid()))
);
