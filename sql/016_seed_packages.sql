-- Seed package services into services table
INSERT INTO services (name, price, duration_minutes, category, is_addon)
VALUES
  ('The First Impression Package', 75, 80, 'Packages', false),
  ('The Russian Routine', 120, 165, 'Packages', false)
ON CONFLICT DO NOTHING;
