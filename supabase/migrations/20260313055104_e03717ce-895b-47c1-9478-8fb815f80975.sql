
-- Lifecycle phases and milestones (nodes in the flow)
CREATE TABLE public.lifecycle_nodes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  node_type text NOT NULL DEFAULT 'phase', -- 'phase' or 'milestone'
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Items belonging to each node (sub-tasks, documents, etc.)
CREATE TABLE public.lifecycle_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  node_id uuid NOT NULL REFERENCES public.lifecycle_nodes(id) ON DELETE CASCADE,
  text text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.lifecycle_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lifecycle_items ENABLE ROW LEVEL SECURITY;

-- RLS policies for lifecycle_nodes
CREATE POLICY "Authenticated users can read lifecycle_nodes" ON public.lifecycle_nodes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert lifecycle_nodes" ON public.lifecycle_nodes FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update lifecycle_nodes" ON public.lifecycle_nodes FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete lifecycle_nodes" ON public.lifecycle_nodes FOR DELETE TO authenticated USING (true);

-- RLS policies for lifecycle_items
CREATE POLICY "Authenticated users can read lifecycle_items" ON public.lifecycle_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert lifecycle_items" ON public.lifecycle_items FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update lifecycle_items" ON public.lifecycle_items FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete lifecycle_items" ON public.lifecycle_items FOR DELETE TO authenticated USING (true);

-- Seed default lifecycle data based on the reference image
INSERT INTO public.lifecycle_nodes (name, node_type, sort_order) VALUES
  ('Förstudie', 'phase', 1),
  ('Avtal godkänt', 'milestone', 2),
  ('Projektstart och Konstruktion', 'phase', 3),
  ('Klar för produktion', 'milestone', 4),
  ('Produktion', 'phase', 5),
  ('Klar för montage', 'milestone', 6),
  ('Montage', 'phase', 7),
  ('Godkänd besiktning', 'milestone', 8),
  ('Avslut', 'phase', 9);

-- Seed items for each phase
INSERT INTO public.lifecycle_items (node_id, text, sort_order)
SELECT id, unnest, row_number() OVER () FROM public.lifecycle_nodes, unnest(
  CASE name
    WHEN 'Förstudie' THEN ARRAY['Granskning AB/ABT', 'Kalkylering', 'Internt godkännande']
    WHEN 'Projektstart och Konstruktion' THEN ARRAY['Projekt- och konstruktionsgenomgång', 'Ganttschema', 'Dokumentationsplan']
    WHEN 'Produktion' THEN ARRAY['Resursplanering', 'Produktionsuppföljning', 'Leveransbevakning']
    WHEN 'Montage' THEN ARRAY['Montagegenomgång', 'Etablering och installation', 'Egenkontroller och funktionstest']
    WHEN 'Avslut' THEN ARRAY['Slutfakturering', 'Slutdokumentation', 'Ekonomisk slutavstämning', 'Projektutvärdering']
    ELSE ARRAY[]::text[]
  END
) WHERE node_type = 'phase';
