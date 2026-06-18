-- Migration 095 (step 2 of 2): Seed front-desk kiosk system user
-- Run AFTER 094_add_check_in_kiosk_user.sql has committed successfully

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM profiles WHERE phone = '1118111888') THEN
    UPDATE profiles
    SET full_name = 'Check_in',
        role = 'check_in',
        pin = '1118'
    WHERE phone = '1118111888';
  ELSIF EXISTS (SELECT 1 FROM profiles WHERE phone = '1118111118') THEN
    UPDATE profiles
    SET full_name = 'Check_in',
        phone = '1118111888',
        role = 'check_in',
        pin = '1118'
    WHERE phone = '1118111118';
  ELSE
    INSERT INTO profiles (id, full_name, phone, role, pin, created_at)
    VALUES (
      gen_random_uuid(),
      'Check_in',
      '1118111888',
      'check_in',
      '1118',
      now()
    );
  END IF;
END $$;
