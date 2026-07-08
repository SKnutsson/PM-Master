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

/** Resolve a private storage path to a signed URL (cached in sessionStorage + memory). */
const _urlCache = new Map<string, { url: string; exp: number }>();
const SS_PREFIX = 'blueprint-url:';
const TTL_MS = 1000 * 60 * 60 * 7; // 7h (URLs signed for 8h)

export async function signBlueprintUrl(path: string): Promise<string | null> {
  if (!path) return null;
  const now = Date.now();

  const mem = _urlCache.get(path);
  if (mem && mem.exp > now) return mem.url;

  try {
    const raw = sessionStorage.getItem(SS_PREFIX + path);
    if (raw) {
      const parsed = JSON.parse(raw) as { url: string; exp: number };
      if (parsed.exp > now) {
        _urlCache.set(path, parsed);
        return parsed.url;
      }
      sessionStorage.removeItem(SS_PREFIX + path);
    }
  } catch { /* ignore */ }

  const { data } = await supabase.storage.from('production-blueprints').createSignedUrl(path, 60 * 60 * 8);
  if (!data?.signedUrl) return null;
  const entry = { url: data.signedUrl, exp: now + TTL_MS };
  _urlCache.set(path, entry);
  try { sessionStorage.setItem(SS_PREFIX + path, JSON.stringify(entry)); } catch { /* quota */ }
  return data.signedUrl;
}
