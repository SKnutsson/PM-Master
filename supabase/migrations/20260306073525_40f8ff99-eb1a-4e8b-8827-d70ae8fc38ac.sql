ALTER TABLE public.profiles 
ADD COLUMN first_name text,
ADD COLUMN last_name text,
ADD COLUMN phone text,
ADD COLUMN user_role text,
ADD COLUMN avatar_color text DEFAULT '#3b82f6';