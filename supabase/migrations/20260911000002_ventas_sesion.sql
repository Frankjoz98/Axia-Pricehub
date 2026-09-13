-- Agregar columna sesion a ventas_historicas

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name='ventas_historicas' AND column_name='sesion'
  ) THEN
    ALTER TABLE ventas_historicas ADD COLUMN sesion TEXT;
  END IF;
END $$;
