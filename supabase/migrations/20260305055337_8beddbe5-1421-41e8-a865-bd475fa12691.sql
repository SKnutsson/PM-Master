
CREATE TABLE public.documentation_items (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  document_type text NOT NULL DEFAULT '',
  deadline date,
  status text NOT NULL DEFAULT 'Ej påbörjad',
  submitted_date date,
  submitted_to text,
  notes text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.documentation_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read documentation_items" ON public.documentation_items FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert documentation_items" ON public.documentation_items FOR INSERT WITH CHECK (true);
CREATE POLICY "Authenticated users can update documentation_items" ON public.documentation_items FOR UPDATE USING (true);
CREATE POLICY "Authenticated users can delete documentation_items" ON public.documentation_items FOR DELETE USING (true);
