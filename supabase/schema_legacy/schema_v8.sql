-- Script V8: Tabla para Caché de Fichas Técnicas de Axia AI

CREATE TABLE public.fichas_tecnicas (
    product_id text PRIMARY KEY,
    usos text NOT NULL,
    precio_promedio text NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar RLS (Seguridad)
ALTER TABLE public.fichas_tecnicas ENABLE ROW LEVEL SECURITY;

-- Políticas de Acceso
CREATE POLICY "Permitir lectura a todos los usuarios autenticados" 
ON public.fichas_tecnicas 
FOR SELECT 
USING (auth.role() = 'authenticated');

CREATE POLICY "Permitir inserción a todos los usuarios autenticados" 
ON public.fichas_tecnicas 
FOR INSERT 
WITH CHECK (auth.role() = 'authenticated');
