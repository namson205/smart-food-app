BEGIN;

ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS email TEXT,
    ADD COLUMN IF NOT EXISTS phone TEXT;

UPDATE public.profiles AS profile
SET email = auth_user.email
FROM auth.users AS auth_user
WHERE profile.id = auth_user.id
  AND profile.email IS NULL
  AND auth_user.email IS NOT NULL;

COMMIT;
