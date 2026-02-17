
-- Add sort_order column to projects for custom ordering in Gantt chart
ALTER TABLE public.projects ADD COLUMN sort_order integer DEFAULT 0;

-- Initialize sort_order based on current created_at order
WITH ordered AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at ASC) as rn
  FROM public.projects
)
UPDATE public.projects SET sort_order = ordered.rn
FROM ordered WHERE public.projects.id = ordered.id;
