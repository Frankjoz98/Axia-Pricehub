import { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { errorMessage } from '../lib/utils';
import type { BitacoraEntry } from '../types';

export function useBitacora() {
  const [entradas, setEntradas] = useState<BitacoraEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchEntradas();
  }, []);

  const fetchEntradas = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data, error } = await supabase
        .from('bitacora_avances')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setEntradas(data || []);
    } catch (error) {
      console.error('Error fetching bitácora:', errorMessage(error));
    } finally {
      setIsLoading(false);
    }
  };

  const addEntrada = async (entrada: Partial<BitacoraEntry>) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data, error } = await supabase
        .from('bitacora_avances')
        .insert([{ ...entrada, user_id: session.user.id }])
        .select()
        .single();

      if (error) throw error;
      setEntradas(prev => [data, ...prev]);
    } catch (error) {
      console.error('Error adding bitácora:', errorMessage(error));
      throw error;
    }
  };

  const updateEntrada = async (id: string, updates: Partial<BitacoraEntry>) => {
    try {
      const { data, error } = await supabase
        .from('bitacora_avances')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      setEntradas(prev => prev.map(e => e.id === id ? data : e));
    } catch (error) {
      console.error('Error updating bitácora:', errorMessage(error));
      throw error;
    }
  };

  const deleteEntrada = async (id: string) => {
    try {
      const { error } = await supabase.from('bitacora_avances').delete().eq('id', id);
      if (error) throw error;
      setEntradas(prev => prev.filter(e => e.id !== id));
    } catch (error) {
      console.error('Error deleting bitácora:', errorMessage(error));
      throw error;
    }
  };

  return {
    entradas,
    isLoading,
    addEntrada,
    updateEntrada,
    deleteEntrada,
    refresh: fetchEntradas
  };
}
