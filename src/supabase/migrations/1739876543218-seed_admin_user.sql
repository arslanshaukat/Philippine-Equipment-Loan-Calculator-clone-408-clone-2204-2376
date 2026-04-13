/* 
# Seed Admin User
1. Purpose
  - Creates the official admin account in the Supabase Auth schema.
  - Enables the 'pgcrypto' extension for secure password hashing.
*/

-- Enable the required extension for password hashing
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Insert the user into the auth.users table if they don't exist
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  recovery_sent_at,
  last_sign_in_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
)
SELECT
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'info@gtintl.com.ph',
  crypt('Subic@123', gen_salt('bf')), -- Hashes the password 'Subic@123'
  current_timestamp,
  current_timestamp,
  current_timestamp,
  '{"provider":"email","providers":["email"]}',
  '{}',
  current_timestamp,
  current_timestamp,
  '',
  '',
  '',
  ''
WHERE NOT EXISTS (
    SELECT 1 FROM auth.users WHERE email = 'info@gtintl.com.ph'
);

-- Link the user to the 'email' identity provider
INSERT INTO auth.identities (
  id,
  user_id,
  identity_data,
  provider,
  last_sign_in_at,
  created_at,
  updated_at
)
SELECT
  gen_random_uuid(),
  id,
  format('{"sub":"%s","email":"%s"}', id::text, email)::jsonb,
  'email',
  current_timestamp,
  current_timestamp,
  current_timestamp
FROM auth.users
WHERE email = 'info@gtintl.com.ph'
AND NOT EXISTS (
  SELECT 1 FROM auth.identities WHERE identity_data->>'email' = 'info@gtintl.com.ph'
);