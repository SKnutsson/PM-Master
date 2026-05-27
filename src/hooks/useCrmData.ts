import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface CrmQuote {
  id: string;
  quote_number: string;
  quote_date: string;
  salesperson: string;
  responsible: string;
  customer_id: string | null;
  customer_name: string;
  country: string;
  project_arena: string;
  product: string;
  quantity_spec: string;
  amount: number;
  delivery_time: string;
  prescriber: boolean;
  probability: number;
  status: string;
  next_followup: string | null;
  comment: string;
  created_at: string;
  updated_at: string;
}

export interface CrmCustomer {
  id: string;
  name: string;
  arena: string;
  country: string;
  notes: string;
}

export interface CrmContact {
  id: string;
  customer_id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
}

export function useCrmData() {
  const [quotes, setQuotes] = useState<CrmQuote[]>([]);
  const [customers, setCustomers] = useState<CrmCustomer[]>([]);
  const [contacts, setContacts] = useState<CrmContact[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    const [q, c, ct] = await Promise.all([
      supabase.from('crm_quotes').select('*').order('updated_at', { ascending: false }),
      supabase.from('crm_customers').select('*').order('name'),
      supabase.from('crm_contacts').select('*'),
    ]);
    if (q.data) setQuotes(q.data as any);
    if (c.data) setCustomers(c.data as any);
    if (ct.data) setContacts(ct.data as any);
    setLoading(false);
  };

  useEffect(() => {
    refresh();
    const ch = supabase
      .channel('crm-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'crm_quotes' }, () => refresh())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'crm_customers' }, () => refresh())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'crm_contacts' }, () => refresh())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  return { quotes, customers, contacts, loading, refresh };
}
