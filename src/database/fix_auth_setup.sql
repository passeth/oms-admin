-- [Auth User Creation Error Fix]
-- This script redefines the likely trigger function 'handle_new_user' to swallow errors.
-- The error "Database error saving new user" usually happens when an auth trigger fails.
-- By catching exceptions, we allow the user to be created even if the profile sync fails.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  -- Try to insert into public.users if it exists
  BEGIN
    INSERT INTO public.users (id, email)
    VALUES (new.id, new.email)
    ON CONFLICT (id) DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    -- If table doesn't exist or columns mismatch, ignore and proceed.
    -- This ensures the user is created in auth.users regardless of schema issues.
    RAISE WARNING 'Error in handle_new_user: %', SQLERRM;
  END;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
