-- Add last_contacted_at to members
ALTER TABLE public.members ADD COLUMN IF NOT EXISTS last_contacted_at timestamptz;

-- Create outreach_logs table
CREATE TABLE IF NOT EXISTS public.outreach_logs (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    member_id uuid REFERENCES public.members(id),
    type text NOT NULL CHECK (type IN ('SMS', 'EMAIL')),
    subject text,
    body text,
    sent_at timestamptz DEFAULT now(),
    opened_at timestamptz,
    clicked_at timestamptz,
    
    -- For analytics aggregation
    link_clicks int DEFAULT 0,
    
    created_at timestamptz DEFAULT now()
);

-- RLS
ALTER TABLE public.outreach_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable all for users" ON public.outreach_logs FOR ALL USING (true);

-- Notify schema reload
NOTIFY pgrst, 'reload schema';
