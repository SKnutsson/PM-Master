CREATE OR REPLACE FUNCTION public.can_access_crm(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE user_id = _user_id
      AND can_access_crm = true
  ) OR public.has_role(_user_id, 'admin');
$$;

REVOKE ALL ON FUNCTION public.can_access_crm(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_access_crm(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_access_crm(uuid) TO service_role;

DROP POLICY IF EXISTS "auth read crm_quotes" ON public.crm_quotes;
DROP POLICY IF EXISTS "auth insert crm_quotes" ON public.crm_quotes;
DROP POLICY IF EXISTS "auth update crm_quotes" ON public.crm_quotes;
DROP POLICY IF EXISTS "auth delete crm_quotes" ON public.crm_quotes;

CREATE POLICY "CRM users can read quotes"
ON public.crm_quotes FOR SELECT TO authenticated
USING (public.can_access_crm(auth.uid()));
CREATE POLICY "CRM users can insert quotes"
ON public.crm_quotes FOR INSERT TO authenticated
WITH CHECK (public.can_access_crm(auth.uid()));
CREATE POLICY "CRM users can update quotes"
ON public.crm_quotes FOR UPDATE TO authenticated
USING (public.can_access_crm(auth.uid()))
WITH CHECK (public.can_access_crm(auth.uid()));
CREATE POLICY "CRM users can delete quotes"
ON public.crm_quotes FOR DELETE TO authenticated
USING (public.can_access_crm(auth.uid()));

DROP POLICY IF EXISTS "Authenticated users can read schedule_history" ON public.schedule_history;
DROP POLICY IF EXISTS "Authenticated users can insert schedule_history" ON public.schedule_history;
DROP POLICY IF EXISTS "Authenticated users can update schedule_history" ON public.schedule_history;
DROP POLICY IF EXISTS "Authenticated users can delete schedule_history" ON public.schedule_history;

CREATE POLICY "CRM users can read schedule history"
ON public.schedule_history FOR SELECT TO authenticated
USING (public.can_access_crm(auth.uid()));
CREATE POLICY "CRM users can insert schedule history"
ON public.schedule_history FOR INSERT TO authenticated
WITH CHECK (public.can_access_crm(auth.uid()));
CREATE POLICY "CRM users can update schedule history"
ON public.schedule_history FOR UPDATE TO authenticated
USING (public.can_access_crm(auth.uid()))
WITH CHECK (public.can_access_crm(auth.uid()));
CREATE POLICY "CRM users can delete schedule history"
ON public.schedule_history FOR DELETE TO authenticated
USING (public.can_access_crm(auth.uid()));

DROP POLICY IF EXISTS "project_reviews_select" ON public.project_reviews;
DROP POLICY IF EXISTS "project_reviews_insert" ON public.project_reviews;
DROP POLICY IF EXISTS "project_reviews_update" ON public.project_reviews;

CREATE POLICY "Workspace users can read project reviews"
ON public.project_reviews FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.user_id = auth.uid()));
CREATE POLICY "Workspace users can insert project reviews"
ON public.project_reviews FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles WHERE profiles.user_id = auth.uid())
  AND created_by = auth.uid()
);
CREATE POLICY "Workspace users can update project reviews"
ON public.project_reviews FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.user_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.user_id = auth.uid()));