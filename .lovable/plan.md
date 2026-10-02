# Importera och modernisera Alla offerter

## Resultat
- Ersätt de tre nuvarande offerterna med de 525 offerterna i Excel-filen.
- Bevara radbrytna kommentarer och extra produktrader från exporten.
- Visa Excelfilens uppdateringsdatum separat från offertdatumet.
- Anpassa offertlistan för de importerade säljarna, ansvariga, länderna, produkterna och statusarna.
- Bygg om öppna/redigera-vyn till en tät tvåkolumnslayout som följer referensbilden, inklusive kontaktuppgifter, fritextprodukter, belopp, PDF och kommentarshistorik.

## Importkontroller
- Konvertera svenska datum till lokala ISO-datum utan tidsförskjutning.
- Behåll tomma värden tomma och ge saknade offertnummer ett stabilt importnummer.
- Kontrollera antal, totalsumma och stickprov före och efter importen.
- Verifiera listan och redigering i appen efter importen.

## Tekniskt
- Lägg till ett separat valfritt fält för det ursprungliga uppdateringsdatumet.
- Importen görs som en engångsersättning av nuvarande offertdata; kundregistret påverkas inte.
- Inga gamla länkar till det tidigare CRM-systemets redigera/radera-sidor förs över eftersom de är åtgärdslänkar, inte offertdata.
