ALTER TABLE public.schedule_history
  ADD COLUMN IF NOT EXISTS original_year INTEGER,
  ADD COLUMN IF NOT EXISTS new_year INTEGER;