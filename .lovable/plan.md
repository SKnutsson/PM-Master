# Plan: Flera förbättringar

## 1. Ganttschemat – ny kalender med veckor
- Byt ut nuvarande datumväljare i Gantt mot shadcn `Calendar` (Popover + Calendar, samma stil som bilden – månadsnavigering, "Rensa"/"I dag", svenska veckodagar må–sö).
- Aktivera veckonummer-kolumn (`showWeekNumber`) så veckor syns i kalendern.
- Lägg till veckorad i själva Gantt-tidslinjen (visa v.XX ovanför månader/dagar) så man kan se vilken vecka man är i.

## 2. Uppföljning – tydligare Montage/Resa/Totalt
Bygg om toppen av `ResourceAnalyticsView`:
- **Stort totalsammanfattningskort** (full bredd): Total kalkyl, Totalt utfall, Total avvikelse, % avvikelse. Färgkodning grön/röd.
- **Två separata kort** under: 
  - **Montage**: Kalkyl, Utfall, Avvikelse, status (Grön ≤ kalkyl, Röd > kalkyl).
  - **Resa**: Samma upplägg.
- Behåll diagram och kvalitet-sektion nedanför.

## 3. Aktiva vs arkiverade projekt
- Lägg till toggle/segmenterad kontroll i Projekt-, Uppföljning-, ÄTA-vyer: "Aktiva" / "Arkiverade".
- Arkivering finns redan via status – använder status "Arkiverad" eller motsvarande flagga (kollar befintlig logik och återanvänder).

## 4. Ny flik: ÄTA-hantering
- Ny sidebar-flik "ÄTA" (FilePlus-ikon).
- Ny tabell `ata_items` med fält: project_id, title, description, type, amount, hours, material_cost, date, status (Ej skickad/Skickad/Godkänd/Nekad/Fakturerad), attachments (jsonb), created_at/updated_at. RLS authenticated full access.
- Storage-bucket `ata-attachments` för filer/bilder.
- **Vy** `AtaView.tsx`:
  - Projektväljare + Aktiva/Arkiverade-filter.
  - Dashboard-kort överst: Pågående ÄTA, Ej fakturerade, Totalt värde, Godkännandegrad (%).
  - Lista per projekt med summa belopp + summa timmar.
  - Sök/filter på status och text.
  - Dialog för att lägga till/redigera ÄTA med filuppladdning.
  - Historik/logg via `updated_at` + status-ändringar (enkel logg-tabell `ata_events`).

## 5. Försäljning – layout
- Flytta "Försäljningsmål" från eget block högst upp till samma rad som rubrik (eller integrera i Total budget-kortet som sekundär rad).
- Kompaktera så KPI-korten och tabellen flyttas upp.
- **Detaljerad budget**: ta bort intern scroll (ingen `max-h`/`overflow-auto` på tabell-wrapper). Tabellen växer naturligt; sidan har en enda scroll.

## Teknisk översikt
- Migration: skapa `ata_items` + `ata_events` + storage bucket `ata-attachments` + policies.
- Filer som ändras:
  - `src/components/TimelineView.tsx` (kalender + veckor)
  - `src/components/ResourceAnalyticsView.tsx` (omstrukturerade kort)
  - `src/components/ForecastView.tsx` (layout + ta bort intern scroll)
  - `src/components/ProjectsView.tsx` (aktiva/arkiverade-toggle om saknas)
  - `src/components/Sidebar.tsx` + `MainLayout.tsx` (ÄTA-rutt)
  - Ny: `src/components/AtaView.tsx` + dialogs
