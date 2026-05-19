-- Ejecutar esto en el SQL Editor de Supabase
-- (Dashboard → SQL Editor → New query → pegar esto → Run)

CREATE TABLE productos (
  id               SERIAL PRIMARY KEY,
  nombre           TEXT NOT NULL,
  categoria        TEXT NOT NULL,
  cantidad         NUMERIC NOT NULL DEFAULT 0,
  unidad           TEXT NOT NULL DEFAULT 'unidad',
  precio_costo     NUMERIC DEFAULT 0,
  precio_venta     NUMERIC DEFAULT 0,
  stock_minimo     NUMERIC DEFAULT 0,
  fecha_vencimiento DATE,
  proveedor        TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

-- Datos de demo
INSERT INTO productos (nombre, categoria, cantidad, unidad, precio_costo, precio_venta, stock_minimo, fecha_vencimiento, proveedor) VALUES
  ('Leche La Serenísima 1L',    'Lácteos',          24,  'unidad', 850,  1100, 10, CURRENT_DATE + 3,  'Lácteos del Norte'),
  ('Yogur Ser Frutilla x4',     'Lácteos',           3,  'unidad', 950,  1300,  8, CURRENT_DATE + 15, 'Lácteos del Norte'),
  ('Queso Cremoso x200g',       'Fiambres',          12, 'unidad', 1200, 1600,  5, CURRENT_DATE - 2,  'Distribuidora Centro'),
  ('Salame Paladini x100g',     'Fiambres',           8, 'unidad', 900,  1250,  5, CURRENT_DATE + 15, 'Distribuidora Centro'),
  ('Coca Cola 2.25L',           'Bebidas',           18, 'unidad', 1100, 1500, 12, NULL,              'Bebidas SA'),
  ('Agua Villavicencio 2L',     'Bebidas',           30, 'unidad', 600,   900, 15, NULL,              'Bebidas SA'),
  ('Fernet Branca 750ml',       'Bebidas',            6, 'unidad', 4500, 6000,  4, NULL,              'Distribuidora Norte'),
  ('Detergente Magistral 500ml','Limpieza',           2, 'unidad', 700,   950,  6, NULL,              'Limpieza Total'),
  ('Lavandina Ayudín 1L',       'Limpieza',           4, 'unidad', 550,   750,  6, NULL,              'Limpieza Total'),
  ('Pan Lactal Bimbo',          'Panadería',          5, 'unidad', 800,  1100,  4, CURRENT_DATE + 3,  'Bimbo'),
  ('Atún La Campagnola x170g',  'Conservas',         20, 'unidad', 650,   900,  8, NULL,              'La Campagnola'),
  ('Alfajor Havanna x3',        'Golosinas',         10, 'unidad', 1800, 2400,  6, CURRENT_DATE + 15, 'Havanna'),
  ('Shampoo Sedal 400ml',       'Higiene personal',   7, 'unidad', 1100, 1500,  4, NULL,              'Unilever');
