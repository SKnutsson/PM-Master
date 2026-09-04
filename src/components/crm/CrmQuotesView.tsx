import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Plus, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useCrmData, CrmQuote } from '@/hooks/useCrmData';
import { CrmQuoteSheet } from './CrmQuoteSheet';
import { SALESPEOPLE, QUOTE_STATUSES, COUNTRIES, CITIES, formatSEK, statusRowClass, statusBadgeClass } from '@/lib/crmConstants';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

export function CrmQuotesView() {
  const { quotes, loading } = useCrmData();
  const [search, setSearch] = useState('');
  const [salesperson, setSalesperson] = useState<string>('all');
  const [status, setStatus] = useState<string>('all');
  const [probability, setProbability] = useState<string>('all');
  const [country, setCountry] = useState<string>('all');
  const [city, setCity] = useState<string>('all');
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<CrmQuote | null>(null);

  const filtered = useMemo(() => {
    return quotes.filter((q) => {
      if (salesperson !== 'all' && q.salesperson !== salesperson) return false;
      if (status !== 'all' && q.status !== status) return false;
      if (probability !== 'all' && String(q.probability) !== probability) return false;
      if (country !== 'all' && q.country !== country) return false;
      if (city !== 'all' && q.city !== city) return false;
      if (search) {
        const s = search.toLowerCase();
        const hay = [q.customer_name, q.project_arena, q.product, q.quote_number, q.comment, q.city].join(' ').toLowerCase();
        if (!hay.includes(s)) return false;
      }
      return true;
    });
  }, [quotes, salesperson, status, probability, country, city, search]);

  const openNew = () => { setEditing(null); setSheetOpen(true); };
  const openEdit = (q: CrmQuote) => { setEditing(q); setSheetOpen(true); };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-6 space-y-4 min-w-[1200px]">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Alla offerter</h1>
          <p className="text-sm text-muted-foreground">{filtered.length} av {quotes.length} offerter</p>
        </div>
        <Button onClick={openNew} className="gap-2"><Plus className="h-4 w-4" /> Ny offert</Button>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
            <div className="relative md:col-span-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Sök kund, projekt, produkt…" className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <FilterSelect label="Säljare" value={salesperson} onChange={setSalesperson} options={SALESPEOPLE as readonly string[]} />
            <FilterSelect label="Status" value={status} onChange={setStatus} options={QUOTE_STATUSES as readonly string[]} />
            <FilterSelect label="Sannolikhet" value={probability} onChange={setProbability} options={['1', '2', '3', '4', '5']} />
            <FilterSelect label="Land" value={country} onChange={setCountry} options={COUNTRIES as readonly string[]} />
            <FilterSelect label="Ort" value={city} onChange={setCity} options={CITIES as readonly string[]} />
          </div>
        </CardContent>
      </Card>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                {['Datum', 'Uppd.', 'Säljare', 'Kund', 'Land', 'Ort', 'Offert nr', 'Produkt', 'Antal/Spec', 'Lev. tid', 'Föresk.', 'Sannol.', 'Belopp', 'Ansvarig', 'Uppföljning', 'Status', 'Kommentar'].map((h) => (
                  <th key={h} className="px-3 py-2 text-left font-medium whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={17} className="p-8 text-center text-muted-foreground">Laddar…</td></tr>}
              {!loading && filtered.length === 0 && <tr><td colSpan={17} className="p-8 text-center text-muted-foreground">Inga offerter matchar filtren.</td></tr>}
              {filtered.map((q) => (
                <tr
                  key={q.id}
                  onClick={() => openEdit(q)}
                  className={cn('cursor-pointer border-t border-border transition-colors', statusRowClass(q.status))}
                >
                  <td className="px-3 py-2 whitespace-nowrap">{q.quote_date}</td>
                  <td className="px-3 py-2 whitespace-nowrap text-muted-foreground">{q.updated_at ? format(new Date(q.updated_at), 'yyyy-MM-dd') : ''}</td>
                  <td className="px-3 py-2 whitespace-nowrap">{q.salesperson}</td>
                  <td className="px-3 py-2 font-medium">{q.customer_name}{q.project_arena && <div className="text-xs text-muted-foreground">{q.project_arena}</div>}</td>
                  <td className="px-3 py-2 whitespace-nowrap">{q.country}</td>
                  <td className="px-3 py-2 whitespace-nowrap">{q.city || '—'}</td>
                  <td className="px-3 py-2 whitespace-nowrap font-mono text-xs">{q.quote_number}</td>
                  <td className="px-3 py-2 whitespace-nowrap">{q.product}</td>
                  <td className="px-3 py-2 max-w-[160px] truncate" title={q.quantity_spec}>{q.quantity_spec}</td>
                  <td className="px-3 py-2 whitespace-nowrap">{q.delivery_time}</td>
                  <td className="px-3 py-2">{q.prescriber ? '✓' : '–'}</td>
                  <td className="px-3 py-2">
                    <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-primary/10 px-1.5 text-xs font-semibold text-primary">{q.probability}</span>
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap font-semibold tabular-nums">{formatSEK(q.amount)}</td>
                  <td className="px-3 py-2 whitespace-nowrap">{q.responsible}</td>
                  <td className="px-3 py-2 whitespace-nowrap">{q.next_followup || '—'}</td>
                  <td className="px-3 py-2">
                    <Badge variant="outline" className={cn('text-xs', statusBadgeClass(q.status))}>{q.status}</Badge>
                  </td>
                  <td className="px-3 py-2 max-w-[200px] truncate text-muted-foreground" title={q.comment}>
                    {q.comment?.split('\n')[0] || '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <CrmQuoteSheet open={sheetOpen} onOpenChange={setSheetOpen} quote={editing} />
    </motion.div>
  );
}

function FilterSelect({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: readonly string[] }) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger><SelectValue placeholder={label} /></SelectTrigger>
      <SelectContent>
        <SelectItem value="all">{label}: Alla</SelectItem>
        {options.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}
