CREATE TABLE public.crm_quote_attachments (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 quote_id uuid NOT NULL REFERENCES public.crm_quotes(id) ON DELETE CASCADE,
 name text NOT NULL,
 path text NOT NULL UNIQUE,
 size bigint,
 created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.crm_quote_attachments TO authenticated;
GRANT ALL ON public.crm_quote_attachments TO service_role;
ALTER TABLE public.crm_quote_attachments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "CRM members manage quote attachments" ON public.crm_quote_attachments FOR ALL TO authenticated USING (public.can_access_crm(auth.uid())) WITH CHECK (public.can_access_crm(auth.uid()));
CREATE INDEX crm_quote_attachments_quote_idx ON public.crm_quote_attachments(quote_id);
INSERT INTO public.crm_quote_attachments(quote_id,name,path) SELECT id,coalesce(pdf_name,'Offert.pdf'),pdf_path FROM public.crm_quotes WHERE pdf_path IS NOT NULL AND pdf_path <> '' ON CONFLICT(path) DO NOTHING;
ALTER POLICY "Authenticated can read quote pdfs" ON storage.objects TO authenticated USING (bucket_id='quote-pdfs' AND public.can_access_crm(auth.uid()));
ALTER POLICY "Authenticated can upload quote pdfs" ON storage.objects TO authenticated WITH CHECK (bucket_id='quote-pdfs' AND public.can_access_crm(auth.uid()));
ALTER POLICY "Authenticated can update quote pdfs" ON storage.objects TO authenticated USING (bucket_id='quote-pdfs' AND public.can_access_crm(auth.uid())) WITH CHECK (bucket_id='quote-pdfs' AND public.can_access_crm(auth.uid()));
ALTER POLICY "Authenticated can delete quote pdfs" ON storage.objects TO authenticated USING (bucket_id='quote-pdfs' AND public.can_access_crm(auth.uid()));