import { Plus, Trash2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ReviewFieldInput } from './ReviewFieldInput';
import { ReviewSection, riskLevel } from '@/lib/reviewTemplate';
import { RowRecord } from '@/hooks/useProjectReview';
import { cn } from '@/lib/utils';

interface Props {
  section: ReviewSection;
  rows: RowRecord[];
  onAdd: () => void;
  onUpdate: (rowId: string, data: Record<string, any>) => void;
  onDelete: (rowId: string) => void;
  filter?: string;
}

function rowWarning(section: ReviewSection, data: Record<string, any>): string | null {
  if (section.key === 'requirements') {
    if (!data.responsible) return 'Ska-krav saknar ansvarig';
    if (!data.verification) return 'Ska-krav saknar verifieringsmetod';
  }
  if (section.key === 'boundaries' && data.responsible_party === 'Oklart') return 'Oklar gränsdragning – hamnar i öppna punkter';
  if (section.key === 'scope' && data.included === 'Oklart') return 'Oklar omfattning – hamnar i öppna punkter';
  if (section.key === 'open_points' && data.status === 'Klar' && !data.responsible) return 'Kan inte vara klar utan ansvarig';
  if (section.key === 'timeline' && data.date && data.status !== 'Klar' && new Date(data.date) < new Date(new Date().toDateString())) return 'Passerad deadline';
  const missing = (section.columns || []).filter(c => c.required && !data[c.key]);
  if (missing.length) return `Obligatoriskt fält saknas: ${missing.map(m => m.label).join(', ')}`;
  return null;
}

export function ReviewTableSection({ section, rows, onAdd, onUpdate, onDelete, filter }: Props) {
  const cols = section.columns || [];
  const visible = filter
    ? rows.filter(r => JSON.stringify(r.data).toLowerCase().includes(filter.toLowerCase()))
    : rows;

  return (
    <div className="space-y-3">
      {section.description && <p className="text-xs text-muted-foreground">{section.description}</p>}

      {visible.length === 0 && (
        <p className="text-sm text-muted-foreground italic py-2">Inga rader registrerade.</p>
      )}

      <div className="space-y-2">
        {visible.map((row, idx) => {
          const warn = rowWarning(section, row.data);
          const risk = section.key === 'risks' ? riskLevel(row.data.probability, row.data.consequence) : null;
          return (
            <div
              key={row.id}
              className={cn(
                'rounded-lg border bg-card p-3',
                warn ? 'border-destructive/40' : 'border-border',
                risk && risk.level === 'Kritisk' && 'border-destructive',
              )}
            >
              <div className="mb-2 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-[10px]">#{idx + 1}</Badge>
                  {risk && risk.value > 0 && (
                    <Badge className={cn(
                      'text-[10px]',
                      risk.level === 'Låg' && 'bg-status-completed/15 text-status-completed border-status-completed/30',
                      risk.level === 'Måttlig' && 'bg-status-risk/15 text-status-risk border-status-risk/30',
                      risk.level === 'Hög' && 'bg-status-in-progress/15 text-status-in-progress border-status-in-progress/30',
                      risk.level === 'Kritisk' && 'bg-destructive/15 text-destructive border-destructive/30',
                    )}>
                      Riskvärde {risk.value} – {risk.level}
                    </Badge>
                  )}
                  {warn && (
                    <span className="flex items-center gap-1 text-[11px] text-destructive">
                      <AlertTriangle className="h-3 w-3" />{warn}
                    </span>
                  )}
                </div>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => onDelete(row.id)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>

              <div className="grid gap-2 md:grid-cols-3 xl:grid-cols-4">
                {cols.map(col => (
                  <div key={col.key} className={cn(col.type === 'textarea' && 'md:col-span-2')}>
                    <label className="mb-1 block text-[11px] font-medium text-muted-foreground">
                      {col.label}{col.required && <span className="text-destructive"> *</span>}
                    </label>
                    <ReviewFieldInput
                      field={col}
                      value={row.data[col.key]}
                      onChange={(v) => onUpdate(row.id, { [col.key]: v })}
                      compact
                    />
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <Button variant="outline" size="sm" onClick={onAdd} className="gap-2">
        <Plus className="h-4 w-4" />{section.addLabel || 'Lägg till rad'}
      </Button>
    </div>
  );
}
