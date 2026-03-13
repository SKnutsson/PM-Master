import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface LifecycleNode {
  id: string;
  name: string;
  node_type: 'phase' | 'milestone';
  sort_order: number;
  items: LifecycleItem[];
}

export interface LifecycleItem {
  id: string;
  node_id: string;
  text: string;
  sort_order: number;
}

export function useLifecycleData() {
  const [nodes, setNodes] = useState<LifecycleNode[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = useCallback(async () => {
    const [nodesRes, itemsRes] = await Promise.all([
      supabase.from('lifecycle_nodes').select('*').order('sort_order'),
      supabase.from('lifecycle_items').select('*').order('sort_order'),
    ]);

    if (nodesRes.error || itemsRes.error) {
      toast.error('Kunde inte ladda livscykeldata');
      setIsLoading(false);
      return;
    }

    const items = (itemsRes.data || []) as LifecycleItem[];
    const combined = (nodesRes.data || []).map((n: any) => ({
      ...n,
      node_type: n.node_type as 'phase' | 'milestone',
      items: items.filter((i) => i.node_id === n.id),
    }));

    setNodes(combined);
    setIsLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const addNode = async (name: string, nodeType: 'phase' | 'milestone', afterSortOrder: number) => {
    // Shift all nodes after the insertion point
    const toShift = nodes.filter(n => n.sort_order > afterSortOrder);
    for (const n of toShift) {
      await supabase.from('lifecycle_nodes').update({ sort_order: n.sort_order + 1 }).eq('id', n.id);
    }

    const { error } = await supabase.from('lifecycle_nodes').insert({
      name,
      node_type: nodeType,
      sort_order: afterSortOrder + 1,
    });

    if (error) { toast.error('Kunde inte lägga till'); return; }
    await fetchData();
    toast.success(nodeType === 'phase' ? 'Fas tillagd' : 'Beslutspunkt tillagd');
  };

  const updateNode = async (id: string, name: string) => {
    const { error } = await supabase.from('lifecycle_nodes').update({ name }).eq('id', id);
    if (error) { toast.error('Kunde inte uppdatera'); return; }
    await fetchData();
  };

  const deleteNode = async (id: string) => {
    const { error } = await supabase.from('lifecycle_nodes').delete().eq('id', id);
    if (error) { toast.error('Kunde inte ta bort'); return; }
    await fetchData();
    toast.success('Borttagen');
  };

  const addItem = async (nodeId: string, text: string) => {
    const node = nodes.find(n => n.id === nodeId);
    const maxSort = node?.items.reduce((max, i) => Math.max(max, i.sort_order), 0) || 0;
    const { error } = await supabase.from('lifecycle_items').insert({
      node_id: nodeId,
      text,
      sort_order: maxSort + 1,
    });
    if (error) { toast.error('Kunde inte lägga till'); return; }
    await fetchData();
  };

  const updateItem = async (itemId: string, text: string) => {
    const { error } = await supabase.from('lifecycle_items').update({ text }).eq('id', itemId);
    if (error) { toast.error('Kunde inte uppdatera'); return; }
    await fetchData();
  };

  const deleteItem = async (itemId: string) => {
    const { error } = await supabase.from('lifecycle_items').delete().eq('id', itemId);
    if (error) { toast.error('Kunde inte ta bort'); return; }
    await fetchData();
  };

  return { nodes, isLoading, addNode, updateNode, deleteNode, addItem, updateItem, deleteItem, refetch: fetchData };
}
