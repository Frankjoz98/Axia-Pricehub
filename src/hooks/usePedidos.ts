import { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import type { PedidoSugerido, EstadoPedido } from '../types';

export function usePedidos() {
  const [pedidos, setPedidos] = useState<PedidoSugerido[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchPedidos = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('pedidos_sugeridos')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching pedidos:', error);
    } else {
      setPedidos(data || []);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchPedidos();

    // Suscripción en tiempo real
    const channel = supabase
      .channel('pedidos_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'pedidos_sugeridos' },
        () => {
          fetchPedidos();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const addPedido = async (pedido: Omit<PedidoSugerido, 'id' | 'created_at' | 'estado' | 'procesado_at' | 'recibido_at'>) => {
    // Optimistic insert requires a temporary ID and timestamps
    const tempId = `temp-${Date.now()}`;
    const newPedido: PedidoSugerido = {
      ...pedido,
      id: tempId,
      estado: 'pendiente',
      created_at: new Date().toISOString()
    };
    
    setPedidos(prev => [newPedido, ...prev]);

    const { data, error } = await supabase
      .from('pedidos_sugeridos')
      .insert([pedido])
      .select()
      .single();

    if (error) {
      // Revert optimistic update
      setPedidos(prev => prev.filter(p => p.id !== tempId));
      throw error;
    }
    
    // Replace temp with real data
    setPedidos(prev => prev.map(p => p.id === tempId ? data : p));
    return data;
  };

  const updateEstado = async (id: string, nuevoEstado: EstadoPedido) => {
    const updates: Partial<PedidoSugerido> = { estado: nuevoEstado };
    
    if (nuevoEstado === 'pedido') updates.procesado_at = new Date().toISOString();
    if (nuevoEstado === 'recibido') updates.recibido_at = new Date().toISOString();

    // Optimistic update
    setPedidos(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));

    const { error } = await supabase
      .from('pedidos_sugeridos')
      .update(updates)
      .eq('id', id);

    if (error) {
      // Revert needs a full refresh to be safe
      fetchPedidos();
      throw error;
    }
  };

  const deletePedido = async (id: string) => {
    // Optimistic update
    setPedidos(prev => prev.filter(p => p.id !== id));

    const { error } = await supabase
      .from('pedidos_sugeridos')
      .delete()
      .eq('id', id);

    if (error) {
      fetchPedidos();
      throw error;
    }
  };

  return {
    pedidos,
    isLoading,
    addPedido,
    updateEstado,
    deletePedido,
    refreshPedidos: fetchPedidos
  };
}
