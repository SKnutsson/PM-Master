CREATE OR REPLACE FUNCTION public.has_workspace_profile(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT _user_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.profiles WHERE user_id = _user_id) $$;
REVOKE ALL ON FUNCTION public.has_workspace_profile(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_workspace_profile(uuid) TO authenticated, service_role;
REVOKE ALL ON public.project_kpi_metrics, public.service_deviations, public.profiles FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_kpi_metrics, public.service_deviations TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.project_kpi_metrics, public.service_deviations, public.profiles TO service_role;
ALTER POLICY "Authenticated can delete kpi" ON public.project_kpi_metrics USING (public.has_workspace_profile(auth.uid()));
ALTER POLICY "Authenticated can update kpi" ON public.project_kpi_metrics USING (public.has_workspace_profile(auth.uid())) WITH CHECK (public.has_workspace_profile(auth.uid()));
ALTER POLICY "Authenticated can insert kpi" ON public.project_kpi_metrics WITH CHECK (public.has_workspace_profile(auth.uid()));
ALTER POLICY "Authenticated can read kpi" ON public.project_kpi_metrics USING (public.has_workspace_profile(auth.uid()));
ALTER POLICY "auth delete sd" ON public.service_deviations USING (public.has_workspace_profile(auth.uid()));
ALTER POLICY "auth update sd" ON public.service_deviations USING (public.has_workspace_profile(auth.uid())) WITH CHECK (public.has_workspace_profile(auth.uid()));
ALTER POLICY "auth insert sd" ON public.service_deviations WITH CHECK (public.has_workspace_profile(auth.uid()));
ALTER POLICY "auth read sd" ON public.service_deviations USING (public.has_workspace_profile(auth.uid()));
ALTER POLICY "Users can view all profiles" ON public.profiles USING (user_id = auth.uid() OR public.has_workspace_profile(auth.uid()));