-- 1. Create member_import_jobs table
CREATE TABLE IF NOT EXISTS public.member_import_jobs (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    gym_id uuid NOT NULL REFERENCES public.gyms(id) ON DELETE CASCADE,
    created_by_user_id uuid REFERENCES auth.users(id), -- Nullable if system/n8n created? Or n8n uses a user/service role. Let's make nullable to be safe for automated jobs.
    source_type text NOT NULL CHECK (source_type IN ('csv', 'google_sheets')),
    import_type text NOT NULL CHECK (import_type IN ('members', 'member_features')),
    status text NOT NULL DEFAULT 'created' CHECK (status IN ('created', 'uploaded', 'validated', 'imported', 'failed')),
    error_summary text,
    created_at timestamptz DEFAULT now()
);

-- 2. Create member_import_rows table (for CSV row validation)
CREATE TABLE IF NOT EXISTS public.member_import_rows (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    gym_id uuid NOT NULL REFERENCES public.gyms(id) ON DELETE CASCADE,
    import_job_id uuid NOT NULL REFERENCES public.member_import_jobs(id) ON DELETE CASCADE,
    row_number int NOT NULL,
    raw_row jsonb NOT NULL,
    is_valid boolean DEFAULT false,
    error_message text,
    created_at timestamptz DEFAULT now()
);

-- 3. Create gym_data_sources table (for Google Sheets config)
CREATE TABLE IF NOT EXISTS public.gym_data_sources (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    gym_id uuid NOT NULL REFERENCES public.gyms(id) ON DELETE CASCADE,
    source_type text NOT NULL CHECK (source_type IN ('csv', 'google_sheets')),
    google_sheet_spreadsheet_id text,
    google_sheet_tab_name text,
    google_sheet_range text,
    import_type text NOT NULL CHECK (import_type IN ('members', 'member_features')),
    is_active boolean DEFAULT true,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- 4. Indexes for performance
CREATE INDEX IF NOT EXISTS idx_member_import_jobs_gym_id ON public.member_import_jobs(gym_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_member_import_rows_job_id_row_num ON public.member_import_rows(import_job_id, row_number);
CREATE INDEX IF NOT EXISTS idx_gym_data_sources_gym_id ON public.gym_data_sources(gym_id);

-- 5. Enable RLS
ALTER TABLE public.member_import_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.member_import_rows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gym_data_sources ENABLE ROW LEVEL SECURITY;

-- 6. RLS Policies

-- Import Jobs
CREATE POLICY "Access import_jobs: Owner own gym OR Admin all" ON public.member_import_jobs
FOR ALL TO authenticated
USING (
  (gym_id IN (
      SELECT id FROM public.gyms WHERE owner_id = auth.uid()
  ))
  OR 
  (private.is_admin())
);

-- Import Rows
CREATE POLICY "Access import_rows: Owner own gym OR Admin all" ON public.member_import_rows
FOR ALL TO authenticated
USING (
  (gym_id IN (
      SELECT id FROM public.gyms WHERE owner_id = auth.uid()
  ))
  OR 
  (private.is_admin())
);

-- Data Sources
CREATE POLICY "Access data_sources: Owner own gym OR Admin all" ON public.gym_data_sources
FOR ALL TO authenticated
USING (
  (gym_id IN (
      SELECT id FROM public.gyms WHERE owner_id = auth.uid()
  ))
  OR 
  (private.is_admin())
);
