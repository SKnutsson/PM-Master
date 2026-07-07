
## Diagnos av din nuvarande förbrukning

Denna billingperiod (juli): ca **26,9 credits** totalt, varav **cloud** står för **6,9 credits**. Nedbrytning:

- **Cloud compute large: 6,91 credits** ← nästan hela cloud-kostnaden
- Cloud egress: 0,012
- Cloud realtime: 0,003
- Cloud file storage / cached: försumbart

Resten av perioden (~20 credits) är byggkrediter (AI-meddelanden). Cloud-delen är alltså inte extrem — den stora hävstången är att **databasinstansen körs på "large"**.

## Rekommendation: minimera i stället för att självhosta

Självhosting kräver att du sätter upp egen Supabase (eller Postgres+Auth+Storage+Edge Functions), migrerar data, sköter backups, uppdateringar och säkerhet själv. För en app i produktion med admins och RLS är det en avsevärd löpande arbetsinsats. Innan vi går den vägen: minimera först — det räcker nästan alltid.

### Steg 1 — Skala ner databasinstansen (störst effekt)

Byt från "large" till en mindre instans i Cloud → Overview → Advanced settings → Instance size. Baserat på din nuvarande last (låg egress, låg realtime) bör en mindre instans räcka med god marginal. Detta är den enskilt största besparingen — potentiellt 70–90 % av cloud-kostnaden.

Jag kan inte byta instansstorlek åt dig — det gör du själv i Cloud-panelen.

### Steg 2 — Skär ner realtime-prenumerationer

Idag prenumererar appen på `postgres_changes` för många tabeller (CRM, resurser, databas-hooks). Även med debounce håller det en socket öppen och triggar refetch. Åtgärder:

- Ta bort realtime på tunga läshooks (`useCrmData`, `useResourceData`, `useDatabaseData`) och ersätt med manuell "Uppdatera"-knapp + refetch vid fönsterfokus.
- Behåll realtime enbart på ytor där flera användare aktivt samredigerar (t.ex. produktionscanvas).

### Steg 3 — Minska queryfrekvens och payload

- Byt breda `select('*')` mot explicita kolumnlistor på de största tabellerna (`activities`, `daily_resource_entries`, `project_kpi_metrics`, `crm_quotes`).
- Cache:a hooks med React Query (`staleTime` 5 min) i stället för att refetcha vid varje mount.
- Ladda produktions-modulens tunga data (blueprints, factories) endast när modulen faktiskt öppnas (redan delvis så — verifiera).

### Steg 4 — Radera gammal data

Din nya "Radera projekt"-funktion för admins hjälper redan. Uppmuntra rensning av avslutade projekt + tillhörande `daily_resource_entries`, `activities`, `production_*`-rader.

### Steg 5 — Ordna auto-topup / kredittak

Sätt ett hårt månadstak i Settings → Plans & credits så att en bugg (t.ex. en oändlig useEffect-loop) inte kan dränera kontot.

## Om du ändå vill självhosta

Kort översikt så du vet vad det innebär:

1. Skapa ett eget Supabase-konto (eller kör Supabase self-hosted via Docker).
2. Exportera schema + data: Cloud → Advanced settings → Export data.
3. Skapa nytt projekt, importera dump, kör alla `supabase/migrations/*.sql`.
4. Skapa storage-buckets (`service-attachments`, `production-blueprints`) och ladda upp filer.
5. Byt `VITE_SUPABASE_URL` och `VITE_SUPABASE_PUBLISHABLE_KEY` mot den nya instansens värden.
6. Konfigurera Auth-providers, e-postmallar och redirect-URL på nytt.
7. Hosta frontend någon annanstans (Vercel/Netlify/egen server) eftersom Lovable-hosting är kopplat till Lovable Cloud.

Detta är en engångsflytt men innebär att du tar över drift och säkerhet.

## Vad jag konkret gör i koden om du godkänner

1. **`src/hooks/useCrmData.ts`** — ta bort realtime-kanalen, exponera `refresh()` + refetch på fönsterfokus.
2. **`src/hooks/useResourceData.ts`** — samma; behåll `refresh()` som anropas av dialoger efter skrivningar.
3. **`src/hooks/useDatabaseData.ts`** — samma mönster.
4. **Explicita kolumner** i de största `select()`-anropen ovan.
5. **React Query wrapping** där det ger mest (`useCrmData`, `useResourceData`) med `staleTime: 5 * 60_000`.
6. **Instruktion i UI** (kort banner i inställningar) som påminner admin att radera avslutade projekt.

Ingenting av detta ändrar funktionalitet — bara hur ofta klienten pratar med databasen.

## Vad du själv gör parallellt

- Sänk instansstorlek till "small" (eller "micro" om tillgängligt) i Cloud-panelen.
- Sätt månadstak för cloud-usage i Settings.

Vill du att jag kör steg 1–6 ovan?
