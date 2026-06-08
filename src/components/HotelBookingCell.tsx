import { useState, useEffect } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ProjectInstaller } from '@/hooks/useResourceData';

type HotelStatus = ProjectInstaller['hotelStatus'];

const STATUS_OPTIONS: { value: HotelStatus; label: string; dot: string }[] = [
  { value: 'bokat', label: 'Bokat', dot: 'bg-status-completed' },
  { value: 'ej_bokat', label: 'Ej bokat', dot: 'bg-status-delayed' },
  { value: 'ej_relevant', label: 'Ej relevant', dot: 'bg-muted-foreground' },
];

function badgeClasses(status: HotelStatus) {
  switch (status) {
    case 'bokat':
      return 'border-status-completed/40 bg-status-completed/10 text-status-completed';
    case 'ej_bokat':
      return 'border-status-delayed/40 bg-status-delayed/10 text-status-delayed';
    case 'ej_relevant':
    default:
      return 'border-border bg-muted/40 text-muted-foreground';
  }
}

interface Props {
  pi: ProjectInstaller;
  onSave: (updates: { hotelStatus?: HotelStatus; hotelName?: string | null; hotelNotering?: string | null }) => Promise<void> | void;
}

export function HotelBookingCell({ pi, onSave }: Props) {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<HotelStatus>(pi.hotelStatus);
  const [name, setName] = useState(pi.hotelName ?? '');
  const [note, setNote] = useState(pi.hotelNotering ?? '');

  useEffect(() => {
    if (open) {
      setStatus(pi.hotelStatus);
      setName(pi.hotelName ?? '');
      setNote(pi.hotelNotering ?? '');
    }
  }, [open, pi.hotelStatus, pi.hotelName, pi.hotelNotering]);

  const label =
    pi.hotelStatus === 'bokat'
      ? pi.hotelName?.trim() || 'Bokat'
      : pi.hotelStatus === 'ej_bokat'
      ? 'Ej bokat'
      : 'Ej relevant';

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className={cn(
            'inline-flex items-center gap-1 max-w-full rounded-full border px-2 py-0.5 text-[10px] font-medium truncate hover:opacity-80 transition',
            badgeClasses(pi.hotelStatus)
          )}
          title="Hotellbokning"
        >
          {pi.hotelStatus === 'bokat' && <Check className="h-2.5 w-2.5 shrink-0" />}
          <span className="truncate">{label}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-2 space-y-2" align="start">
        <div className="space-y-1">
          {STATUS_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setStatus(opt.value)}
              className={cn(
                'flex items-center gap-2 w-full rounded px-2 py-1 text-xs text-left hover:bg-muted',
                status === opt.value && 'bg-muted'
              )}
            >
              <span className={cn('h-2 w-2 rounded-full', opt.dot)} />
              <span className="flex-1">{opt.label}</span>
              {status === opt.value && <Check className="h-3 w-3 text-primary" />}
            </button>
          ))}
        </div>
        <div className="space-y-1 border-t border-border pt-2">
          <label className="text-[10px] font-semibold text-muted-foreground">Hotellnamn / notering</label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="t.ex. Comfort Inn"
            className="h-7 text-xs"
          />
          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Notering..."
            className="min-h-[50px] text-xs resize-none"
          />
        </div>
        <div className="flex justify-end gap-1">
          <Button variant="outline" size="sm" className="h-6 text-[11px]" onClick={() => setOpen(false)}>
            Avbryt
          </Button>
          <Button
            size="sm"
            className="h-6 text-[11px]"
            onClick={async () => {
              await onSave({
                hotelStatus: status,
                hotelName: name.trim() ? name.trim() : null,
                hotelNotering: note.trim() ? note.trim() : null,
              });
              setOpen(false);
            }}
          >
            Spara
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
