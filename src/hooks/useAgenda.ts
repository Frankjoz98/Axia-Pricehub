import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabase';
import type { AgendaEvento } from '../types';
import { useAppContext } from '../context/AppContext';

export function useAgenda() {
  const { session } = useAppContext();
  const [eventos, setEventos] = useState<AgendaEvento[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadEventos = useCallback(async () => {
    if (!session?.user?.id) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('agenda_eventos')
        .select('*')
        .order('fecha', { ascending: true })
        .order('hora_inicio', { ascending: true, nullsFirst: true });

      if (error) throw error;
      setEventos(data as AgendaEvento[]);
    } catch (err) {
      console.error('Error loading agenda events:', err);
    } finally {
      setIsLoading(false);
    }
  }, [session]);

  useEffect(() => {
    loadEventos();
  }, [loadEventos]);

  const addEvento = async (evento: Partial<AgendaEvento>) => {
    if (!session?.user?.id) return null;
    const newEvent = { ...evento, user_id: session.user.id };
    
    try {
      const { data, error } = await supabase
        .from('agenda_eventos')
        .insert([newEvent])
        .select()
        .single();
        
      if (error) throw error;
      setEventos(prev => [...prev, data as AgendaEvento]);
      return data;
    } catch (err) {
      console.error('Error adding agenda event:', err);
      return null;
    }
  };

  const updateEvento = async (id: string, updates: Partial<AgendaEvento>) => {
    try {
      const { error } = await supabase
        .from('agenda_eventos')
        .update(updates)
        .eq('id', id);
        
      if (error) throw error;
      setEventos(prev => prev.map(e => e.id === id ? { ...e, ...updates } : e));
      return true;
    } catch (err) {
      console.error('Error updating agenda event:', err);
      return false;
    }
  };

  const deleteEvento = async (id: string) => {
    try {
      const { error } = await supabase
        .from('agenda_eventos')
        .delete()
        .eq('id', id);
        
      if (error) throw error;
      setEventos(prev => prev.filter(e => e.id !== id));
      return true;
    } catch (err) {
      console.error('Error deleting agenda event:', err);
      return false;
    }
  };

  return {
    eventos,
    isLoading,
    refresh: loadEventos,
    addEvento,
    updateEvento,
    deleteEvento
  };
}
