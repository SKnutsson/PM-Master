import { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Mail, Phone, Building2, MapPin, Trash2, Calendar as CalendarIcon, User as UserIcon, X } from 'lucide-react';
import { format } from 'date-fns';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { useCrmData, CrmCustomer } from '@/hooks/useCrmData';
import { supabase } from '@/integrations/supabase/client';
import { COUNTRIES, PRODUCTS, SALESPEOPLE, formatSEK } from '@/lib/crmConstants';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface FormState {
  name: string;
  arena: string;
  city: string;
  country: string;
  salesperson: string;
  visit_date: string | null;
  next_followup: string | null;
  products: string[];
  notes: string;
}

const emptyForm = (): FormState => ({
  name: '', arena: '', city: '', country: 'Sverige', salesperson: '',
  visit_date: null, next_followup: null, products: [], notes: '',
});

export function CrmCustomersView() {
  const { customers, contacts, quotes, refresh } = useCrmData();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<CrmCustomer | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [newContact, setNewContact] = useState({ name: '', email: '', phone: '', role: '' });

  const openNew = () => { setEditing(null); setForm(emptyForm()); setOpen(true); };
  const openEdit = (c: CrmCustomer) => {
    setEditing(c);
    setForm({
      name: c.name, arena: c.arena || '', city: c.city || '', country: c.country || 'Sverige',
      salesperson: c.salesperson || '', visit_date: c.visit_date, next_followup: c.next_followup,
      products: Array.isArray(c.products) ? c.products : [], notes: c.notes || '',
    });
    setOpen(true);
  };

  const save = async () => {
    if (!form.name.trim()) return toast.error('Kundnamn krävs');
    const payload = { ...form, products: form.products as any };
    const res = editing
      ? await supabase.from('crm_customers').update(payload).eq('id', editing.id)
      : await supabase.from('crm_customers').insert(payload);
    if (res.error) return toast.error(res.error.message);
    toast.success('Sparat');
    setOpen(false);
    refresh();
  };

  const addContact = async (customerId: string) => {
    if (!newContact.name.trim()) return;
    const { error } = await supabase.from('crm_contacts').insert({ customer_id: customerId, ...newContact });
    if (error) return toast.error(error.message);
    setNewContact({ name: '', email: '', phone: '', role: '' });
    refresh();
  };

  const deleteContact = async (id: string) => {
    await supabase.from('crm_contacts').delete().eq('id', id);
    refresh();
  };

  const toggleProduct = (p: string) => {
    setForm((f) => ({ ...f, products: f.products.includes(p) ? f.products.filter((x) => x !== p) : [...f.products, p] }));
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Kunder</h1>
          <p className="text-sm text-muted-foreground">{customers.length} kunder</p>
        </div>
        <Button onClick={openNew} className="gap-2"><Plus className="h-4 w-4" /> Ny kund</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {customers.map((c) => {
          const cContacts = contacts.filter((x) => x.customer_id === c.id);
          const cQuotes = quotes.filter((q) => q.customer_id === c.id || q.customer_name === c.name);
          const products = Array.isArray(c.products) ? c.products : [];
          return (
            <Card key={c.id} className="overflow-hidden hover:shadow-md transition-shadow">
              <div className="bg-gradient-to-r from-primary/10 to-transparent p-4 border-b border-border">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="font-semibold text-lg leading-tight">{c.name}</h3>
                    {c.arena && <p className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5"><Building2 className="h-3 w-3" /> {c.arena}</p>}
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                      <MapPin className="h-3 w-3" /> {[c.city, c.country].filter(Boolean).join(', ') || '—'}
                    </p>
                    {c.salesperson && <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5"><UserIcon className="h-3 w-3" /> Säljare: {c.salesperson}</p>}
                    {(c.visit_date || c.next_followup) && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                        <CalendarIcon className="h-3 w-3" />
                        {c.visit_date && <>Besök: {c.visit_date}</>}
                        {c.visit_date && c.next_followup && <span className="mx-1">·</span>}
                        {c.next_followup && <>Uppf: {c.next_followup}</>}
                      </p>
                    )}
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => openEdit(c)}>Redigera</Button>
                </div>
                {products.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {products.map((p) => <Badge key={p} variant="secondary" className="text-[10px]">{p}</Badge>)}
                  </div>
                )}
              </div>
              <CardContent className="p-4 space-y-3">
                <div>
                  <div className="text-xs uppercase tracking-wide text-muted-foreground mb-1.5">Kontaktpersoner</div>
                  {cContacts.length === 0 && <p className="text-xs text-muted-foreground italic">Inga kontakter</p>}
                  <div className="space-y-1.5">
                    {cContacts.map((ct) => (
                      <div key={ct.id} className="flex items-start justify-between gap-2 rounded-md bg-muted/40 p-2 text-xs">
                        <div className="flex-1 min-w-0">
                          <div className="font-medium">{ct.name} {ct.role && <span className="text-muted-foreground font-normal">· {ct.role}</span>}</div>
                          {ct.email && <div className="text-muted-foreground flex items-center gap-1 truncate"><Mail className="h-3 w-3 shrink-0" /> {ct.email}</div>}
                          {ct.phone && <div className="text-muted-foreground flex items-center gap-1"><Phone className="h-3 w-3" /> {ct.phone}</div>}
                        </div>
                        <button onClick={() => deleteContact(ct.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-3 w-3" /></button>
                      </div>
                    ))}
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-1.5">
                    <Input className="h-8 text-xs" placeholder="Namn" value={newContact.name} onChange={(e) => setNewContact({ ...newContact, name: e.target.value })} />
                    <Input className="h-8 text-xs" placeholder="Roll" value={newContact.role} onChange={(e) => setNewContact({ ...newContact, role: e.target.value })} />
                    <Input className="h-8 text-xs" placeholder="E-post" value={newContact.email} onChange={(e) => setNewContact({ ...newContact, email: e.target.value })} />
                    <Input className="h-8 text-xs" placeholder="Telefon" value={newContact.phone} onChange={(e) => setNewContact({ ...newContact, phone: e.target.value })} />
                    <Button size="sm" variant="outline" className="col-span-2 h-7 text-xs" onClick={() => addContact(c.id)}>+ Lägg till kontakt</Button>
                  </div>
                </div>

                {c.notes && (
                  <div>
                    <div className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Kommentarer</div>
                    <p className="text-xs whitespace-pre-wrap rounded-md bg-muted/30 p-2">{c.notes}</p>
                  </div>
                )}

                <div>
                  <div className="text-xs uppercase tracking-wide text-muted-foreground mb-1.5">Offerter ({cQuotes.length})</div>
                  {cQuotes.length === 0 && <p className="text-xs text-muted-foreground italic">Inga kopplade offerter</p>}
                  <div className="space-y-1">
                    {cQuotes.slice(0, 5).map((q) => (
                      <div key={q.id} className="flex items-center justify-between text-xs">
                        <span className="truncate">{q.quote_number} · {q.product}</span>
                        <Badge variant="outline" className="text-[10px]">{formatSEK(q.amount)} kr</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? 'Redigera kundbesök' : 'Nytt kundbesök'}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Besökt datum</Label>
              <DatePick value={form.visit_date} onChange={(v) => setForm({ ...form, visit_date: v })} clearable />
            </div>
            <div className="space-y-1.5">
              <Label>Säljare *</Label>
              <Select value={form.salesperson} onValueChange={(v) => setForm({ ...form, salesperson: v })}>
                <SelectTrigger><SelectValue placeholder="Välj säljare" /></SelectTrigger>
                <SelectContent>{SALESPEOPLE.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 col-span-2">
              <Label>Kund *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Arena / Anläggning</Label>
              <Input value={form.arena} onChange={(e) => setForm({ ...form, arena: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Ort</Label>
              <Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Land *</Label>
              <Select value={form.country} onValueChange={(v) => setForm({ ...form, country: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{COUNTRIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Nästa uppföljning</Label>
              <DatePick value={form.next_followup} onChange={(v) => setForm({ ...form, next_followup: v })} clearable />
            </div>
            <div className="space-y-1.5 col-span-2">
              <Label>Produkt</Label>
              <div className="flex flex-wrap gap-1.5 rounded-md border border-input bg-background p-2 min-h-[42px]">
                {form.products.map((p) => (
                  <Badge key={p} variant="secondary" className="gap-1">
                    {p}
                    <button onClick={() => toggleProduct(p)} className="hover:text-destructive"><X className="h-3 w-3" /></button>
                  </Badge>
                ))}
                <Select value="" onValueChange={(v) => v && toggleProduct(v)}>
                  <SelectTrigger className="h-7 w-auto border-dashed text-xs"><SelectValue placeholder="+ Lägg till" /></SelectTrigger>
                  <SelectContent>{PRODUCTS.filter((p) => !form.products.includes(p)).map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <p className="text-xs text-muted-foreground">Välj de produkter som är aktuella</p>
            </div>
            <div className="space-y-1.5 col-span-2">
              <Label>Kommentarer</Label>
              <Textarea rows={4} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Avbryt</Button>
            <Button onClick={save}>Spara</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
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
            <span onClick={(e) => { e.stopPropagation(); onChange(null); }} className="ml-auto text-xs text-muted-foreground hover:text-destructive">×</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar mode="single" selected={d} onSelect={(date) => onChange(date ? format(date, 'yyyy-MM-dd') : null)} initialFocus weekStartsOn={1} showWeekNumber className={cn('p-3 pointer-events-auto')} />
      </PopoverContent>
    </Popover>
  );
}
