import { useState, useEffect, useRef } from 'react';
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
import { CalendarIcon, Upload, Trash2, Plus } from 'lucide-react';
import { QuoteAttachments } from './QuoteAttachments';
import { quoteAttachmentPath } from '@/lib/quoteAttachments';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { CrmQuote } from '@/hooks/useCrmData';
import { SALESPEOPLE, COUNTRIES, PRODUCTS, QUOTE_STATUSES } from '@/lib/crmConstants';
import { getQuoteProducts, productAllocationError, ProductAllocation } from '@/lib/quoteProducts';
import { formatSEK } from '@/lib/crmConstants';
import { requiresDeliveryMonth, deliveryMonthError, monthInputToDate, dateToMonthInput } from '@/lib/deliveryMonth';

const isDroppable = (dt: DataTransfer) => dt.types.includes('Files') || dt.types.includes('text/uri-list') || dt.types.includes('text/plain');

function droppedUrls(dt: DataTransfer): string[] {
  const raw = dt.getData('text/uri-list') || dt.getData('text/plain') || '';
  return [...new Set(raw.split(/\r?\n/).map(s => s.trim()).filter(s => s && !s.startsWith('#') && /^https?:\/\//i.test(s)))].slice(0, 10);
}

async function fetchPdfFromUrl(url: string): Promise<File | null> {
  const id = toast.loading('Hämtar PDF från ert system…');
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch(`https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/import-quote-url`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY, Authorization: `Bearer ${session?.access_token ?? ''}` },
      body: JSON.stringify({ url }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      toast.error(body.error || 'Kunde inte hämta PDF:en', { id });
      return null;
    }
    const blob = await res.blob();
    let name = decodeURIComponent(new URL(url).pathname.split('/').pop() || 'Offert.pdf');
    if (!/\.pdf$/i.test(name)) name += '.pdf';
    toast.success(`${name} hämtad`, { id });
    return new File([blob], name, { type: 'application/pdf' });
  } catch {
    toast.error('Kunde inte hämta PDF:en', { id });
    return null;
  }
}

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
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [droppedFiles, setDroppedFiles] = useState<File[]>([]);
  const [draggingFiles, setDraggingFiles] = useState(false);
  const dragDepth = useRef(0);
  const [productRows, setProductRows] = useState<ProductAllocation[]>([]);
  const [productsChanged, setProductsChanged] = useState(false);
  const [projects, setProjects] = useState<{ id: string; name: string; code: string | null; status: string }[]>([]);
  const [projectCode, setProjectCode] = useState('');
  const [createProject, setCreateProject] = useState(false);

  useEffect(() => {
    setForm(quote ? { ...quote } : emptyQuote());
    setNewComment('');
    setPendingFiles([]);
    setDroppedFiles([]);
    setDraggingFiles(false);
    dragDepth.current = 0;
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
    const monthError = deliveryMonthError(form.probability, form.status, (form as any).delivery_month);
    if (monthError) { toast.error(monthError); return; }
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
      delivery_month: (form as any).delivery_month || null,
      prescriber: !!form.prescriber,
      probability: Number(form.probability || 3),
      status: form.status || 'Öppen',
      next_followup: form.next_followup || null,
      comment: combinedComment,
      contact_name: form.contact_name || null,
      contact_phone: form.contact_phone || null,
      contact_email: form.contact_email || null,
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

    const currentId = form.id || quote?.id;
    const res = currentId
      ? await supabase.from('crm_quotes').update(payload).eq('id', currentId).select('id').single()
      : await supabase.from('crm_quotes').insert(payload).select('id').single();

    if (res.error || !res.data) {
      setSaving(false);
      toast.error('Kunde inte spara: ' + (res.error?.message || 'Offerten kunde inte hämtas'));
      return;
    }
    const savedId = res.data.id;
    setDroppedFiles([]);
    setForm(current => ({ ...current, id: savedId, project_id: payload.project_id, comment: combinedComment }));
    setNewComment('');
    const failed: File[] = [];
    for (const file of pendingFiles) {
      const path = quoteAttachmentPath(savedId, file.name);
      const uploaded = await supabase.storage.from('quote-pdfs').upload(path, file, { contentType: 'application/pdf' });
      if (uploaded.error) { failed.push(file); toast.error(`${file.name}: ${uploaded.error.message}`); continue; }
      const attached = await supabase.from('crm_quote_attachments').insert({ quote_id: savedId, name: file.name, path, size: file.size });
      if (attached.error) {
        await supabase.storage.from('quote-pdfs').remove([path]);
        failed.push(file);
        toast.error(`Kunde inte spara ${file.name}`);
      }
    }
    setPendingFiles(failed);
    setSaving(false);
    if (failed.length) { onSaved?.(); return; }
    toast.success(quote ? 'Offert uppdaterad' : 'Offert skapad');
    onSaved?.();
    onOpenChange(false);
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
    <Sheet open={open} onOpenChange={next => { if (!uploading && !saving) onOpenChange(next); }}>
      <SheetContent side="right" className="w-full overflow-y-auto p-0 sm:max-w-[1180px]"
        onInteractOutside={event => { if (uploading || saving) event.preventDefault(); }}
        onEscapeKeyDown={event => { if (uploading || saving) event.preventDefault(); }}
        onDragEnter={event => { if (!isDroppable(event.dataTransfer)) return; event.preventDefault(); dragDepth.current += 1; setDraggingFiles(true); }}
        onDragOver={event => { if (!isDroppable(event.dataTransfer)) return; event.preventDefault(); event.dataTransfer.dropEffect = uploading || saving ? 'none' : 'copy'; }}
        onDragLeave={event => { event.preventDefault(); dragDepth.current = Math.max(0, dragDepth.current - 1); if (!dragDepth.current) setDraggingFiles(false); }}
        onDrop={event => {
          event.preventDefault(); dragDepth.current = 0; setDraggingFiles(false); if (uploading || saving) return;
          const files = Array.from(event.dataTransfer.files);
          if (files.length) { setDroppedFiles(files); return; }
          const urls = droppedUrls(event.dataTransfer);
          if (!urls.length) return;
          setUploading(true);
          void Promise.all(urls.map(fetchPdfFromUrl)).then(results => {
            const ok = results.filter((f): f is File => !!f);
            if (ok.length) setDroppedFiles(ok);
          }).finally(() => setUploading(false));
        }}>
        {draggingFiles && <div className="pointer-events-none absolute inset-0 z-50 flex items-center justify-center border-2 border-dashed border-primary bg-background/95 text-primary"><div className="flex items-center gap-3 text-xl"><Upload className="h-6 w-6" />Släpp PDF-filer här</div></div>}
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
            <Field label={requiresDeliveryMonth(form.probability, form.status) ? 'Leveransmånad *' : 'Leveransmånad'}>
              <Input type="month" value={dateToMonthInput((form as any).delivery_month)} onChange={(e) => upd('delivery_month' as any, monthInputToDate(e.target.value))}
                className={cn(requiresDeliveryMonth(form.probability, form.status) && !(form as any).delivery_month && 'border-destructive')} />
            </Field>
            <Field label="Leveranstid (fritext)"><Input placeholder="2027 Q1 / Vecka 34" value={form.delivery_time || ''} onChange={(e) => upd('delivery_time', e.target.value)} /></Field>
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
            <Field label="Bilagor (PDF)">
              {open && <QuoteAttachments key={form.id || quote?.id || 'new'} quoteId={form.id || quote?.id} droppedFiles={droppedFiles} pendingFiles={pendingFiles} onPendingChange={setPendingFiles} onBusyChange={setUploading} />}
          </Field>
          </div>
        </div>

        <div className="sticky bottom-0 flex items-center justify-between gap-2 border-t border-border bg-background px-6 py-4">
          <div>
            {quote && (
              <Button variant="ghost" disabled={uploading || saving} className="gap-2 text-destructive hover:bg-destructive/10" onClick={handleDelete}>
                <Trash2 className="h-4 w-4" /> Ta bort
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" disabled={uploading || saving} onClick={() => onOpenChange(false)}>Avbryt</Button>
            <Button onClick={handleSave} disabled={saving || uploading}>{saving ? 'Sparar…' : 'Spara'}</Button>
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
