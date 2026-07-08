import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface UserProfile {
  id: string;
  user_id: string;
  first_name: string | null;
  last_name: string | null;
  display_name: string | null;
  avatar_color: string | null;
  phone: string | null;
  user_role: string | null;
  can_access_crm?: boolean | null;
  linked_salesperson?: string | null;
  can_access_production?: boolean | null;
}

const SELECT_COLS =
  'id, user_id, first_name, last_name, display_name, avatar_color, phone, user_role, can_access_crm, linked_salesperson, can_access_production';

const PROFILES_KEY = ['profiles'] as const;

async function fetchProfiles(): Promise<UserProfile[]> {
  const { data } = await supabase.from('profiles').select(SELECT_COLS);
  return (data as any) || [];
}

export function useProfiles() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: PROFILES_KEY,
    queryFn: fetchProfiles,
    staleTime: Infinity, // load once per session; no polling, no refetch on focus
    gcTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: false,
  });

  const refetch = async () => {
    await qc.invalidateQueries({ queryKey: PROFILES_KEY });
  };

  return { profiles: data || [], isLoading, refetch };
}

export function getInitials(profile: UserProfile): string {
  const f = (profile.first_name || '').trim().charAt(0).toUpperCase();
  const l = (profile.last_name || '').trim().charAt(0).toUpperCase();
  if (f && l) return `${f}${l}`;
  if (f) return f;
  if (profile.display_name) return profile.display_name.charAt(0).toUpperCase();
  return '?';
}

export function getDisplayName(profile: UserProfile): string {
  const parts = [profile.first_name, profile.last_name].filter(Boolean);
  return parts.length > 0 ? parts.join(' ') : profile.display_name || '';
}
