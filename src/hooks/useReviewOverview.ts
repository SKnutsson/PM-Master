import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface OverviewPoint {
  /** Vad punkten gäller */
  text: string;
  category: string;
  responsible?: string | null;
  deadline?: string | null;
  status?: string | null;
  kind: 'open' | 'followup';
}

export interface ReviewOverviewEntry {
  reviewId: string;
  status: string;
  reviewDate: string | null;
  updatedAt: string;
  points: OverviewPoint[];
}

/** Sammanställning per projekt: finns genomgång, status och öppna punkter/uppföljningar. */
export function useReviewOverview() {
  const [data, setData] = useState<Record<string, ReviewOverviewEntry>>({});
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data: reviews } = await supabase
      .from('project_reviews')
      .select('id, project_id, status, review_date, updated_at');

    const list = reviews || [];
    const map: Record<string, ReviewOverviewEntry> = {};
    list.forEach((r: any) => {
      map[r.project_id] = {
        reviewId: r.id,
        status: r.status,
        reviewDate: r.review_date,
        updatedAt: r.updated_at,
        points: [],
      };
    });

    if (list.length) {
      const { data: rows } = await supabase
        .from('project_review_rows')
        .select('review_id, section_key, data')
        .in('review_id', list.map((r: any) => r.id));

      const byReview: Record<string, string> = {};
      list.forEach((r: any) => { byReview[r.id] = r.project_id; });

      (rows || []).forEach((row: any) => {
        const projectId = byReview[row.review_id];
        const entry = projectId ? map[projectId] : null;
        if (!entry) return;
        const d = row.data || {};
        if (row.section_key === 'open_points') {
          if (d.status !== 'Klar' && (d.point || d.category)) {
            entry.points.push({
              text: String(d.point || '').trim() || 'Öppen punkt',
              category: d.category || 'Öppna punkter',
              responsible: d.responsible,
              deadline: d.deadline,
              status: d.status || 'Öppen',
              kind: 'open',
            });
          }
          return;
        }
        if (d.followup === 'Ja') {
          const fallback = Object.values(d).find(v => typeof v === 'string' && v.trim()) as string | undefined;
          entry.points.push({
            text: String(d.followup_note || fallback || '').slice(0, 120) || 'Kräver uppföljning',
            category: row.section_key,
            responsible: d.followup_responsible,
            deadline: d.followup_deadline,
            status: 'Uppföljning',
            kind: 'followup',
          });
        }
      });
    }

    setData(map);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  return { overview: data, loading, reload: load };
}
