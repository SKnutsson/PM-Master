import { useState, useEffect } from 'react';
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
}

const SELECT_COLS = 'id, user_id, first_name, last_name, display_name, avatar_color, phone, user_role, can_access_crm, linked_salesperson';

export function useProfiles() {
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase.from('profiles').select(SELECT_COLS);
      setProfiles((data as any) || []);
      setIsLoading(false);
    };
    fetch();
  }, []);

  const refetch = async () => {
    const { data } = await supabase.from('profiles').select(SELECT_COLS);
    setProfiles((data as any) || []);
  };

  return { profiles, isLoading, refetch };
}

  return { profiles, isLoading, refetch };
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
