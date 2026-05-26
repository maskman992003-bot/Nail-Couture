-- Remove the unused phone_number column from profiles
ALTER TABLE profiles DROP COLUMN IF EXISTS phone_number;
