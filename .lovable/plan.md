# Uppdatera projektgenomgångens mall

## Resultat
Nya projektgenomgångar får en enklare mall med kryssrutor för uppföljning, anpassade Optioner, Teknisk specifikation och Tidplan samt filbilagor under Underlag och handlingar. Redan skapade genomgångar fortsätter använda exakt den mallversion de skapades med.

## Ändringar
- Höj standardmallen till en ny version och ändra rubriken **Konstruktionschef** till **Ansvarig konstruktör** i formulär och exporterad sammanfattning.
- Ersätt alla val för **Kräver uppföljning Ja/Nej** med en enkel kryssruta. Behåll tillhörande kommentarsfält där användaren kan beskriva uppföljningen.
- Ändra **Optioner** till: Option, Beskrivning, Status, Kräver uppföljning och Kommentar.
- Behåll namnet **Teknisk specifikation**, men gör det till en redigerbar lista där användaren själv kan lägga till och ta bort förutsättningar. Varje rad får uppföljningskryssruta och kommentar.
- Ändra **Tidplan** till: Aktivitet i fritext, Datum i fritext, Hänvisat dokument i fritext, Kommentar och Kräver uppföljning.
- Ta bort avsnitten **Muntliga överenskommelser**, **Beslut** och **Ändringar** ur den nya mallen.
- Lägg till säker uppladdning av PDF-, DOC- och DOCX-filer per rad i **Underlag och handlingar**, med möjlighet att öppna och ta bort bilagan.
- Visa bilagans filnamn som text i den exporterade PDF-sammanfattningen.

## Historik och säkerhet
- Sluta ersätta äldre genomgångars mallsnapshot automatiskt. En genomgång renderas alltid från den snapshot och version den skapades med.
- Skapa ett privat lagringsutrymme för genomgångsbilagor med åtkomst endast för inloggade användare enligt befintliga behörigheter.
- Lagra endast filmetadata och privat sökväg i dokumentradens befintliga datafält; övrig databasstruktur och befintliga poster ändras inte.
- Radera filer säkert när en bilaga eller dokumentrad tas bort, utan att lämna trasiga hänvisningar.

## Teknisk utformning
- Utöka mallens fälttyper med kryssruta och filbilaga samt rendera dem genom befintliga gemensamma granskningskomponenter.
- Använd unika lagringssökvägar per genomgång och dokumentrad, signerade länkar för visning samt filtyps- och storlekskontroll.
- Anpassa automatisk sammanställning av öppna punkter så ikryssade uppföljningar fortsatt visas korrekt.

## Kontroll
- Verifiera att en ny genomgång får den nya mallen och att en befintlig genomgång behåller version 4.
- Testa tillägg/borttagning av tekniska förutsättningar och nya tidsplans-/optionsfält.
- Testa uppladdning, öppning och borttagning av PDF, DOC och DOCX samt att filnamnet finns i exporten.
- Kontrollera typning, byggresultat och den färdiga vyn i webbläsaren.
