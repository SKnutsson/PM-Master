ALTER TABLE public.crm_quotes
  ADD COLUMN source_updated_date date;

COMMENT ON COLUMN public.crm_quotes.source_updated_date IS 'Original update date imported from the legacy CRM export.';