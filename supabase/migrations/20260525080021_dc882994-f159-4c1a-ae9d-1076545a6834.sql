
-- ÄTA-hantering
CREATE TABLE public.ata_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL,
  title text NOT NULL DEFAULT '',
  description text DEFAULT '',
  ata_type text DEFAULT '',
  amount numeric NOT NULL DEFAULT 0,
  hours numeric NOT NULL DEFAULT 0,
  material_cost numeric NOT NULL DEFAULT 0,
  date date,
  status text NOT NULL DEFAULT 'Ej skickad',
  attachments jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.ata_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ata_id uuid NOT NULL,
  event text NOT NULL,
  from_value text,
  to_value text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ata_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ata_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth read ata" ON public.ata_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth insert ata" ON public.ata_items FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth update ata" ON public.ata_items FOR UPDATE TO authenticated USING (true);
CREATE POLICY "auth delete ata" ON public.ata_items FOR DELETE TO authenticated USING (true);

CREATE POLICY "auth read ata_ev" ON public.ata_events FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth insert ata_ev" ON public.ata_events FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth delete ata_ev" ON public.ata_events FOR DELETE TO authenticated USING (true);

CREATE TRIGGER trg_ata_items_updated
BEFORE UPDATE ON public.ata_items
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('ata-attachments', 'ata-attachments', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "ata read" ON storage.objects FOR SELECT USING (bucket_id = 'ata-attachments');
CREATE POLICY "ata insert" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'ata-attachments');
CREATE POLICY "ata update" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'ata-attachments');
CREATE POLICY "ata delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'ata-attachments');
