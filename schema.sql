-- 1. Crear la tabla de productos
CREATE TABLE public.productos (
  id text PRIMARY KEY,
  name text NOT NULL,
  "activeIngredient" text,
  category text,
  "isPriority" boolean DEFAULT false,
  nivel integer NOT NULL,
  offers jsonb DEFAULT '[]'::jsonb
);

-- 2. Habilitar Seguridad (RLS)
ALTER TABLE public.productos ENABLE ROW LEVEL SECURITY;

-- 3. Crear políticas para permitir lectura y escritura pública (útil para esta etapa del prototipo sin Auth)
CREATE POLICY "Permitir lectura pública" ON public.productos FOR SELECT USING (true);
CREATE POLICY "Permitir modificación pública" ON public.productos FOR ALL USING (true) WITH CHECK (true);

-- 4. Insertar los datos base iniciales
INSERT INTO public.productos (id, name, "activeIngredient", category, "isPriority", nivel, offers) VALUES
('prod-001', 'Nebilet 5mg', 'Nebivolol', 'Cardiología', true, 2, '[{"provider": "LETERAGO", "basePrice": 850, "discount": 15, "netPrice": 722.5, "providerCode": "LET-NEB-05", "bonusScale": {"buy": 12, "free": 1}}, {"provider": "DICEGSA", "basePrice": 860, "discount": 20, "netPrice": 688, "providerCode": "DIC-NEB-05"}, {"provider": "DIDELSA", "basePrice": 840, "discount": 10, "netPrice": 756, "providerCode": "DID-NEB-05"}]'::jsonb),
('prod-002', 'Dolo Neurobión XR', 'Diclofenaco + Vitaminas B1, B6, B12', 'Neurología', true, 1, '[{"provider": "DISMEDIC", "basePrice": 450, "discount": 10, "netPrice": 405, "providerCode": "DSM-DNXR", "bonusScale": {"buy": 5, "free": 1}}, {"provider": "IMFARSA", "basePrice": 460, "discount": 15, "netPrice": 391, "providerCode": "IMF-DNXR"}]'::jsonb),
('prod-003', 'Amoxicilina 500mg', 'Amoxicilina', 'Antibióticos', false, 1, '[{"provider": "VESANIC", "basePrice": 120, "discount": 5, "netPrice": 114, "providerCode": "VES-AMX-500", "bonusScale": {"buy": 3, "free": 1}}, {"provider": "WALMART / MAYORISTA", "basePrice": 110, "discount": 0, "netPrice": 110, "providerCode": "WAL-AMX-500"}, {"provider": "DICEGSA", "basePrice": 130, "discount": 15, "netPrice": 110.5, "providerCode": "DIC-AMX-500"}]'::jsonb),
('prod-004', 'Umbrella Gel', 'Filtros solares UVA/UVB', 'Dermatología', false, 3, '[{"provider": "LETERAGO", "basePrice": 950, "discount": 20, "netPrice": 760, "providerCode": "LET-UMB-G"}, {"provider": "DIDELSA", "basePrice": 920, "discount": 10, "netPrice": 828, "providerCode": "DID-UMB-G"}]'::jsonb),
('prod-005', 'Leche NAN 1', 'Fórmula láctea de inicio', 'Nutrición', false, 1, '[{"provider": "WALMART / MAYORISTA", "basePrice": 650, "discount": 5, "netPrice": 617.5, "providerCode": "WAL-NAN-1"}, {"provider": "DICEGSA", "basePrice": 680, "discount": 12, "netPrice": 598.4, "providerCode": "DIC-NAN-1"}]'::jsonb),
('prod-006', 'Extracto de Malta', 'Malta + Vitaminas', 'Nutrición', true, 2, '[{"provider": "IMFARSA", "basePrice": 180, "discount": 5, "netPrice": 171, "providerCode": "IMF-MALTA", "bonusScale": {"buy": 12, "free": 2}}, {"provider": "DISMEDIC", "basePrice": 175, "discount": 0, "netPrice": 175, "providerCode": "DSM-MALTA"}]'::jsonb),
('prod-007', 'Prueba de Embarazo', 'Detección HCG', 'Ginecología', false, 1, '[{"provider": "VESANIC", "basePrice": 90, "discount": 10, "netPrice": 81, "providerCode": "VES-PRU-EMB"}, {"provider": "DICEGSA", "basePrice": 100, "discount": 25, "netPrice": 75, "providerCode": "DIC-PRU-EMB"}]'::jsonb);
