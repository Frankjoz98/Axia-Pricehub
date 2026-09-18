import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../supabase';
import type { CitaMedica, EstadoCita } from '../types';

/** Fila devuelta por `portal_catalogo_impulso` (solo columnas no sensibles). */
export interface ImpulsoPublico {
  odoo_id: string | null;
  product_name: string;
  stock: number;
  marca: string | null;
}

const REFRESH_MS = 60_000;

/**
 * Acceso público del portal médico (RF-59, RF-69). No toca tablas: solo invoca las funciones RPC
 * `portal_*`, que validan el token de `configuracion.portal_token`. Sin token válido, todo queda vacío.
 */
export function usePortalMedico(token: string | null, fecha: string) {
  const [citas, setCitas] = useState<CitaMedica[]>([]);
  const [medicamentos, setMedicamentos] = useState<ImpulsoPublico[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [tokenInvalido, setTokenInvalido] = useState(false);

  const fetchCitas = useCallback(async () => {
    if (!token) { setCitas([]); return; }
    const { data, error } = await supabase.rpc('portal_citas', { p_token: token, p_fecha: fecha });
    if (error) {
      console.error('Error cargando citas del portal:', error);
      return;
    }
    setCitas((data ?? []) as CitaMedica[]);
  }, [token, fecha]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!token) { setTokenInvalido(true); setIsLoading(false); return; }
      setIsLoading(true);
      const [{ data: cat, error: catError }] = await Promise.all([
        supabase.rpc('portal_catalogo_impulso', { p_token: token }),
        fetchCitas()
      ]);
      if (cancelled) return;
      if (catError) console.error('Error cargando catálogo de impulso:', catError);
      setMedicamentos((cat ?? []) as ImpulsoPublico[]);
      setTokenInvalido(false);
      setIsLoading(false);
    };
    load();
    // Sin sesión no hay Realtime: se refresca periódicamente
    const timer = setInterval(fetchCitas, REFRESH_MS);
    return () => { cancelled = true; clearInterval(timer); };
  }, [token, fetchCitas]);

  const updateEstado = async (id: string, nuevoEstado: EstadoCita) => {
    if (!token) return;
    const previous = citas;
    setCitas(prev => prev.map(c => c.id === id ? { ...c, estado: nuevoEstado } : c));
    const { error } = await supabase.rpc('portal_actualizar_cita', { p_token: token, p_id: id, p_estado: nuevoEstado });
    if (error) {
      console.error('Error actualizando cita:', error);
      setCitas(previous);
    }
  };

  return { citas, medicamentos, isLoading, tokenInvalido, updateEstado, refresh: fetchCitas };
}
