-- Recreate policies on previously-public tables, scoped to authenticated
DO $$
DECLARE
  t text;
  p record;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'installers','forecast_events','resource_estimations','project_resource_allocations',
    'documentation_items','daily_resource_entries','sales_targets','project_installers'
  ])
  LOOP
    FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename=t
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', p.policyname, t);
    END LOOP;
  END LOOP;
END $$;

-- installers
CREATE POLICY "Authenticated can read installers" ON public.installers FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert installers" ON public.installers FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update installers" ON public.installers FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated can delete installers" ON public.installers FOR DELETE TO authenticated USING (true);

-- forecast_events (no UPDATE policy originally)
CREATE POLICY "Authenticated can read forecast_events" ON public.forecast_events FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert forecast_events" ON public.forecast_events FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can delete forecast_events" ON public.forecast_events FOR DELETE TO authenticated USING (true);

-- resource_estimations
CREATE POLICY "Authenticated can read resource_estimations" ON public.resource_estimations FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert resource_estimations" ON public.resource_estimations FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update resource_estimations" ON public.resource_estimations FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated can delete resource_estimations" ON public.resource_estimations FOR DELETE TO authenticated USING (true);

-- project_resource_allocations
CREATE POLICY "Authenticated can read allocations" ON public.project_resource_allocations FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert allocations" ON public.project_resource_allocations FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update allocations" ON public.project_resource_allocations FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated can delete allocations" ON public.project_resource_allocations FOR DELETE TO authenticated USING (true);

-- documentation_items
CREATE POLICY "Authenticated can read documentation_items" ON public.documentation_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert documentation_items" ON public.documentation_items FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update documentation_items" ON public.documentation_items FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated can delete documentation_items" ON public.documentation_items FOR DELETE TO authenticated USING (true);

-- daily_resource_entries
CREATE POLICY "Authenticated can read daily_resource_entries" ON public.daily_resource_entries FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert daily_resource_entries" ON public.daily_resource_entries FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update daily_resource_entries" ON public.daily_resource_entries FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated can delete daily_resource_entries" ON public.daily_resource_entries FOR DELETE TO authenticated USING (true);

-- sales_targets
CREATE POLICY "Authenticated can read sales_targets" ON public.sales_targets FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert sales_targets" ON public.sales_targets FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update sales_targets" ON public.sales_targets FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated can delete sales_targets" ON public.sales_targets FOR DELETE TO authenticated USING (true);

-- project_installers
CREATE POLICY "Authenticated can read project_installers" ON public.project_installers FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert project_installers" ON public.project_installers FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update project_installers" ON public.project_installers FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated can delete project_installers" ON public.project_installers FOR DELETE TO authenticated USING (true);

-- Revoke EXECUTE on SECURITY DEFINER functions from anon role
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT n.nspname, p.proname, pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prosecdef = true
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %I.%I(%s) FROM anon, public', r.nspname, r.proname, r.args);
  END LOOP;
END $$;