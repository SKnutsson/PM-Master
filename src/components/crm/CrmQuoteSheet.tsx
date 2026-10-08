import { useState, useEffect } from 'react';
import { format, parseISO } from 'date-fns';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon, FileText, Upload, Trash2, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { CrmQuote } from '@/hooks/useCrmData';
import { SALESPEOPLE, COUNTRIES, PRODUCTS, QUOTE_STATUSES } from '@/lib/crmConstants';
import { getQuoteProducts, productAllocationError, ProductAllocation } from '@/lib/quoteProducts';
import { formatSEK } from '@/lib/crmConstants';

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  quote: CrmQuote | null;
  onSaved?: () => void;
}

const emptyQuote = (): Partial<CrmQuote> => ({
  quote_date: format(new Date(), 'yyyy-MM-dd'),
  source_updated_date: null,
  salesperson: '',
  responsible: '',
  customer_name: '',
  country: 'Sverige',
  city: '',
  project_arena: '',
  product: '',
  quantity_spec: '',
  amount: 0,
  delivery_time: '',
  prescriber: false,
  probability: 3,
  status: 'Öppen',
  next_followup: null,
  comment: '',
  contact_name: '',
  contact_phone: '',
  contact_email: '',
  pdf_path: null,
  pdf_name: null,
});

export function CrmQuoteSheet({ open, onOpenChange, quote, onSaved }: Props) {
  const { user } = useAuth();
  const [form, setForm] = useState<Partial<CrmQuote>>(emptyQuote());
  const [newComment, setNewComment] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [pendingPdfDelete, setPendingPdfDelete] = useState<string[]>([]);
  const [productRows, setProductRows] = useState<ProductAllocation[]>([]);
  const [productsChanged, setProductsChanged] = useState(false);
  const [projects, setProjects] = useState<{ id: string; name: string; code: string | null; status: string }[]>([]);
  const [projectCode, setProjectCode] = useState('');
  const [createProject, setCreateProject] = useState(false);

  useEffect(() => {
    setForm(quote ? { ...quote } : emptyQuote());
    setNewComment('');
    setPendingPdfDelete([]);
    setProductRows(quote ? getQuoteProducts(quote) : [{ product: '', amount: 0 }]);
    setProductsChanged(false);
    setProjectCode('');
    setCreateProject(false);
    if (open) {
      supabase.from('projects').select('id, name, code, status').order('code', { ascending: false }).then(({ data }) => setProjects((data as any) || []));
    }
  }, [quote, open]);

  const upd = (k: keyof CrmQuote, v: any) => setForm((f) => ({ ...f, [k]: v }));
  const changeProducts = (rows: ProductAllocation[]) => { setProductRows(rows); setProductsChanged(true); };
  const allocated = productRows.reduce((sum, row) => sum + (row.amount ?? 0), 0);
  const allocationDifference = Number(form.amount || 0) - allocated;
  const productOptions = [...new Set([...PRODUCTS, ...productRows.map((r) => r.product).filter(Boolean)])];

  const handleSave = async () => {
    const mustAllocate = !quote || productsChanged || !!quote.product_allocations || Number(form.amount) !== Number(quote.amount);
    const allocationError = mustAllocate ? productAllocationError(productRows, Number(form.amount || 0)) : null;
    if (allocationError) { toast.error(allocationError); return; }
    setSaving(true);
    let combinedComment = form.comment || '';
    if (newComment.trim()) {
      const author = user?.email?.split('@')[0] || 'Okänd';
      const stamp = format(new Date(), 'yyyy-MM-dd HH:mm');
      const entry = `[${stamp} • ${author}] ${newComment.trim()}`;
      combinedComment = combinedComment ? `${entry}\n${combinedComment}` : entry;
    }

    const payload: any = {
      quote_date: form.quote_date,
      source_updated_date: form.source_updated_date || null,
      salesperson: form.salesperson || '',
      responsible: form.responsible || '',
      customer_name: form.customer_name || '',
      country: form.country || '',
      city: form.city || null,
      project_arena: form.project_arena || '',
      product: mustAllocate ? productRows.map((r) => r.product).join(' | ') : form.product || '',
      product_allocations: mustAllocate ? productRows : null,
      quantity_spec: form.quantity_spec || '',
      amount: Number(form.amount || 0),
      delivery_time: form.delivery_time || '',
      prescriber: !!form.prescriber,
      probability: Number(form.probability || 3),
      status: form.status || 'Öppen',
      next_followup: form.next_followup || null,
      comment: combinedComment,
      contact_name: form.contact_name || null,
      contact_phone: form.contact_phone || null,
      contact_email: form.contact_email || null,
      pdf_path: form.pdf_path || null,
      pdf_name: form.pdf_name || null,
      project_id: form.project_id || null,
    };
    if (form.quote_number) payload.quote_number = form.quote_number;

    if (payload.status === 'Order' && !payload.project_id && createProject) {
      if (!projectCode.trim()) { setSaving(false); toast.error('Ange projektnummer för att skapa projektet'); return; }
      const { data: maxRow } = await supabase.from('projects').select('sort_order').order('sort_order', { ascending: false }).limit(1).maybeSingle();
      const { data: created, error: projectError } = await supabase.from('projects').insert({
        name: payload.project_arena || payload.customer_name || 'Nytt projekt',
        customer: payload.customer_name || '',
        code: projectCode.trim(),
        department: 'Projektledare',
        status: 'Pågår',
        sales_person: payload.salesperson || null,
        product: payload.product || null,
        address: payload.city || null,
        sort_order: (maxRow?.sort_order ?? 0) + 1,
      }).select('id').single();
      if (projectError || !created) { setSaving(false); toast.error('Kunde inte skapa projekt: ' + (projectError?.message || '')); return; }
      payload.project_id = created.id;
      toast.success(`Projekt ${projectCode.trim()} skapat i PM Master`);
    }

    const res = quote
      ? await supabase.from('crm_quotes').update(payload).eq('id', quote.id)
      : await supabase.from('crm_quotes').insert(payload);

    setSaving(false);
    if (res.error) {
      toast.error('Kunde inte spara: ' + res.error.message);
      return;
    }
    if (pendingPdfDelete.length) {
      await supabase.storage.from('quote-pdfs').remove(pendingPdfDelete);
      setPendingPdfDelete([]);
    }
    toast.success(quote ? 'Offert uppdaterad' : 'Offert skapad');
    onSaved?.();
    onOpenChange(false);
  };

  const handlePdfUpload = async (file: File) => {
    if (file.type !== 'application/pdf') {
      toast.error('Endast PDF-filer kan bifogas');
      return;
    }
    setUploading(true);
    const path = `${crypto.randomUUID()}-${file.name.replace(/[^\w.\-]/g, '_')}`;
    const { error } = await supabase.storage.from('quote-pdfs').upload(path, file, {
      contentType: 'application/pdf',
      upsert: false,
    });
    setUploading(false);
    if (error) {
      toast.error('Kunde inte ladda upp: ' + error.message);
      return;
    }
    setForm((f) => ({ ...f, pdf_path: path, pdf_name: file.name }));
    toast.success('PDF bifogad – kom ihåg att spara');
  };

  const openPdf = async () => {
    if (!form.pdf_path) return;
    const { data, error } = await supabase.storage.from('quote-pdfs').createSignedUrl(form.pdf_path, 3600);
    if (error || !data) return toast.error('Kunde inte öppna filen');
    window.open(data.signedUrl, '_blank');
  };

  const removePdf = () => {
    if (!form.pdf_path) return;
    if (!confirm('Ta bort bifogad PDF? Filen raderas när du sparar offerten.')) return;
    setPendingPdfDelete((p) => [...p, form.pdf_path as string]);
    setForm((f) => ({ ...f, pdf_path: null, pdf_name: null }));
    toast.info('PDF tas bort när du sparar');
  };

  const handleDelete = async () => {
    if (!quote) return;
    if (!confirm('Ta bort denna offert?')) return;
    const { error } = await supabase.from('crm_quotes').delete().eq('id', quote.id);
    if (error) return toast.error(error.message);
    toast.success('Borttagen');
    onSaved?.();
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto p-0 sm:max-w-[1180px]">
        <SheetHeader className="sticky top-0 z-10 border-b border-border bg-background px-6 py-4">
          <SheetTitle>{quote ? `Redigera offert ${quote.quote_number}` : 'Ny offert'}</SheetTitle>
        </SheetHeader>

        <div className="grid gap-8 px-6 py-5 lg:grid-cols-2">
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Offertdatum"><DatePick value={form.quote_date} onChange={(v) => upd('quote_date', v)} /></Field>
              <Field label="Uppdaterad"><DatePick value={form.source_updated_date} onChange={(v) => upd('source_updated_date', v)} clearable /></Field>
            </div>
            <Field label="Offertnummer"><Input value={form.quote_number || ''} placeholder="Skapas automatiskt" onChange={(e) => upd('quote_number', e.target.value)} /></Field>
            <Field label="Säljare">
              <PersonSelect value={form.salesperson || ''} onChange={(v) => upd('salesperson', v)} />
            </Field>
            <Field label="Leveranstid"><Input placeholder="2027 Q1 / TBD" value={form.delivery_time || ''} onChange={(e) => upd('delivery_time', e.target.value)} /></Field>
            <Field label="Sannolikhet">
              <Select value={String(form.probability || 3)} onValueChange={(v) => upd('probability', Number(v))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{[1, 2, 3, 4, 5].map((n) => <SelectItem key={n} value={String(n)}>{n} – {n === 1 ? 'lägst' : n === 5 ? 'högst' : ''}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="Föreskriven">
              <div className="flex h-10 items-center gap-3 rounded-md border border-border px-3">
                <Switch checked={!!form.prescriber} onCheckedChange={(v) => upd('prescriber', v)} />
                <span className="text-sm">{form.prescriber ? 'Ja' : 'Nej'}</span>
              </div>
            </Field>
            <Field label="Ansvarig"><PersonSelect value={form.responsible || ''} onChange={(v) => upd('responsible', v)} /></Field>
            <Field label="Status">
              <Select value={form.status || 'Öppen'} onValueChange={(v) => upd('status', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{QUOTE_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="Kopplat projekt i PM Master">
              <Select value={form.project_id || '__none__'} onValueChange={(v) => { upd('project_id', v === '__none__' ? null : v); if (v !== '__none__') setCreateProject(false); }}>
                <SelectTrigger aria-label="Kopplat projekt"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Inget kopplat projekt</SelectItem>
                  {projects.map((p) => <SelectItem key={p.id} value={p.id}>{p.code ? `${p.code} – ` : ''}{p.name}{p.status === 'Avslutat' ? ' (arkiverat)' : ''}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            {form.status === 'Order' && !form.project_id && (
              <div className="space-y-3 border-l-2 border-primary bg-muted/30 p-3">
                <Field label="Projektnummer"><Input inputMode="numeric" placeholder="t.ex. 10081" value={projectCode} onChange={(e) => setProjectCode(e.target.value)} /></Field>
                <label className="flex items-center gap-3 text-sm">
                  <Switch checked={createProject} onCheckedChange={setCreateProject} aria-label="Skapa projekt i PM Master" />
                  Skapa projekt i PM Master när offerten sparas
                </label>
              </div>
            )}
            <Field label="Ny kommentar">
              <Textarea value={newComment} onChange={(e) => setNewComment(e.target.value)} placeholder="Skriv en ny daterad kommentar" rows={4} />
            </Field>
            {form.comment && <Field label="Kommentarshistorik"><div className="max-h-52 overflow-y-auto whitespace-pre-wrap rounded-md border border-border bg-muted/30 p-3 text-sm leading-relaxed">{form.comment}</div></Field>}
            <Field label="Nästa uppföljning"><DatePick value={form.next_followup} onChange={(v) => upd('next_followup', v)} clearable /></Field>
          </div>

          <div className="space-y-4">
            <Field label="Kund"><Input value={form.customer_name || ''} onChange={(e) => upd('customer_name', e.target.value)} /></Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Ort"><Input placeholder="Ange ort" value={form.city || ''} onChange={(e) => upd('city', e.target.value)} /></Field>
              <Field label="Land">
                <Select value={form.country || ''} onValueChange={(v) => upd('country', v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{COUNTRIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select>
              </Field>
            </div>
            <Field label="Projekt / arena"><Input value={form.project_arena || ''} onChange={(e) => upd('project_arena', e.target.value)} /></Field>
            <Field label="Kontaktperson"><Input placeholder="Namn" value={form.contact_name || ''} onChange={(e) => upd('contact_name', e.target.value)} /></Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Telefon"><Input placeholder="070-123 45 67" value={form.contact_phone || ''} onChange={(e) => upd('contact_phone', e.target.value)} /></Field>
              <Field label="E-post"><Input type="email" placeholder="namn@foretag.se" value={form.contact_email || ''} onChange={(e) => upd('contact_email', e.target.value)} /></Field>
            </div>
            <Field label="Produktgrupper">
              <div className="border border-border">
                <div className="grid grid-cols-[minmax(0,1fr)_130px_32px] gap-2 bg-muted px-2 py-2 text-xs uppercase text-muted-foreground"><span>Produktgrupp</span><span>Belopp (SEK)</span><span /></div>
                {productRows.map((row, index) => (
                  <div key={index} className="grid grid-cols-[minmax(0,1fr)_130px_32px] items-center gap-2 border-t border-border p-2">
                    <Select value={row.product} onValueChange={(product) => changeProducts(productRows.map((r, i) => i === index ? { ...r, product } : r))}>
                      <SelectTrigger aria-label={`Produktgrupp ${index + 1}`} className="min-w-0"><SelectValue placeholder="Välj produktgrupp" /></SelectTrigger>
                      <SelectContent>{productOptions.filter((p) => p === row.product || !productRows.some((r) => r.product === p)).map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                    </Select>
                    <Input aria-label={`Produktbelopp ${index + 1}`} type="number" min="0" step="0.01" value={row.amount ?? ''} placeholder="Ej fördelat" onChange={(e) => changeProducts(productRows.map((r, i) => i === index ? { ...r, amount: e.target.value === '' ? null : Number(e.target.value) } : r))} />
                    <Button size="icon" variant="ghost" title="Ta bort produktgrupp" aria-label={`Ta bort produktgrupp ${index + 1}`} onClick={() => changeProducts(productRows.filter((_, i) => i !== index))}><Trash2 className="h-3.5 w-3.5" /></Button>
                  </div>
                ))}
                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border p-2">
                  <Button variant="outline" size="sm" className="gap-1" onClick={() => changeProducts([...productRows, { product: '', amount: null }])}><Plus className="h-3 w-3" />Produktgrupp</Button>
                  <span className={cn('text-xs', Math.abs(allocationDifference) > 0.01 ? 'text-destructive' : 'text-primary')}>Fördelat: {formatSEK(allocated)} kr · Kvar: {formatSEK(allocationDifference)} kr</span>
                </div>
              </div>
            </Field>
            <Field label="Antal / specifikation"><Input value={form.quantity_spec || ''} onChange={(e) => upd('quantity_spec', e.target.value)} /></Field>
            <Field label="Offertbelopp (SEK)"><Input type="number" value={form.amount === undefined ? '' : String(form.amount)} placeholder="0" onChange={(e) => upd('amount', e.target.value === '' ? 0 : Number(e.target.value))} /></Field>
            <Field label="Offert (PDF)">
            {form.pdf_path ? (
              <div className="flex items-center gap-2 rounded-md border border-border bg-muted/30 px-3 py-2">
                <FileText className="h-4 w-4 text-primary" />
                <button type="button" onClick={openPdf} className="flex-1 truncate text-left text-sm hover:underline">
                  {form.pdf_name || 'Offert.pdf'}
                </button>
                <Button variant="ghost" size="sm" className="text-destructive hover:bg-destructive/10" onClick={removePdf}>
                  Ta bort
                </Button>
              </div>
            ) : (
              <label className="flex h-10 cursor-pointer items-center gap-2 rounded-md border border-dashed border-border px-3 text-sm text-muted-foreground hover:bg-muted/40">
                <Upload className="h-4 w-4" />
                {uploading ? 'Laddar upp…' : 'Bifoga PDF'}
                <input
                  type="file"
                  accept="application/pdf"
                  className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) handlePdfUpload(f); e.target.value = ''; }}
                />
              </label>
            )}
          </Field>
          </div>
        </div>

        <div className="sticky bottom-0 flex items-center justify-between gap-2 border-t border-border bg-background px-6 py-4">
          <div>
            {quote && (
              <Button variant="ghost" className="gap-2 text-destructive hover:bg-destructive/10" onClick={handleDelete}>
                <Trash2 className="h-4 w-4" /> Ta bort
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Avbryt</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? 'Sparar…' : 'Spara'}</Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <Label className="text-xs font-medium text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

function PersonSelect({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const options = value && !SALESPEOPLE.includes(value as typeof SALESPEOPLE[number]) ? [value, ...SALESPEOPLE] : SALESPEOPLE;
  return <Select value={value} onValueChange={onChange}><SelectTrigger><SelectValue placeholder="Välj" /></SelectTrigger><SelectContent>{options.map((person) => <SelectItem key={person} value={person}>{person}</SelectItem>)}</SelectContent></Select>;
}

function DatePick({ value, onChange, clearable }: { value?: string | null; onChange: (v: string | null) => void; clearable?: boolean }) {
  const d = value ? parseISO(value) : undefined;
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" className={cn('w-full justify-start font-normal', !d && 'text-muted-foreground')}>
          <CalendarIcon className="mr-2 h-4 w-4" />
          {d ? format(d, 'yyyy-MM-dd') : 'Välj datum'}
          {clearable && d && (
            <span
              onClick={(e) => { e.stopPropagation(); onChange(null); }}
              className="ml-auto text-xs text-muted-foreground hover:text-destructive"
            >×</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={d}
          onSelect={(date) => onChange(date ? format(date, 'yyyy-MM-dd') : null)}
          initialFocus
          weekStartsOn={1}
          showWeekNumber
          className={cn('p-3 pointer-events-auto')}
        />
      </PopoverContent>
    </Popover>
  );
}
