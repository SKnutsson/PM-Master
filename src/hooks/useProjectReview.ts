import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { DEFAULT_REVIEW_TEMPLATE, ReviewSection, ReviewTemplate, SIGNOFF_ROLES } from '@/lib/reviewTemplate';

export interface ReviewRecord {
  id: string;
  project_id: string;
  template_id: string | null;
  template_version: number;
  template_snapshot: ReviewSection[];
  status: string;
  review_date: string | null;
  version: number;
  header: Record<string, any>;
  general_note: string | null;
  updated_at: string;
}

export interface AnswerRecord {
  id?: string;
  review_id: string;
  section_key: string;
  item_key: string;
  value: any;
  comment?: string | null;
  source?: string | null;
  document_ref?: string | null;
  revision?: string | null;
  page_ref?: string | null;
  responsible?: string | null;
  status?: string | null;
  risk_level?: string | null;
  deadline?: string | null;
}

export interface RowRecord {
  id: string;
  review_id: string;
  section_key: string;
  data: Record<string, any>;
  sort_order: number;
}

export interface SignoffRecord {
  id: string;
  review_id: string;
  role: string;
  statement: string | null;
  approved: boolean;
  approved_name: string | null;
  approved_at: string | null;
}

export interface ReviewEvent {
  id: string;
  actor_name: string | null;
  action: string;
  target: string | null;
  details: any;
  created_at: string;
}

export function useProjectReview(projectId: string | null) {
  const { user } = useAuth();
  const [review, setReview] = useState<ReviewRecord | null>(null);
  const [answers, setAnswers] = useState<Record<string, AnswerRecord>>({});
  const [rows, setRows] = useState<RowRecord[]>([]);
  const [signoffs, setSignoffs] = useState<SignoffRecord[]>([]);
  const [events, setEvents] = useState<ReviewEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const template: ReviewTemplate = useMemo(() => {
    if (review?.template_snapshot?.length && review.template_version === DEFAULT_REVIEW_TEMPLATE.version) {
      return { ...DEFAULT_REVIEW_TEMPLATE, sections: review.template_snapshot as ReviewSection[], version: review.template_version };
    }
    return DEFAULT_REVIEW_TEMPLATE;
  }, [review]);

  // Uppgradera äldre genomgångar till senaste mallversionen
  useEffect(() => {
    if (!review || review.template_version === DEFAULT_REVIEW_TEMPLATE.version) return;
    const id = review.id;
    (async () => {
      await supabase.from('project_reviews').update({
        template_version: DEFAULT_REVIEW_TEMPLATE.version,
        template_snapshot: DEFAULT_REVIEW_TEMPLATE.sections as any,
      }).eq('id', id);
      setReview(prev => prev && prev.id === id
        ? { ...prev, template_version: DEFAULT_REVIEW_TEMPLATE.version, template_snapshot: DEFAULT_REVIEW_TEMPLATE.sections as ReviewSection[] }
        : prev);
    })();
  }, [review]);


  const logEvent = useCallback(async (reviewId: string, action: string, target?: string, details: any = {}) => {
    await supabase.from('project_review_events').insert({
      review_id: reviewId,
      actor: user?.id ?? null,
      actor_name: (user?.user_metadata as any)?.display_name || user?.email || null,
      action, target: target ?? null, details,
    });
  }, [user]);

  const load = useCallback(async (rid: string) => {
    const [a, r, s, e] = await Promise.all([
      supabase.from('project_review_answers').select('*').eq('review_id', rid),
      supabase.from('project_review_rows').select('*').eq('review_id', rid).order('sort_order'),
      supabase.from('project_review_signoffs').select('*').eq('review_id', rid),
      supabase.from('project_review_events').select('*').eq('review_id', rid).order('created_at', { ascending: false }).limit(50),
    ]);
    const map: Record<string, AnswerRecord> = {};
    (a.data || []).forEach((row: any) => { map[row.item_key] = row; });
    setAnswers(map);
    setRows((r.data as any) || []);
    setSignoffs((s.data as any) || []);
    setEvents((e.data as any) || []);
  }, []);

  useEffect(() => {
    if (!projectId) { setReview(null); setAnswers({}); setRows([]); setSignoffs([]); setEvents([]); return; }
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data } = await supabase.from('project_reviews').select('*').eq('project_id', projectId).maybeSingle();
      if (cancelled) return;
      if (data) {
        setReview(data as any);
        await load((data as any).id);
      } else {
        setReview(null); setAnswers({}); setRows([]); setSignoffs([]); setEvents([]);
      }
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [projectId, load]);

  const createReview = useCallback(async (header: Record<string, any> = {}) => {
    if (!projectId) return null;
    setSaving(true);
    const { data, error } = await supabase.from('project_reviews').insert({
      project_id: projectId,
      template_version: DEFAULT_REVIEW_TEMPLATE.version,
      template_snapshot: DEFAULT_REVIEW_TEMPLATE.sections as any,
      status: 'Ej påbörjad',
      review_date: new Date().toISOString().slice(0, 10),
      header,
      created_by: user?.id ?? null,
    }).select().single();
    setSaving(false);
    if (error || !data) return null;
    setReview(data as any);
    // seed signoffs
    const seeds = SIGNOFF_ROLES.map(s => ({ review_id: (data as any).id, role: s.role, statement: s.statement }));
    const { data: so } = await supabase.from('project_review_signoffs').insert(seeds).select();
    setSignoffs((so as any) || []);
    await logEvent((data as any).id, 'Projektgenomgång skapad');
    await load((data as any).id);
    return data as any as ReviewRecord;
  }, [projectId, user, logEvent, load]);

  const updateReview = useCallback(async (updates: Partial<ReviewRecord>) => {
    if (!review) return;
    setReview(prev => prev ? { ...prev, ...updates } as ReviewRecord : prev);
    setSaving(true);
    await supabase.from('project_reviews').update(updates as any).eq('id', review.id);
    setSaving(false);
  }, [review]);

  /** Sätter status till "Pågår" så fort något fylls i på en ej påbörjad genomgång. */
  const reviewRef = useRef<ReviewRecord | null>(null);
  useEffect(() => { reviewRef.current = review; }, [review]);
  const touchStarted = useCallback(async () => {
    const current = reviewRef.current;
    if (!current || current.status !== 'Ej påbörjad') return;
    setReview(prev => prev ? { ...prev, status: 'Pågår' } : prev);
    await supabase.from('project_reviews').update({ status: 'Pågår' }).eq('id', current.id);
  }, []);

  /** Autosparar ett checklistesvar (debounce per fält). */
  const setAnswer = useCallback((sectionKey: string, itemKey: string, patch: Partial<AnswerRecord>) => {
    if (!review) return;
    void touchStarted();
    setAnswers(prev => {
      const next = { ...prev, [itemKey]: { ...(prev[itemKey] || { review_id: review.id, section_key: sectionKey, item_key: itemKey, value: null }), ...patch } };
      return next;
    });
    if (timers.current[itemKey]) clearTimeout(timers.current[itemKey]);
    timers.current[itemKey] = setTimeout(async () => {
      setSaving(true);
      const current = { review_id: review.id, section_key: sectionKey, item_key: itemKey, ...patch, updated_by: user?.id ?? null };
      await supabase.from('project_review_answers').upsert(current as any, { onConflict: 'review_id,item_key' });
      setSaving(false);
    }, 600);
  }, [review, user, touchStarted]);


  const addRow = useCallback(async (sectionKey: string, data: Record<string, any> = {}) => {
    if (!review) return;
    void touchStarted();
    const sort = rows.filter(r => r.section_key === sectionKey).length;
    const { data: inserted } = await supabase.from('project_review_rows')
      .insert({ review_id: review.id, section_key: sectionKey, data, sort_order: sort, created_by: user?.id ?? null })
      .select().single();
    if (inserted) setRows(prev => [...prev, inserted as any]);
  }, [review, rows, user, touchStarted]);

  const updateRow = useCallback((rowId: string, data: Record<string, any>) => {
    void touchStarted();
    setRows(prev => prev.map(r => r.id === rowId ? { ...r, data: { ...r.data, ...data } } : r));

    const key = `row:${rowId}`;
    if (timers.current[key]) clearTimeout(timers.current[key]);
    timers.current[key] = setTimeout(async () => {
      const row = (rowsRef.current || []).find(r => r.id === rowId);
      if (!row) return;
      setSaving(true);
      await supabase.from('project_review_rows').update({ data: row.data }).eq('id', rowId);
      setSaving(false);
    }, 600);
  }, [touchStarted]);


  const rowsRef = useRef<RowRecord[]>([]);
  useEffect(() => { rowsRef.current = rows; }, [rows]);

  const deleteRow = useCallback(async (rowId: string) => {
    setRows(prev => prev.filter(r => r.id !== rowId));
    await supabase.from('project_review_rows').delete().eq('id', rowId);
    if (review) await logEvent(review.id, 'Rad borttagen', rowId);
  }, [review, logEvent]);

  const setSignoff = useCallback(async (role: string, approved: boolean, name: string) => {
    if (!review) return;
    const existing = signoffs.find(s => s.role === role);
    const payload = {
      review_id: review.id, role,
      statement: existing?.statement ?? SIGNOFF_ROLES.find(s => s.role === role)?.statement ?? null,
      approved,
      approved_by: approved ? user?.id ?? null : null,
      approved_name: approved ? name : null,
      approved_at: approved ? new Date().toISOString() : null,
    };
    const { data } = await supabase.from('project_review_signoffs')
      .upsert(payload as any, { onConflict: 'review_id,role' }).select().single();
    if (data) setSignoffs(prev => {
      const rest = prev.filter(s => s.role !== role);
      return [...rest, data as any];
    });
    await logEvent(review.id, approved ? `Godkänd av ${role}` : `Godkännande återkallat (${role})`, role, { name });
    const refreshed = await supabase.from('project_review_events').select('*').eq('review_id', review.id).order('created_at', { ascending: false }).limit(50);
    setEvents((refreshed.data as any) || []);
  }, [review, signoffs, user, logEvent]);

  /** Raderar hela projektgenomgången permanent (inkl. svar, rader, sign-off och historik). */
  const deleteReview = useCallback(async () => {
    if (!review) return false;
    const rid = review.id;
    // Underliggande tabeller raderas via ON DELETE CASCADE

    const { error } = await supabase.from('project_reviews').delete().eq('id', rid);
    if (error) return false;
    setReview(null); setAnswers({}); setRows([]); setSignoffs([]); setEvents([]);
    return true;
  }, [review]);

  return {
    review, template, answers, rows, signoffs, events, loading, saving,
    createReview, updateReview, setAnswer, addRow, updateRow, deleteRow, setSignoff, logEvent, reload: load,
    deleteReview,
  };
}
