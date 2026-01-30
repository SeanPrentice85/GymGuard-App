-- Create gyms table
CREATE TABLE IF NOT EXISTS public.gyms (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    name text NOT NULL,
    owner_id uuid, -- Nullable for now if auth not fully set
    created_at timestamptz DEFAULT now()
);

-- Enable RLS on gyms
ALTER TABLE public.gyms ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable read/write for all users" ON public.gyms;
CREATE POLICY "Enable read/write for all users" ON public.gyms FOR ALL USING (true);

-- Create members table if not exists with all 27 features
CREATE TABLE IF NOT EXISTS public.members (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    gym_id uuid,
    first_name text,
    last_name text,
    email text,
    phone text,
    
    -- Churn Score
    last_churn_score float,
    is_high_risk boolean generated always as (last_churn_score >= 70) stored,
    
    -- 27 Features
    gender text,
    near_location boolean,
    partner boolean,
    promo_friends boolean,
    age int,
    lifetime_tenure float,
    contract_period int,
    month_to_end_contract int,
    group_visits boolean,
    avg_class_frequency_total float,
    avg_class_frequency_current_month float,
    avg_additional_charges_total float,
    days_since_last_visit int,
    
    -- Monthly frequency history
    month_1 float,
    month_2 float,
    month_3 float,
    month_4 float,
    month_5 float,
    month_6 float,
    month_7 float,
    month_8 float,
    month_9 float,
    month_10 float,
    month_11 float,
    month_12 float,
    month_13 float,
    
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable read/write for all users" ON public.members;
CREATE POLICY "Enable read/write for all users" ON public.members FOR ALL USING (true);

-- Create Model Monitoring Tables (Required for Dashboard)
CREATE TABLE IF NOT EXISTS public.model_monitor_runs (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    run_date date DEFAULT CURRENT_DATE,
    status text, -- 'OK', 'WARN', 'ERROR'
    output_drift_score float,
    data_quality_score float,
    created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.model_monitor_feature_stats (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    run_id uuid REFERENCES public.model_monitor_runs(id),
    feature_name text,
    null_count int,
    mean_value float,
    min_value float,
    max_value float,
    created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.model_monitor_score_stats (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    run_id uuid REFERENCES public.model_monitor_runs(id),
    total_scored int,
    mean_score float,
    p90_score float,
    high_risk_count int,
    created_at timestamptz DEFAULT now()
);

-- RLS for Monitoring
ALTER TABLE public.model_monitor_runs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable read/write for all users" ON public.model_monitor_runs;
CREATE POLICY "Enable read/write for all users" ON public.model_monitor_runs FOR ALL USING (true);

ALTER TABLE public.model_monitor_feature_stats ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable read/write for all users" ON public.model_monitor_feature_stats;
CREATE POLICY "Enable read/write for all users" ON public.model_monitor_feature_stats FOR ALL USING (true);

ALTER TABLE public.model_monitor_score_stats ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable read/write for all users" ON public.model_monitor_score_stats;
CREATE POLICY "Enable read/write for all users" ON public.model_monitor_score_stats FOR ALL USING (true);

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
