
-- Allow admins to update any profile
CREATE POLICY "Admins can update all profiles"
ON public.profiles
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Insert admin roles for the two specified email addresses
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::app_role FROM auth.users 
WHERE email IN ('samuel.knutsson@alfing.se', 'samuel.knutsson11@gmail.com')
ON CONFLICT (user_id, role) DO NOTHING;
