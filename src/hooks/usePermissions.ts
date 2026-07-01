import { useState, useEffect } from 'react';
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

export function usePermissions(): Permissions {
  const { user } = useAuth();
  const [state, setState] = useState<Permissions>({
    isAdmin: false,
    isSalesManager: false,
    canAccessCrm: false,
    canAccessProduction: false,
    canSeeAllSalespeople: false,
    linkedSalesperson: null,
    loading: true,
  });

  useEffect(() => {
    if (!user) {
      setState((s) => ({ ...s, loading: false }));
      return;
    }
    let cancelled = false;
    (async () => {
      const [rolesRes, profileRes] = await Promise.all([
        supabase.from('user_roles').select('role').eq('user_id', user.id),
        supabase
          .from('profiles')
          .select('can_access_crm, linked_salesperson, can_access_production')
          .eq('user_id', user.id)
          .maybeSingle(),
      ]);
      if (cancelled) return;
      const roles = (rolesRes.data || []).map((r: any) => r.role);
      const isAdmin = roles.includes('admin');
      const isSalesManager = roles.includes('sales_manager');
      const canAccessCrm = isAdmin || !!(profileRes.data as any)?.can_access_crm;
      const canAccessProduction = isAdmin || !!(profileRes.data as any)?.can_access_production;
      setState({
        isAdmin,
        isSalesManager,
        canAccessCrm,
        canAccessProduction,
        canSeeAllSalespeople: canAccessCrm,
        linkedSalesperson: (profileRes.data as any)?.linked_salesperson || null,
        loading: false,
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  return state;
}
