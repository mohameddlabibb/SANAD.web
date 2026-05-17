-- Backfill emails for profiles that were created without one (admin-created users)
UPDATE public.profiles p
SET email = a.email
FROM auth.users a
WHERE p.id = a.id
  AND (p.email IS NULL OR p.email = '');

-- Fix the trigger so future users always get their email saved
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role, national_id)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', ''),
    'user',
    NULLIF(COALESCE(new.raw_user_meta_data->>'national_id', ''), '')
  );
  RETURN new;
END;
$$;
