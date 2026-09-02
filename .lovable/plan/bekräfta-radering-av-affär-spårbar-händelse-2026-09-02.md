# Bekräfta radering av affär + spårbar händelse

## Mål
1. Radering av en rad i försäljningsbudgeten (CRM) ska kräva en tydlig bekräftelse med varning om att åtgärden inte går att ångra.
2. Raderingen ska synas i "Senaste händelser" på projektledningsmodulens dashboard — med projekt, produkt, belopp och vem som raderade — och den posten ska överleva raderingen.

## Bakgrund (verifierat)
- Raderingen sker idag i redigeringsdialogen för affären via ett enkelt webbläsar-`confirm()`.
- En händelse av typen `deleted` skapas redan, men den kopplas till affärens id och kopplingen i databasen är satt till "radera med" (cascade). Därför försvinner raderingshändelsen i samma sekund som affären tas bort — det är varför tidigare raderingar inte gick att spåra.

## Vad som byggs

### 1. Bekräftelseruta
Ersätt webbläsarens `confirm` med en riktig varningsdialog i appens stil:
- Rubrik: "Radera affär permanent?"
- Text som namnger projekt, produkt och totalbelopp, samt "Detta går inte att ångra."
- Knappar: "Avbryt" och en röd "Radera permanent".

### 2. Spårbar raderingshändelse
- Logga raderingen **utan** koppling till den raderade affären, så att posten ligger kvar i historiken.
- Spara projektnamn, produkt, belopp/år samt användarens namn (samma namnhämtning som övriga händelser).

### 3. Visning på dashboarden
Utöka `deleted`-fallet i händelselistan så texten blir t.ex.
"Affär raderad: Teleskopläktare · 2,5 MSEK" med röd "Borttagen"-etikett, och raderarens namn visas som idag under tidsstämpeln.

## Tekniska detaljer
- `src/components/dialogs/EditForecastDialog.tsx`: byt `confirm()` mot shadcn `AlertDialog`.
- `src/hooks/useDatabaseData.ts` (`deleteForecast`): logga händelsen med `forecastId: undefined` och lägg produkt/belopp i `details`; behåll den optimistiska uppdateringen av händelselistan.
- `src/components/Dashboard.tsx`: rikare text i `case 'deleted'`.
- Inga schemaändringar behövs.
