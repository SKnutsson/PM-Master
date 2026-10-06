ALTER TABLE public.crm_quotes ADD COLUMN IF NOT EXISTS status_changed_at timestamptz;
CREATE OR REPLACE FUNCTION public.crm_track_status_change() RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN NEW.status_changed_at := COALESCE(NEW.status_changed_at, now());
  ELSIF NEW.status IS DISTINCT FROM OLD.status THEN NEW.status_changed_at := now();
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS crm_quotes_status_changed ON public.crm_quotes;
CREATE TRIGGER crm_quotes_status_changed BEFORE INSERT OR UPDATE ON public.crm_quotes FOR EACH ROW EXECUTE FUNCTION public.crm_track_status_change();

DROP POLICY IF EXISTS prr_select ON public.project_review_rows;
DROP POLICY IF EXISTS prr_insert ON public.project_review_rows;
DROP POLICY IF EXISTS prr_update ON public.project_review_rows;
DROP POLICY IF EXISTS prr_delete ON public.project_review_rows;
CREATE POLICY prr_select ON public.project_review_rows FOR SELECT TO authenticated USING (public.has_workspace_profile(auth.uid()));
CREATE POLICY prr_insert ON public.project_review_rows FOR INSERT TO authenticated WITH CHECK (public.has_workspace_profile(auth.uid()));
CREATE POLICY prr_update ON public.project_review_rows FOR UPDATE TO authenticated USING (public.has_workspace_profile(auth.uid())) WITH CHECK (public.has_workspace_profile(auth.uid()));
CREATE POLICY prr_delete ON public.project_review_rows FOR DELETE TO authenticated USING (public.has_workspace_profile(auth.uid()));

DROP POLICY IF EXISTS "Authenticated users can read lifecycle_items" ON public.lifecycle_items;
DROP POLICY IF EXISTS "Authenticated users can insert lifecycle_items" ON public.lifecycle_items;
DROP POLICY IF EXISTS "Authenticated users can update lifecycle_items" ON public.lifecycle_items;
DROP POLICY IF EXISTS "Authenticated users can delete lifecycle_items" ON public.lifecycle_items;
CREATE POLICY "Workspace read lifecycle_items" ON public.lifecycle_items FOR SELECT TO authenticated USING (public.has_workspace_profile(auth.uid()));
CREATE POLICY "Workspace insert lifecycle_items" ON public.lifecycle_items FOR INSERT TO authenticated WITH CHECK (public.has_workspace_profile(auth.uid()));
CREATE POLICY "Workspace update lifecycle_items" ON public.lifecycle_items FOR UPDATE TO authenticated USING (public.has_workspace_profile(auth.uid())) WITH CHECK (public.has_workspace_profile(auth.uid()));
CREATE POLICY "Workspace delete lifecycle_items" ON public.lifecycle_items FOR DELETE TO authenticated USING (public.has_workspace_profile(auth.uid()));

DROP POLICY IF EXISTS "auth read crm_customers" ON public.crm_customers;
DROP POLICY IF EXISTS "auth insert crm_customers" ON public.crm_customers;
DROP POLICY IF EXISTS "auth update crm_customers" ON public.crm_customers;
DROP POLICY IF EXISTS "auth delete crm_customers" ON public.crm_customers;
CREATE POLICY "crm read crm_customers" ON public.crm_customers FOR SELECT TO authenticated USING (public.can_access_crm(auth.uid()));
CREATE POLICY "crm insert crm_customers" ON public.crm_customers FOR INSERT TO authenticated WITH CHECK (public.can_access_crm(auth.uid()));
CREATE POLICY "crm update crm_customers" ON public.crm_customers FOR UPDATE TO authenticated USING (public.can_access_crm(auth.uid())) WITH CHECK (public.can_access_crm(auth.uid()));
CREATE POLICY "crm delete crm_customers" ON public.crm_customers FOR DELETE TO authenticated USING (public.can_access_crm(auth.uid()));