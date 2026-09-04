import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { CrmQuote } from '@/hooks/useCrmData';
import { SALESPEOPLE, COUNTRIES, PRODUCTS, QUOTE_STATUSES } from '@/lib/crmConstants';

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  quote: CrmQuote | null;
  onSaved?: () => void;
}

const emptyQuote = (): Partial<CrmQuote> => ({
  quote_date: format(new Date(), 'yyyy-MM-dd'),
  salesperson: '',
  responsible: '',
  customer_name: '',
  country: 'Sverige',
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

  useEffect(() => {
    setForm(quote ? { ...quote } : emptyQuote());
    setNewComment('');
  }, [quote, open]);

  const upd = (k: keyof CrmQuote, v: any) => setForm((f) => ({ ...f, [k]: v }));

  const handleSave = async () => {
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
      salesperson: form.salesperson || '',
      responsible: form.responsible || '',
      customer_name: form.customer_name || '',
      country: form.country || '',
      project_arena: form.project_arena || '',
      product: form.product || '',
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
    };
    if (form.quote_number) payload.quote_number = form.quote_number;

    const res = quote
      ? await supabase.from('crm_quotes').update(payload).eq('id', quote.id)
      : await supabase.from('crm_quotes').insert(payload);

    setSaving(false);
    if (res.error) {
      toast.error('Kunde inte spara: ' + res.error.message);
      return;
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

  const removePdf = async () => {
    if (form.pdf_path) await supabase.storage.from('quote-pdfs').remove([form.pdf_path]);
    setForm((f) => ({ ...f, pdf_path: null, pdf_name: null }));
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
      <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{quote ? `Offert ${quote.quote_number}` : 'Ny offert'}</SheetTitle>
        </SheetHeader>

        <div className="grid grid-cols-2 gap-4 mt-6">
          <Field label="Datum">
            <DatePick value={form.quote_date} onChange={(v) => upd('quote_date', v)} />
          </Field>
          <Field label="Offert Nr">
            <Input value={form.quote_number || ''} placeholder="Auto" onChange={(e) => upd('quote_number', e.target.value)} />
          </Field>

          <Field label="Säljare">
            <Select value={form.salesperson || ''} onValueChange={(v) => upd('salesperson', v)}>
              <SelectTrigger><SelectValue placeholder="Välj" /></SelectTrigger>
              <SelectContent>{SALESPEOPLE.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="Ansvarig">
            <Select value={form.responsible || ''} onValueChange={(v) => upd('responsible', v)}>
              <SelectTrigger><SelectValue placeholder="Välj" /></SelectTrigger>
              <SelectContent>{SALESPEOPLE.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
          </Field>

          <Field label="Kund" className="col-span-2">
            <Input value={form.customer_name || ''} onChange={(e) => upd('customer_name', e.target.value)} />
          </Field>

          <Field label="Land">
            <Select value={form.country || ''} onValueChange={(v) => upd('country', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{COUNTRIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="Projekt / Arena">
            <Input value={form.project_arena || ''} onChange={(e) => upd('project_arena', e.target.value)} />
          </Field>

          <Field label="Produkt" className="col-span-2">
            <Select value={form.product || ''} onValueChange={(v) => upd('product', v)}>
              <SelectTrigger><SelectValue placeholder="Välj produkt" /></SelectTrigger>
              <SelectContent>{PRODUCTS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
            </Select>
          </Field>

          <Field label="Antal / Specifikation" className="col-span-2">
            <Input value={form.quantity_spec || ''} onChange={(e) => upd('quantity_spec', e.target.value)} />
          </Field>

          <Field label="Offertbelopp (SEK)">
            <Input type="number" value={form.amount ? String(form.amount) : ''} placeholder="0" onChange={(e) => upd('amount', e.target.value === '' ? 0 : Number(e.target.value))} />
          </Field>
          <Field label="Leveranstid">
            <Input placeholder="2026 Q3 / TBD" value={form.delivery_time || ''} onChange={(e) => upd('delivery_time', e.target.value)} />
          </Field>

          <Field label="Föreskriven">
            <div className="flex h-10 items-center gap-2">
              <Switch checked={!!form.prescriber} onCheckedChange={(v) => upd('prescriber', v)} />
              <span className="text-sm text-muted-foreground">{form.prescriber ? 'Ja' : 'Nej'}</span>
            </div>
          </Field>
          <Field label="Status">
            <Select value={form.status || 'Öppen'} onValueChange={(v) => upd('status', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{QUOTE_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
          </Field>

          <Field label="Sannolikhet (1–5)" className="col-span-2">
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => upd('probability', n)}
                  className={cn(
                    'h-10 w-10 rounded-md border text-sm font-semibold transition-all',
                    form.probability === n
                      ? 'bg-primary text-primary-foreground border-primary scale-105'
                      : 'border-border text-muted-foreground hover:bg-muted'
                  )}
                >
                  {n}
                </button>
              ))}
            </div>
          </Field>

          <Field label="Nästa uppföljning" className="col-span-2">
            <DatePick value={form.next_followup || undefined} onChange={(v) => upd('next_followup', v)} clearable />
          </Field>

          <Field label="Ny kommentar" className="col-span-2">
            <Textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Skriv en ny kommentar (sparas med datum + namn)"
              rows={3}
            />
          </Field>

          {form.comment && (
            <Field label="Kommentarshistorik" className="col-span-2">
              <div className="max-h-48 overflow-y-auto whitespace-pre-wrap rounded-md border border-border bg-muted/30 p-3 text-xs leading-relaxed">
                {form.comment}
              </div>
            </Field>
          )}
        </div>

        <div className="mt-6 flex items-center justify-between gap-2 border-t border-border pt-4">
          <div>
            {quote && (
              <Button variant="ghost" className="text-destructive hover:bg-destructive/10" onClick={handleDelete}>
                Ta bort
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

function DatePick({ value, onChange, clearable }: { value?: string | null; onChange: (v: string | null) => void; clearable?: boolean }) {
  const d = value ? new Date(value) : undefined;
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
