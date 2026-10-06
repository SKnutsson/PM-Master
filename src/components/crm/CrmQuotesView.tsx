import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Plus, Search, ChevronDown } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuCheckboxItem, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { useCrmData, CrmQuote } from '@/hooks/useCrmData';
import { CrmQuoteSheet } from './CrmQuoteSheet';
import { formatSEK, statusRowClass, statusBadgeClass } from '@/lib/crmConstants';
import { cn } from '@/lib/utils';
import { getQuoteProducts } from '@/lib/quoteProducts';

export function CrmQuotesView() {
  const { quotes, loading, refresh } = useCrmData();
  const [search, setSearch] = useState('');
  const [salesperson, setSalesperson] = useState<string>('all');
  const [status, setStatus] = useState<string>('all');
  const [probabilities, setProbabilities] = useState<number[]>([]);
  const [country, setCountry] = useState<string>('all');
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<CrmQuote | null>(null);

  const salespeople = useMemo(() => [...new Set(quotes.map((q) => q.salesperson).filter(Boolean))].sort(), [quotes]);
  const statuses = useMemo(() => [...new Set(quotes.map((q) => q.status).filter(Boolean))].sort(), [quotes]);
  const countries = useMemo(() => [...new Set(quotes.map((q) => q.country).filter(Boolean))].sort(), [quotes]);

  const filtered = useMemo(() => {
    return quotes.filter((q) => {
      if (salesperson !== 'all' && q.salesperson !== salesperson) return false;
      if (status !== 'all' && q.status !== status) return false;
      if (probabilities.length > 0 && !probabilities.includes(q.probability)) return false;
      if (country !== 'all' && q.country !== country) return false;
      if (search) {
        const s = search.toLowerCase();
        const hay = [q.customer_name, q.project_arena, q.product, q.quote_number, q.comment, q.city, q.responsible].join(' ').toLowerCase();
        if (!hay.includes(s)) return false;
      }
      return true;
    });
  }, [quotes, salesperson, status, probabilities, country, search]);

  const openNew = () => { setEditing(null); setSheetOpen(true); };
  const openEdit = (q: CrmQuote) => { setEditing(q); setSheetOpen(true); };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="list-page p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Alla offerter</h1>
          <p className="text-sm text-muted-foreground">{filtered.length} av {quotes.length} offerter</p>
        </div>
        <Button onClick={openNew} className="gap-2"><Plus className="h-4 w-4" /> Ny offert</Button>
      </div>

      <div>
        <div className="py-2">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            <div className="relative md:col-span-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Sök kund, projekt, ort…" className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <FilterSelect label="Säljare" value={salesperson} onChange={setSalesperson} options={salespeople} />
            <FilterSelect label="Status" value={status} onChange={setStatus} options={statuses} />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="justify-between gap-2 font-normal min-w-0" aria-label="Filtrera sannolikheter">
                  <span className="truncate">Sannolikhet: {probabilities.length === 0 ? 'Alla' : [...probabilities].sort().join(', ')}</span>
                  <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-48">
                <DropdownMenuCheckboxItem checked={probabilities.length === 0} onCheckedChange={() => setProbabilities([])} onSelect={(event) => event.preventDefault()}>
                  Sannolikhet: Alla
                </DropdownMenuCheckboxItem>
                <DropdownMenuSeparator />
                {[1, 2, 3, 4, 5].map((value) => (
                  <DropdownMenuCheckboxItem key={value} checked={probabilities.includes(value)} onSelect={(event) => event.preventDefault()} onCheckedChange={(checked) => setProbabilities((current) => checked ? [...current, value] : current.filter((p) => p !== value))}>
                    {value}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <FilterSelect label="Land" value={country} onChange={setCountry} options={countries} />
          </div>
        </div>
      </div>

      <div className="reference-list">
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
                   <td className="px-3 py-2 whitespace-nowrap text-muted-foreground">{q.source_updated_date || '—'}</td>
                  <td className="px-3 py-2 whitespace-nowrap">{q.salesperson}</td>
                  <td className="px-3 py-2 font-medium">{q.customer_name}{q.project_arena && <div className="text-xs text-muted-foreground">{q.project_arena}</div>}</td>
                  <td className="px-3 py-2 whitespace-nowrap">{q.country}</td>
                  <td className="px-3 py-2 whitespace-nowrap">{q.city || '—'}</td>
                  <td className="px-3 py-2 whitespace-nowrap font-mono text-xs">{q.quote_number}</td>
                   <td className="px-3 py-2"><div className="flex flex-wrap gap-1 min-w-40">{getQuoteProducts(q).map((p) => <span key={p.product} className="product-label" title={p.amount === null ? 'Belopp ej fördelat' : `${formatSEK(p.amount)} kr`}>{p.product}</span>)}</div></td>
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
      </div>

      <CrmQuoteSheet open={sheetOpen} onOpenChange={setSheetOpen} quote={editing} onSaved={refresh} />
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
