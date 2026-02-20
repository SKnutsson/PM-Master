ALTER TABLE public.activities ADD COLUMN phase text DEFAULT NULL;
-- phase can be: 'Konstruktion', 'Produktion', 'Montage' or NULL