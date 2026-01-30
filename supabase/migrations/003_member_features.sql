-- supabase/migrations/003_member_features.sql

create table if not exists public.member_features (
  id uuid primary key default gen_random_uuid(),

  gym_id uuid not null,
  member_id text not null,

  "Gender" int not null,
  "Near_Location" int not null,
  "Partner" int not null,
  "Promo_friends" int not null,
  "Phone" int not null,
  "Age" int not null,
  "Lifetime_Tenure" int not null,
  "Contract_period" int not null,
  "Month_to_end_contract" int not null,
  "Group_visits" int not null,
  "Avg_class_frequency_total" double precision not null,
  "Avg_class_frequency_current_month" double precision not null,
  "Avg_additional_charges_total" double precision not null,
  "Days_Since_Last_Visit" int not null,

  "Month_1" int not null,
  "Month_2" int not null,
  "Month_3" int not null,
  "Month_4" int not null,
  "Month_5" int not null,
  "Month_6" int not null,
  "Month_7" int not null,
  "Month_8" int not null,
  "Month_9" int not null,
  "Month_10" int not null,
  "Month_11" int not null,
  "Month_12" int not null,
  "Month_13" int not null,

  updated_at timestamptz not null default now(),

  constraint member_features_gym_member_unique unique (gym_id, member_id)
);
