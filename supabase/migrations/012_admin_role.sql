-- 1. Add role column to profiles
ALTER TABLE public.profiles 
ADD COLUMN role text NOT NULL DEFAULT 'gym_owner' 
CHECK (role IN ('gym_owner', 'admin'));

-- 2. Create private schema helper for secure role checking
CREATE SCHEMA IF NOT EXISTS private;

CREATE OR REPLACE FUNCTION private.is_admin()
RETURNS boolean AS $$
SELECT EXISTS (
  SELECT 1 FROM public.profiles
  WHERE user_id = auth.uid()
  AND role = 'admin'
);
$$ LANGUAGE sql SECURITY DEFINER;

-- 3. Update RLS Policies to allow Admin override

-- Gyms: Admin sees all, Owner sees own
DROP POLICY IF EXISTS "Gym owners can view their own gym" ON public.gyms;
CREATE POLICY "Gym owners view own, Admins view all" ON public.gyms
FOR SELECT TO authenticated
USING (
  (owner_id = auth.uid()) 
  OR 
  (private.is_admin())
);

-- Members
DROP POLICY IF EXISTS "Gym owners can view members of their gym" ON public.members;
DROP POLICY IF EXISTS "Gym owners can update members of their gym" ON public.members;
DROP POLICY IF EXISTS "Gym owners can insert members to their gym" ON public.members;

CREATE POLICY "Access members: Owner own gym OR Admin all" ON public.members
FOR ALL TO authenticated
USING (
  (gym_id IN (
    SELECT id FROM public.gyms WHERE owner_id = auth.uid()
  ))
  OR 
  (private.is_admin())
);

-- Campaigns
DROP POLICY IF EXISTS "Gym owners manage their own campaigns" ON public.campaigns;
CREATE POLICY "Access campaigns: Owner own gym OR Admin all" ON public.campaigns
FOR ALL TO authenticated
USING (
  (gym_id IN (
      SELECT id FROM public.gyms WHERE owner_id = auth.uid()
  ))
  OR 
  (private.is_admin())
);

-- Audit Logs
DROP POLICY IF EXISTS "Gym owners view their own audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Service role inserts audit logs" ON public.audit_logs; 
-- (Service role inserts bypass RLS anyway, but for SELECT we need policy)

CREATE POLICY "Access audit_logs: Owner own gym OR Admin all" ON public.audit_logs
FOR SELECT TO authenticated
USING (
  (gym_id IN (
      SELECT id FROM public.gyms WHERE owner_id = auth.uid()
  ))
  OR 
  (private.is_admin())
);

-- Ensure Insert is still allowed (usually handled by service role in API, but if we do client side inserts...)
-- Actually API uses service role for writing audit logs usually, but let's allow authenticated users to view.

-- 4. Enable RLS on profiles if not already (it is), allowing admins to view all profiles potentially?
-- For now, we only need admins to view Aggregates/Gyms.
-- Let's stick to key tables.

-- Engagement/Metrics (if RLS enabled, update them too)
-- gym_daily_metrics
DROP POLICY IF EXISTS "Gym owners view their own metrics" ON public.gym_daily_metrics;
CREATE POLICY "Access metrics: Owner own gym OR Admin all" ON public.gym_daily_metrics
FOR SELECT TO authenticated
USING (
   (gym_id IN (
      SELECT id FROM public.gyms WHERE owner_id = auth.uid()
  ))
  OR 
  (private.is_admin())
);

-- Performance Note: 
-- The subquery `gym_id IN (SELECT id FROM public.gyms WHERE owner_id = auth.uid())` is standard for "gym ownership". 
-- If `gym_id` was on `profiles` directly and trustworthy, we could fail faster, but `gyms` table is the source of truth for ownership.
-- Supabase recommendation: wrap things in (select ...) if possible, but boolean logic is fine here.
-- The private.is_admin() is SECURITY DEFINER so it runs efficiently without RLS recursion.
