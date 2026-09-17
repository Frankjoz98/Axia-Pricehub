import { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import type { CitaMedica, EstadoCita } from '../types';

export function useCitas(fechaFiltro?: string) {
  const [citas, setCitas] = useState<CitaMedica[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchCitas = async () => {
    setIsLoading(true);
    let query = supabase
      .from('citas_medicas')
      .select('*')
      .order('hora', { ascending: true });

    if (fechaFiltro) {
      query = query.eq('fecha', fechaFiltro);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching citas:', error);
    } else {
      setCitas(data || []);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchCitas();

    // Suscripción en tiempo real
    const channel = supabase
      .channel('citas_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'citas_medicas' },
        () => {
          fetchCitas();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fechaFiltro]);

  const addCita = async (cita: Omit<CitaMedica, 'id' | 'created_at' | 'estado'>) => {
    const tempId = `temp-${Date.now()}`;
    const newCita: CitaMedica = {
      ...cita,
      id: tempId,
      estado: 'pendiente',
      created_at: new Date().toISOString()
    };
    
    setCitas(prev => {
      const updated = [...prev, newCita];
      return updated.sort((a, b) => a.hora.localeCompare(b.hora));
    });

    const { data, error } = await supabase
      .from('citas_medicas')
      .insert([cita])
      .select()
      .single();

    if (error) {
      setCitas(prev => prev.filter(c => c.id !== tempId));
      throw error;
    }
    
    setCitas(prev => {
      const updated = prev.map(c => c.id === tempId ? data : c);
      return updated.sort((a, b) => a.hora.localeCompare(b.hora));
    });
    return data;
  };

  const updateEstado = async (id: string, nuevoEstado: EstadoCita) => {
    setCitas(prev => prev.map(c => c.id === id ? { ...c, estado: nuevoEstado } : c));

    const { error } = await supabase
      .from('citas_medicas')
      .update({ estado: nuevoEstado })
      .eq('id', id);

    if (error) {
      fetchCitas();
      throw error;
    }
  };

  const deleteCita = async (id: string) => {
    setCitas(prev => prev.filter(c => c.id !== id));

    const { error } = await supabase
      .from('citas_medicas')
      .delete()
      .eq('id', id);

    if (error) {
      fetchCitas();
      throw error;
    }
  };

  return {
    citas,
    isLoading,
    addCita,
    updateEstado,
    deleteCita,
    refreshCitas: fetchCitas
  };
}
