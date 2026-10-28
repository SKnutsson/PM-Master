import { useEffect, useMemo, useState } from 'react';
import { Check, ChevronsUpDown, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

type QuoteOption = { id: string; quote_number: string; customer_name: string | null; project_arena: string | null; probability: number; amount: number };

/** Links a budget row to a quote. Saves only the link, never the budget amounts or history. */
export function ForecastQuoteLink({ forecastId, quoteId, onChanged }: { forecastId: string; quoteId: string | null; onChanged?: (id: string | null) => void }) {
  const [quotes, setQuotes] = useState<QuoteOption[]>([]);
  const [value, setValue] = useState<string | null>(quoteId);
  const [open, setOpen] = useState(false);

  useEffect(() => { setValue(quoteId); }, [quoteId]);
  useEffect(() => {
    supabase.from('crm_quotes').select('id, quote_number, customer_name, project_arena, probability, amount')
      .order('quote_date', { ascending: false }).then(({ data }) => setQuotes((data as QuoteOption[]) || []));
  }, []);

  const selected = useMemo(() => quotes.find(q => q.id === value), [quotes, value]);
  const label = (q: QuoteOption) => `${q.quote_number} · ${q.project_arena || q.customer_name || ''}`;

  const save = async (id: string | null) => {
    setOpen(false);
    const { error } = await supabase.from('forecasts').update({ quote_id: id } as any).eq('id', forecastId);
    if (error) { toast.error('Kunde inte koppla offert: ' + error.message); return; }
    setValue(id);
    onChanged?.(id);
    toast.success(id ? 'Offert kopplad' : 'Koppling borttagen');
  };

  return (
    <div className="grid gap-2">
      <Label>Kopplad offert</Label>
      <div className="flex gap-2">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button type="button" variant="outline" className="flex-1 justify-between font-normal">
              <span className="truncate">{selected ? label(selected) : 'Välj offert…'}</span>
              <ChevronsUpDown className="h-4 w-4 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[460px] p-0" align="start">
            <Command>
              <CommandInput placeholder="Sök offertnummer eller kund…" />
              <CommandList>
                <CommandEmpty>Ingen offert hittades</CommandEmpty>
                {quotes.map(q => (
                  <CommandItem key={q.id} value={`${q.quote_number} ${q.customer_name} ${q.project_arena}`} onSelect={() => save(q.id)}>
                    <Check className={cn('mr-2 h-4 w-4', value === q.id ? 'opacity-100' : 'opacity-0')} />
                    <span className="truncate flex-1">{label(q)}</span>
                    <span className="ml-2 text-xs text-muted-foreground">S{q.probability}</span>
                  </CommandItem>
                ))}
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
        {value && <Button type="button" variant="ghost" size="icon" onClick={() => save(null)} title="Ta bort koppling"><X className="h-4 w-4" /></Button>}
      </div>
      <p className="text-xs text-muted-foreground">Kopplingen sparas direkt och ändrar inte belopp eller flytthistorik.</p>
    </div>
  );
}
