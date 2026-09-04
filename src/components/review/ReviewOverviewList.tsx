import { useMemo, useState } from 'react';
import { ChevronDown, ChevronRight, CircleCheck, CircleAlert, CircleDashed, Search, ClipboardList } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { DEFAULT_REVIEW_TEMPLATE } from '@/lib/reviewTemplate';
import { ReviewOverviewEntry } from '@/hooks/useReviewOverview';

interface ProjectLike { id: string; code?: string | null; name: string; customer?: string | null; projectManager?: string | null }

interface Props {
  projects: ProjectLike[];
  overview: Record<string, ReviewOverviewEntry>;
  onOpen: (projectId: string) => void;
}

type Filter = 'all' | 'none' | 'open' | 'complete';

function sectionTitle(key: string) {
  return DEFAULT_REVIEW_TEMPLATE.sections.find(s => s.key === key)?.title || key;
}

export function ReviewOverviewList({ projects, overview, onOpen }: Props) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [expanded, setExpanded] = useState<string[]>([]);

  const enriched = useMemo(() => projects.map(p => {
    const entry = overview[p.id];
    const points = entry?.points || [];
    const state: 'none' | 'open' | 'complete' | 'ongoing' =
      !entry ? 'none' : points.length > 0 ? 'open' : entry.status === 'Godkänd' ? 'complete' : 'ongoing';
    return { project: p, entry, points, state };
  }), [projects, overview]);

  const visible = enriched.filter(r => {
    if (filter === 'open' && r.state !== 'open') return false;
    if (filter === 'complete' && r.state !== 'complete') return false;
    if (!query) return true;
    const q = query.toLowerCase();
    return `${r.project.code ?? ''} ${r.project.name} ${r.project.customer ?? ''}`.toLowerCase().includes(q);
  });

  const counts = {
    all: enriched.length,
    open: enriched.filter(r => r.state === 'open').length,
    complete: enriched.filter(r => r.state === 'complete').length,
  };

  const toggle = (id: string) => setExpanded(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input value={query} onChange={e => setQuery(e.target.value)} placeholder="Sök projekt" className="h-9 w-[240px] pl-7 text-sm" />
        </div>
        {([
          ['all', `Alla (${counts.all})`],
          ['open', `Öppna punkter (${counts.open})`],
          ['complete', `Kompletta (${counts.complete})`],
        ] as [Filter, string][]).map(([k, label]) => (
          <Button key={k} size="sm" variant={filter === k ? 'default' : 'outline'} className="h-8 text-xs" onClick={() => setFilter(k)}>
            {label}
          </Button>
        ))}
        <p className="ml-auto text-xs text-muted-foreground">Välj ett projekt i listan ovan för att lägga till en ny genomgång.</p>
      </div>


      <div className="overflow-hidden rounded-lg border">
        <div className="grid grid-cols-[minmax(200px,2fr)_1fr_170px_170px_110px] items-center gap-3 border-b bg-muted/50 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          <span>Projekt</span><span>Kund</span><span>Genomgång</span><span>Öppna punkter</span><span className="text-right">Åtgärd</span>
        </div>

        {visible.length === 0 && <p className="p-6 text-center text-sm text-muted-foreground">Inga projekt matchar filtret.</p>}

        {visible.map(({ project: p, entry, points, state }) => {
          const isOpen = expanded.includes(p.id);
          return (
            <div key={p.id} className="border-b last:border-0">
              <div
                className="grid cursor-pointer grid-cols-[minmax(200px,2fr)_1fr_170px_170px_110px] items-center gap-3 px-3 py-2 text-sm transition-colors hover:bg-accent/40"
                onClick={() => (points.length ? toggle(p.id) : onOpen(p.id))}
              >
                <span className="flex items-center gap-2 truncate font-medium">
                  {points.length > 0
                    ? (isOpen ? <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" /> : <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />)
                    : <span className="w-3.5" />}
                  {p.code ? `${p.code} – ` : ''}{p.name}
                </span>
                <span className="truncate text-muted-foreground">{p.customer || '–'}</span>
                <span>
                  {state === 'none' ? (
                    <Badge variant="outline" className="gap-1 text-[10px] text-muted-foreground">
                      <CircleDashed className="h-3 w-3" />Ingen genomgång
                    </Badge>
                  ) : state === 'complete' ? (
                    <Badge className="gap-1 border-status-completed/30 bg-status-completed/15 text-[10px] text-status-completed">
                      <CircleCheck className="h-3 w-3" />Komplett
                    </Badge>
                  ) : (
                    <Badge className="gap-1 border-status-in-progress/30 bg-status-in-progress/15 text-[10px] text-status-in-progress">
                      <ClipboardList className="h-3 w-3" />{entry?.status || 'Pågår'}
                    </Badge>
                  )}
                </span>
                <span>
                  {points.length === 0
                    ? <span className="text-xs text-muted-foreground">{state === 'none' ? '–' : 'Inga öppna punkter'}</span>
                    : <Badge className="gap-1 border-status-risk/30 bg-status-risk/15 text-[10px] text-status-risk">
                        <CircleAlert className="h-3 w-3" />{points.length} att följa upp
                      </Badge>}
                </span>
                <span className="text-right">
                  <Button size="sm" variant={state === 'none' ? 'default' : 'outline'} className="h-7 text-xs"
                    onClick={(e) => { e.stopPropagation(); onOpen(p.id); }}>
                    {state === 'none' ? 'Starta' : 'Öppna'}
                  </Button>
                </span>
              </div>

              {isOpen && points.length > 0 && (
                <div className="space-y-1 bg-muted/30 px-10 py-2">
                  {points.map((pt, i) => (
                    <div key={i} className="flex flex-wrap items-center gap-2 rounded border bg-card px-2 py-1 text-xs">
                      <Badge variant="outline" className={cn('text-[10px]', pt.kind === 'followup' && 'border-status-risk/40 text-status-risk')}>
                        {pt.kind === 'followup' ? 'Uppföljning' : 'Öppen punkt'}
                      </Badge>
                      <span className="text-muted-foreground">[{sectionTitle(pt.category)}]</span>
                      <span className="flex-1">{pt.text}</span>
                      {pt.responsible && <span className="text-muted-foreground">Ansvarig: {pt.responsible}</span>}
                      {pt.deadline && <span className="text-muted-foreground">Senast: {pt.deadline}</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
