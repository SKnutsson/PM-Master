
-- Add name, item_type, sort_order to project_budget_lines so they are independent of template items
ALTER TABLE public.project_budget_lines
  ADD COLUMN IF NOT EXISTS name text,
  ADD COLUMN IF NOT EXISTS item_type text NOT NULL DEFAULT 'Kostnad',
  ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 0;

-- Make template_item_id nullable
ALTER TABLE public.project_budget_lines
  ALTER COLUMN template_item_id DROP NOT NULL;

-- Copy existing data from template items
UPDATE public.project_budget_lines bl
SET
  name = fti.name,
  item_type = fti.item_type,
  sort_order = fti.sort_order
FROM public.finance_template_items fti
WHERE bl.template_item_id = fti.id;

-- Set name to NOT NULL after populating (with a default for safety)
UPDATE public.project_budget_lines SET name = 'Okänd post' WHERE name IS NULL;
ALTER TABLE public.project_budget_lines ALTER COLUMN name SET NOT NULL;
ALTER TABLE public.project_budget_lines ALTER COLUMN name SET DEFAULT '';
