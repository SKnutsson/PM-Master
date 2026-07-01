import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type {
  ProductionProject, ProductionFactory, ProductionObject, ProductionFlow, ProductionComment,
} from './types';

export function useProductionProjects() {
  const [projects, setProjects] = useState<ProductionProject[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const { data } = await supabase
      .from('production_projects')
      .select('*')
      .order('updated_at', { ascending: false });
    setProjects((data as any) || []);
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);
  return { projects, loading, refresh };
}

export function useProductionProject(projectId: string | null) {
  const [factories, setFactories] = useState<ProductionFactory[]>([]);
  const [objects, setObjects] = useState<ProductionObject[]>([]);
  const [flows, setFlows] = useState<ProductionFlow[]>([]);
  const [comments, setComments] = useState<ProductionComment[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    const [fRes, oRes, flRes, cRes] = await Promise.all([
      supabase.from('production_factories').select('*').eq('project_id', projectId).order('order_index'),
      supabase.from('production_objects').select('*, factory:production_factories!inner(project_id)').eq('factory.project_id', projectId),
      supabase.from('production_flows').select('*').eq('project_id', projectId),
      supabase.from('production_comments').select('*').eq('project_id', projectId).order('created_at'),
    ]);
    setFactories((fRes.data as any) || []);
    setObjects(((oRes.data as any) || []).map(({ factory, ...o }: any) => o));
    setFlows((flRes.data as any) || []);
    setComments((cRes.data as any) || []);
    setLoading(false);
  }, [projectId]);

  useEffect(() => { refresh(); }, [refresh]);

  return {
    factories, objects, flows, comments, loading, refresh,
    setFactories, setObjects, setFlows, setComments,
  };
}

/** Resolve a private storage path to a signed URL (cached in-memory). */
const _urlCache = new Map<string, { url: string; exp: number }>();
export async function signBlueprintUrl(path: string): Promise<string | null> {
  if (!path) return null;
  const cached = _urlCache.get(path);
  if (cached && cached.exp > Date.now()) return cached.url;
  const { data } = await supabase.storage.from('production-blueprints').createSignedUrl(path, 60 * 60 * 8);
  if (!data?.signedUrl) return null;
  _urlCache.set(path, { url: data.signedUrl, exp: Date.now() + 1000 * 60 * 60 * 7 });
  return data.signedUrl;
}
