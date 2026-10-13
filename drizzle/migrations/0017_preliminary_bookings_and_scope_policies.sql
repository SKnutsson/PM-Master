ALTER TABLE public.daily_resource_entries ADD COLUMN IF NOT EXISTS is_preliminary boolean NOT NULL DEFAULT false;

DROP POLICY IF EXISTS "Authenticated can delete task_buckets" ON public.task_buckets;
DROP POLICY IF EXISTS "Authenticated can update task_buckets" ON public.task_buckets;
DROP POLICY IF EXISTS "Authenticated can insert task_buckets" ON public.task_buckets;
DROP POLICY IF EXISTS "Authenticated can read task_buckets" ON public.task_buckets;
CREATE POLICY "Workspace read task_buckets" ON public.task_buckets FOR SELECT TO authenticated USING (public.has_workspace_profile(auth.uid()));
CREATE POLICY "Workspace insert task_buckets" ON public.task_buckets FOR INSERT TO authenticated WITH CHECK (public.has_workspace_profile(auth.uid()));
CREATE POLICY "Workspace update task_buckets" ON public.task_buckets FOR UPDATE TO authenticated USING (public.has_workspace_profile(auth.uid())) WITH CHECK (public.has_workspace_profile(auth.uid()));
CREATE POLICY "Workspace delete task_buckets" ON public.task_buckets FOR DELETE TO authenticated USING (public.has_workspace_profile(auth.uid()));

DROP POLICY IF EXISTS "Authenticated can delete allocations" ON public.project_resource_allocations;
DROP POLICY IF EXISTS "Authenticated can update allocations" ON public.project_resource_allocations;
DROP POLICY IF EXISTS "Authenticated can insert allocations" ON public.project_resource_allocations;
DROP POLICY IF EXISTS "Authenticated can read allocations" ON public.project_resource_allocations;
CREATE POLICY "Workspace read allocations" ON public.project_resource_allocations FOR SELECT TO authenticated USING (public.has_workspace_profile(auth.uid()));
CREATE POLICY "Workspace insert allocations" ON public.project_resource_allocations FOR INSERT TO authenticated WITH CHECK (public.has_workspace_profile(auth.uid()));
CREATE POLICY "Workspace update allocations" ON public.project_resource_allocations FOR UPDATE TO authenticated USING (public.has_workspace_profile(auth.uid())) WITH CHECK (public.has_workspace_profile(auth.uid()));
CREATE POLICY "Workspace delete allocations" ON public.project_resource_allocations FOR DELETE TO authenticated USING (public.has_workspace_profile(auth.uid()));

DROP POLICY IF EXISTS "pra_delete" ON public.project_review_answers;
DROP POLICY IF EXISTS "pra_update" ON public.project_review_answers;
DROP POLICY IF EXISTS "pra_insert" ON public.project_review_answers;
DROP POLICY IF EXISTS "pra_select" ON public.project_review_answers;
CREATE POLICY "pra_select" ON public.project_review_answers FOR SELECT TO authenticated USING (public.has_workspace_profile(auth.uid()));
CREATE POLICY "pra_insert" ON public.project_review_answers FOR INSERT TO authenticated WITH CHECK (public.has_workspace_profile(auth.uid()));
CREATE POLICY "pra_update" ON public.project_review_answers FOR UPDATE TO authenticated USING (public.has_workspace_profile(auth.uid())) WITH CHECK (public.has_workspace_profile(auth.uid()));
CREATE POLICY "pra_delete" ON public.project_review_answers FOR DELETE TO authenticated USING (public.has_workspace_profile(auth.uid()));

REVOKE ALL ON public.task_buckets, public.project_resource_allocations, public.project_review_answers FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.task_buckets, public.project_resource_allocations, public.project_review_answers TO authenticated;
GRANT ALL ON public.task_buckets, public.project_resource_allocations, public.project_review_answers TO service_role;