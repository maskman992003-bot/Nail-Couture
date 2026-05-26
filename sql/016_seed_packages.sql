-- Seed package services into services table
INSERT INTO services (name, description, price, duration_minutes, category, is_addon)
VALUES
  ('The First Impression Package', 'Includes a Classic Manicure, Classic Pedicure, and our Premium Spa/Deluxe Treatment.', 75, 80, 'Packages', false),
  ('The Russian Routine', 'Our signature high-precision Russian Manicure paired with a flawless Gel Pedicure.', 120, 165, 'Packages', false)
ON CONFLICT DO NOTHING;
