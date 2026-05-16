-- Create the stock table
CREATE TABLE IF NOT EXISTS stock (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('refreshment', 'material')),
  quantity INTEGER NOT NULL DEFAULT 0,
  unit TEXT NOT NULL,
  min_stock_alert INTEGER NOT NULL DEFAULT 5,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE stock ENABLE ROW LEVEL SECURITY;

-- Allow all users to read stock
CREATE POLICY "Allow read stock" ON stock FOR SELECT USING (true);

-- Allow all authenticated/anonymous users to modify stock (internal salon tool)
CREATE POLICY "Allow all stock modifications" ON stock FOR ALL USING (true) WITH CHECK (true);

-- Seed initial refreshment items
INSERT INTO stock (name, category, quantity, unit, min_stock_alert) VALUES
  ('Fiji Bottled Water', 'refreshment', 48, 'bottle', 10),
  ('Lavender Tea', 'refreshment', 30, 'cup', 5),
  ('Coffee', 'refreshment', 25, 'cup', 5),
  ('Sparkling Water', 'refreshment', 20, 'bottle', 5),
  ('Fresh Orange Juice', 'refreshment', 15, 'glass', 3);

-- Seed initial material items
INSERT INTO stock (name, category, quantity, unit, min_stock_alert) VALUES
  ('OPI Gel Top Coat', 'material', 12, 'bottle', 3),
  ('OPI Base Coat', 'material', 10, 'bottle', 3),
  ('Nail Polish Remover', 'material', 8, 'bottle', 2),
  ('Cuticle Oil', 'material', 15, 'bottle', 4),
  ('Nail Files (Fine)', 'material', 25, 'piece', 5),
  ('Cotton Pads', 'material', 100, 'piece', 20),
  ('Nail Brushes', 'material', 20, 'piece', 5),
  ('Acrylic Powder', 'material', 6, 'jar', 2),
  ('UV Gel', 'material', 4, 'tube', 2),
  ('Disposable Gloves', 'material', 200, 'pair', 50),
  ('Nail Clippers', 'material', 10, 'piece', 3),
  ('Callus Remover', 'material', 5, 'bottle', 2),
  ('Foot File', 'material', 8, 'piece', 2),
  ('Nail Brush Cleaner', 'material', 3, 'bottle', 2),
  ('Manicure Table Covers', 'material', 50, 'piece', 15),
  ('LED Lamp Bulbs', 'material', 4, 'piece', 2);