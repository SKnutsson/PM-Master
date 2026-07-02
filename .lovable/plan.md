# Produktionsmodulen v2 – "Google Maps för produktionsflöden"

Bygger om hela produktionsmodulen med en gemensam zoom/pan-canvas där ritning, produktionsgrupper och flöden lever i samma koordinatsystem. Byter också modultema till blått + Alfing-logga.

## 1. Kritisk fix – gemensam canvas
- Ersätter dagens CSS-bakgrund med en **bakgrundsnod (BlueprintNode)** i React Flow som ligger på egen låg z-nivå men transformeras med samma viewport som alla andra noder.
- Ritning, produktionsgrupper och flöden zoomar/panorerar synkroniserat. Ritningens storlek sätts i "canvas-enheter" (px i flow-space), inte i skärm-px.
- PDF-uppladdningar renderas till PNG (via `pdfjs-dist`) innan de placeras som bakgrundsnod.

## 2. Projekt & fabriksstruktur (behålls, städas upp)
- Projektlista → workspace med **Översikt** + en flik per fabrik (som idag).
- Fabrik: canvas + uppladdad ritning som bakgrundsnod. Ritningen kan skalas/positioneras separat en gång, sen är den låst i canvas-koordinater.
- Översikt: fabriker som kort-noder, flöden mellan dem, dubbelklick zoomar in.

## 3. Produktionsgrupper (ersätter station/maskin/avdelning)
- Ny node-typ `ProductionGroupNode`.
- Metadata: `type` (svets, montering, lager, kontroll, inleverans, utleverans, övrigt), `capacity` (st/h), `cycle_time` (s), `staffing`, `status`.
- Fri storleksändring (resize-handles), formval: **rektangel / rundad / cirkel / pill**, färg, kantlinje, ikon.
- Snap-to-grid (togglebart), inline-redigering av namn (dubbelklick).

## 4. Flöden
- Dra mellan grupper → skapar riktad pil. Fästpunkter på alla fyra sidor.
- Metadata: volym, frekvens, ledtid, batchstorlek, typ (material/info/transport).
- Linjetjocklek skalas med volym; färg per typ; auto-routing via `smoothstep`/`step` med kant-offset så linjer inte överlappar.
- Flöden mellan fabriker: skapas antingen från Översikt eller genom att markera en grupp som "extern" (visas i detaljvyn med brutet snitt).

## 5. Interaktion & UX
- Zoom med scroll (smooth), pan med space+drag ELLER mellanmusknapp.
- Högerklicksmeny på canvas (skapa grupp) och på nod (duplicera, radera, lås, färg, form).
- **Undo/Redo** via lokal history-stack (Cmd/Ctrl+Z, Shift+Z).
- **Copy/Paste** (Cmd/Ctrl+C/V) för valda noder.
- Auto-save (debounced 500 ms mot Cloud, som idag).

## 6. Filter & analys
- Sidopanel: filtrera på typ, fabrik, flödestyp; toggles för att dölja flöden/metadata.
- Auto-flaskhals: om summa inkommande volym > kapacitet → status blir röd (överbelastning), 80–100 % gult, annars grönt. Ring runt noden + badge.

## 7. Play mode (simulering)
- Toolbar-knapp "▶ Play". Animerar pulserande punkter längs varje flödeslinje med hastighet baserad på `lead_time` och `volume`.
- Kontroller: pausa, hastighet (0.5x/1x/2x/4x), starta om.
- Vid flaskhals byggs en visuell "kö" (staplade punkter) upp innan noden.

## 8. Design/tema-switch
- När `mode === 'production'`:
  - primary token skiftar till **mörkblå** (matchar Alfing-loggan, ~`#18324A`/`#1E4C7A`).
  - Sidebar-logga byts från "Alfing Seating" till "Alfing".
- Sparar Alfing-loggan som asset via lovable-assets CLI från den uppladdade bilden.
- Ingen påverkan på PM/CRM-läge.

## 9. Databas
Lägger till fält på befintliga tabeller (ingen ny tabell behövs):
- `production_factories`: `blueprint_offset_x`, `blueprint_offset_y`, `blueprint_scale_x`, `blueprint_scale_y` (position/skala i canvas-koordinater).
- `production_objects`: `shape` (`rect|rounded|circle|pill`), `border_color`, `border_width`. `type`-enum utökas med `production_group`; gamla typer mappas visuellt till samma nod.
- `production_flows`: `routing` (`smoothstep|step|bezier`), inget mer nödvändigt.

## Tekniska detaljer
- Node-typer: `blueprint`, `productionGroup`, `factory` (översikt).
- Egen `NodeResizer` från `@xyflow/react`.
- History-stack: array av snapshots av `{objects, flows}` (max 50).
- PDF→bild: `pdfjs-dist` (redan lätt att lägga till).
- Play-mode animation: SVG `<circle>` med `animateMotion` längs edge-path, alt. `requestAnimationFrame` som räknar position längs path.

## Vad som INTE ingår i denna iteration
- Versionshistorik-UI (data-modellen finns, men UI görs senare).
- Kommentarer på canvas (samma – tabellen finns).
- What-if scenario-editor (kräver egen UI-flow, tas separat).
- Realtids-collab (flera användare samtidigt).

Säg till om något av dessa ska in i denna runda istället, annars kör jag enligt planen ovan.
