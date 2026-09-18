import { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { errorMessage } from '../lib/utils';
import type { Meta } from '../types';

export function useMetas() {
  const [metas, setMetas] = useState<Meta[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchMetas();
  }, []);

  const fetchMetas = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data, error } = await supabase
        .from('metas')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setMetas(data || []);
    } catch (error) {
      console.error('Error fetching metas:', errorMessage(error));
    } finally {
      setIsLoading(false);
    }
  };

  const addMeta = async (meta: Partial<Meta>) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data, error } = await supabase
        .from('metas')
        .insert([{ ...meta, user_id: session.user.id }])
        .select()
        .single();

      if (error) throw error;
      setMetas(prev => [data, ...prev]);
    } catch (error) {
      console.error('Error adding meta:', errorMessage(error));
      throw error;
    }
  };

  const updateMeta = async (id: string, updates: Partial<Meta>) => {
    try {
      const { data, error } = await supabase
        .from('metas')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      setMetas(prev => prev.map(m => m.id === id ? data : m));
    } catch (error) {
      console.error('Error updating meta:', errorMessage(error));
      throw error;
    }
  };

  const deleteMeta = async (id: string) => {
    try {
      const { error } = await supabase.from('metas').delete().eq('id', id);
      if (error) throw error;
      setMetas(prev => prev.filter(m => m.id !== id));
    } catch (error) {
      console.error('Error deleting meta:', errorMessage(error));
      throw error;
    }
  };

  return {
    metas,
    isLoading,
    addMeta,
    updateMeta,
    deleteMeta,
    refresh: fetchMetas
  };
}
