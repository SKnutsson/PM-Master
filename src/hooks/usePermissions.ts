import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface Permissions {
  isAdmin: boolean;
  isSalesManager: boolean;
  canAccessCrm: boolean;
  canAccessProduction: boolean;
  canSeeAllSalespeople: boolean;
  linkedSalesperson: string | null;
  loading: boolean;
}

const EMPTY: Omit<Permissions, 'loading'> = {
  isAdmin: false,
  isSalesManager: false,
  canAccessCrm: false,
  canAccessProduction: false,
  canSeeAllSalespeople: false,
  linkedSalesperson: null,
};

async function fetchPermissions(userId: string): Promise<Omit<Permissions, 'loading'>> {
  const [rolesRes, profileRes] = await Promise.all([
    supabase.from('user_roles').select('role').eq('user_id', userId),
    supabase
      .from('profiles')
      .select('can_access_crm, linked_salesperson, can_access_production')
      .eq('user_id', userId)
      .maybeSingle(),
  ]);
  const roles = (rolesRes.data || []).map((r: any) => r.role);
  const isAdmin = roles.includes('admin');
  const isSalesManager = roles.includes('sales_manager');
  const canAccessCrm = isAdmin || !!(profileRes.data as any)?.can_access_crm;
  const canAccessProduction = isAdmin || !!(profileRes.data as any)?.can_access_production;
  return {
    isAdmin,
    isSalesManager,
    canAccessCrm,
    canAccessProduction,
    canSeeAllSalespeople: canAccessCrm,
    linkedSalesperson: (profileRes.data as any)?.linked_salesperson || null,
  };
}

export function usePermissions(): Permissions {
  const { user } = useAuth();
  const { data, isLoading } = useQuery({
    queryKey: ['permissions', user?.id],
    queryFn: () => fetchPermissions(user!.id),
    enabled: !!user,
    staleTime: Infinity, // fetch once per session
    gcTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: false,
  });

  if (!user) return { ...EMPTY, loading: false };
  return { ...(data || EMPTY), loading: isLoading };
}
