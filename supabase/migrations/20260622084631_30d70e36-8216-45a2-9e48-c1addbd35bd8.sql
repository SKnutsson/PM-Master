
CREATE OR REPLACE FUNCTION public.prevent_profile_privilege_escalation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.has_role(auth.uid(), 'admin') THEN
    RETURN NEW;
  END IF;
  IF NEW.can_access_crm IS DISTINCT FROM OLD.can_access_crm THEN
    RAISE EXCEPTION 'Only admins can change can_access_crm';
  END IF;
  IF NEW.linked_salesperson IS DISTINCT FROM OLD.linked_salesperson THEN
    RAISE EXCEPTION 'Only admins can change linked_salesperson';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_profile_privilege_escalation_trg ON public.profiles;
CREATE TRIGGER prevent_profile_privilege_escalation_trg
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.prevent_profile_privilege_escalation();
