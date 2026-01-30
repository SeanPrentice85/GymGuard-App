-- 1. Create model_monitor_runs table
CREATE TABLE IF NOT EXISTS public.model_monitor_runs (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    gym_id uuid NOT NULL REFERENCES public.gyms(id) ON DELETE CASCADE,
    run_date date NOT NULL DEFAULT CURRENT_DATE,
    source text DEFAULT 'n8n',
    status text NOT NULL CHECK (status IN ('ok', 'warn', 'error')),
    notes text,
    created_at timestamptz DEFAULT now()
);

-- 2. Create model_monitor_feature_stats table
CREATE TABLE IF NOT EXISTS public.model_monitor_feature_stats (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    gym_id uuid NOT NULL REFERENCES public.gyms(id) ON DELETE CASCADE,
    run_date date NOT NULL DEFAULT CURRENT_DATE,
    feature_name text NOT NULL,
    count int DEFAULT 0,
    min_value float,
    max_value float,
    mean_value float,
    null_count int DEFAULT 0,
    created_at timestamptz DEFAULT now()
);

-- 3. Create model_monitor_score_stats table
CREATE TABLE IF NOT EXISTS public.model_monitor_score_stats (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    gym_id uuid NOT NULL REFERENCES public.gyms(id) ON DELETE CASCADE,
    run_date date NOT NULL DEFAULT CURRENT_DATE,
    count int DEFAULT 0,
    mean_score float,
    p90_score float,
    high_risk_count int DEFAULT 0,
    created_at timestamptz DEFAULT now()
);

-- 4. Indexes
CREATE INDEX IF NOT EXISTS idx_monitor_runs_gym_date ON public.model_monitor_runs(gym_id, run_date DESC);
CREATE INDEX IF NOT EXISTS idx_monitor_features_gym_date ON public.model_monitor_feature_stats(gym_id, run_date);
CREATE INDEX IF NOT EXISTS idx_monitor_scores_gym_date ON public.model_monitor_score_stats(gym_id, run_date);

-- 5. Enable RLS
ALTER TABLE public.model_monitor_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.model_monitor_feature_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.model_monitor_score_stats ENABLE ROW LEVEL SECURITY;

-- 6. RLS Policies

-- Runs
CREATE POLICY "Access monitor_runs: Owner own gym OR Admin all" ON public.model_monitor_runs
FOR SELECT TO authenticated
USING (
  (gym_id IN (
      SELECT id FROM public.gyms WHERE owner_id = auth.uid()
  ))
  OR 
  (private.is_admin())
);

-- Feature Stats
CREATE POLICY "Access feature_stats: Owner own gym OR Admin all" ON public.model_monitor_feature_stats
FOR SELECT TO authenticated
USING (
  (gym_id IN (
      SELECT id FROM public.gyms WHERE owner_id = auth.uid()
  ))
  OR 
  (private.is_admin())
);

-- Score Stats
CREATE POLICY "Access score_stats: Owner own gym OR Admin all" ON public.model_monitor_score_stats
FOR SELECT TO authenticated
USING (
  (gym_id IN (
      SELECT id FROM public.gyms WHERE owner_id = auth.uid()
  ))
  OR 
  (private.is_admin())
);

-- Allow Insert (Service Role / n8n typically uses service role which bypasses RLS, but if authenticated user inserts?)
-- Usually Monitoring is system generated. We will rely on service role insert.
