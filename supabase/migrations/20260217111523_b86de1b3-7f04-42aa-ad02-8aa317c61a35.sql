
-- Add sort_order column to activities for custom ordering within projects
ALTER TABLE public.activities ADD COLUMN sort_order integer DEFAULT 0;

-- Initialize sort_order based on current created_at order within each project
WITH ordered AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY project_id ORDER BY created_at ASC) as rn
  FROM public.activities
)
UPDATE public.activities SET sort_order = ordered.rn
FROM ordered WHERE public.activities.id = ordered.id;
