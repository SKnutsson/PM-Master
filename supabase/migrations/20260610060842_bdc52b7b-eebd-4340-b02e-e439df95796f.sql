
-- Buckets per user (Trello-style columns)
CREATE TABLE public.task_buckets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  owner_id UUID NOT NULL,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  color TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- One project-bucket per (owner, project)
CREATE UNIQUE INDEX task_buckets_owner_project_unique
  ON public.task_buckets (owner_id, project_id)
  WHERE project_id IS NOT NULL;

CREATE INDEX idx_task_buckets_owner ON public.task_buckets(owner_id);
CREATE INDEX idx_task_buckets_project ON public.task_buckets(project_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.task_buckets TO authenticated;
GRANT ALL ON public.task_buckets TO service_role;

ALTER TABLE public.task_buckets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read task_buckets" ON public.task_buckets FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert task_buckets" ON public.task_buckets FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update task_buckets" ON public.task_buckets FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated can delete task_buckets" ON public.task_buckets FOR DELETE TO authenticated USING (true);

CREATE TRIGGER update_task_buckets_updated_at
BEFORE UPDATE ON public.task_buckets
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Extend tasks
ALTER TABLE public.tasks
  ADD COLUMN bucket_id UUID REFERENCES public.task_buckets(id) ON DELETE SET NULL,
  ADD COLUMN owner_id UUID,
  ADD COLUMN assigned_to UUID,
  ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN completed_at TIMESTAMPTZ;

CREATE INDEX idx_tasks_bucket ON public.tasks(bucket_id);
CREATE INDEX idx_tasks_owner ON public.tasks(owner_id);
CREATE INDEX idx_tasks_assigned ON public.tasks(assigned_to);
CREATE INDEX idx_tasks_project ON public.tasks(project_id);

-- Backfill owner_id from created_by for existing rows so they don't get orphaned
UPDATE public.tasks SET owner_id = created_by WHERE owner_id IS NULL;
