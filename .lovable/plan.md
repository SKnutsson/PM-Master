## Mål
Ta bort Ekonomi-fliken helt och ersätta den med en ny flik "Servicar" för hantering av återkommande service på teleskopläktare.

## 1. Ta bort Ekonomi
- Ta bort `FinanceView` från sidebaren och `MainLayout` (View-typ + route)
- Ta bort `src/components/FinanceView.tsx`
- Migration: droppa tabellerna `project_transactions`, `project_budget_lines`, `project_accounting`, `finance_template_items`, `finance_templates`

## 2. Datamodell – Servicar (migration)

**`service_contracts`** (serviceavtal)
- customer, facility_name (läktare/anläggning), location, contract_start, contract_end
- recurrence_months (t.ex. 12), recurrence_month (t.ex. 9 för september)
- notes, active

**`services`** (enskilda serviceuppdrag)
- contract_id (nullable – stöd även engångsservice)
- customer, facility_name
- planned_date, completed_date
- assigned_technician (text – matchar montörer/profiles)
- status: 'Planerad' | 'Bokad' | 'Utförd' | 'Försenad'
- planned_hours, actual_hours
- notes

**`service_checklist_items`**
- service_id, label, checked, sort_order

**`service_deviations`** (avvikelser)
- service_id, description, severity, created_task_id (nullable koppling till `tasks`)

**`service_attachments`** (dokumentation – bilder/anteckningar)
- service_id, file_url, caption, kind ('image' | 'note')

Alla tabeller med RLS: authenticated read/write (samma mönster som övriga delade tabeller).

Storage-bucket: `service-attachments` (publik) + RLS policies.

## 3. UI – `ServicesView.tsx`
Tre tabs:
1. **Översikt** – KPI:s (kommande denna månad, försenade, utförda i år), lista med kommande servicar (sorterat efter `planned_date`), påminnelser (≤30 dagar).
2. **Serviceavtal** – CRUD för `service_contracts`. Knapp "Generera nästa service" som skapar service-rad utifrån `recurrence_month` + `recurrence_months`.
3. **Alla servicar** – tabell med filter (status, kund, tekniker, år). Klick öppnar detaljpanel/dialog.

**Service-detaljdialog** (delad komponent):
- Header: kund, anläggning, status-badge, planerat/utfört datum
- Sektioner:
  - Grunddata (datum, tekniker, status, planerad/faktisk tid)
  - Checklista (kryssbar, lägga till/ta bort punkter)
  - Anteckningar (textarea, auto-save)
  - Avvikelser (lista; per rad knapp "Skapa åtgärd" → insert i `tasks` med koppling)
  - Dokumentation (bilduppladdning till storage + bildtexter)
- Servicehistorik för samma läktare/kund visas i sidopanel

Status `Försenad` sätts automatiskt klient-side om `planned_date < today` och inte utförd.

## 4. Sidebar
Ersätt admin-only `Ekonomi` (Wallet) med `Servicar` (Wrench) – synlig för alla authenticated, inte admin-only.

## Tekniska detaljer
- Status-färger följer befintlig palett: Blå=Planerad, Orange=Bokad, Grön=Utförd, Röd=Försenad
- Lokala datum (ingen UTC-shift), ISO-veckor där relevant
- Auto-save på fält (debounce 500ms) som i resten av appen
- Realtime via Supabase channel på `services` så listan uppdateras live

## Vill du att jag kör?
Säg till om något ska justeras (t.ex. extra fält, annan struktur på checklistor som mall per avtal, eller om bilduppladdning ska skippas i denna första iteration).
