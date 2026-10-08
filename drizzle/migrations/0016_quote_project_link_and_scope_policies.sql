ALTER TABLE public.crm_quotes ADD COLUMN IF NOT EXISTS project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS crm_quotes_project_id_idx ON public.crm_quotes(project_id);

REVOKE ALL ON public.service_contracts, public.project_review_events, public.crm_contacts FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.service_contracts, public.crm_contacts TO authenticated;
GRANT SELECT, INSERT ON public.project_review_events TO authenticated;
GRANT ALL ON public.service_contracts, public.project_review_events, public.crm_contacts TO service_role;

ALTER POLICY "auth delete service_contracts" ON public.service_contracts TO authenticated USING (public.has_workspace_profile(auth.uid()));
ALTER POLICY "auth insert service_contracts" ON public.service_contracts TO authenticated WITH CHECK (public.has_workspace_profile(auth.uid()));
ALTER POLICY "auth read service_contracts" ON public.service_contracts TO authenticated USING (public.has_workspace_profile(auth.uid()));
ALTER POLICY "auth update service_contracts" ON public.service_contracts TO authenticated USING (public.has_workspace_profile(auth.uid())) WITH CHECK (public.has_workspace_profile(auth.uid()));

ALTER POLICY pre_insert ON public.project_review_events TO authenticated WITH CHECK (public.has_workspace_profile(auth.uid()) AND (actor IS NULL OR actor = auth.uid()));
ALTER POLICY pre_select ON public.project_review_events TO authenticated USING (public.has_workspace_profile(auth.uid()));

ALTER POLICY "auth delete crm_contacts" ON public.crm_contacts TO authenticated USING (public.can_access_crm(auth.uid()));
ALTER POLICY "auth insert crm_contacts" ON public.crm_contacts TO authenticated WITH CHECK (public.can_access_crm(auth.uid()));
ALTER POLICY "auth read crm_contacts" ON public.crm_contacts TO authenticated USING (public.can_access_crm(auth.uid()));
ALTER POLICY "auth update crm_contacts" ON public.crm_contacts TO authenticated USING (public.can_access_crm(auth.uid())) WITH CHECK (public.can_access_crm(auth.uid()));