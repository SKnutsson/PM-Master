import { Link } from "react-router-dom";
import { Footer } from "@/components/Footer";

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <main className="flex-1 mx-auto max-w-3xl px-6 py-16">
        <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">← Tillbaka</Link>
        <h1 className="mt-6 text-4xl font-bold text-foreground">Integritetspolicy</h1>
        <p className="mt-2 text-sm text-muted-foreground">Senast uppdaterad: {new Date().toLocaleDateString("sv-SE")}</p>

        <section className="prose prose-sm mt-10 space-y-8 text-foreground">
          <div>
            <h2 className="text-xl font-semibold">1. Personuppgiftsansvarig</h2>
            <p className="text-muted-foreground mt-2">
              PM Master är personuppgiftsansvarig för behandlingen av dina personuppgifter
              i tjänsten. Kontakt: <a className="text-primary underline" href="mailto:kontakt@pmmaster.se">kontakt@pmmaster.se</a>.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-semibold">2. Vilka uppgifter vi samlar in</h2>
            <ul className="list-disc pl-6 text-muted-foreground mt-2 space-y-1">
              <li>Konto: e-postadress, lösenord (krypterat), visningsnamn.</li>
              <li>Användning av tjänsten: projekt, aktiviteter och annan data du själv lägger in.</li>
              <li>Teknisk data: IP-adress och webbläsarinformation vid inloggning, för säkerhet.</li>
            </ul>
            <p className="text-muted-foreground mt-2">
              Vi samlar inte in känsliga personuppgifter (etniskt ursprung, hälsa, politisk åsikt m.m.).
            </p>
          </div>

          <div>
            <h2 className="text-xl font-semibold">3. Syfte och laglig grund</h2>
            <ul className="list-disc pl-6 text-muted-foreground mt-2 space-y-1">
              <li>Tillhandahålla tjänsten och hantera konto — <em>laglig grund: avtal</em>.</li>
              <li>Säkerhet och förebygga missbruk — <em>laglig grund: berättigat intresse</em>.</li>
              <li>Icke-nödvändiga cookies / valfri kommunikation — <em>laglig grund: samtycke</em>.</li>
            </ul>
          </div>

          <div>
            <h2 className="text-xl font-semibold">4. Lagringstid</h2>
            <p className="text-muted-foreground mt-2">
              Kontodata sparas så länge ditt konto är aktivt. Vid radering tas
              personuppgifter bort inom 30 dagar, förutom där lag kräver längre lagring
              (t.ex. bokföring upp till 7 år).
            </p>
          </div>

          <div>
            <h2 className="text-xl font-semibold">5. Mottagare och tredje part</h2>
            <p className="text-muted-foreground mt-2">
              Vi delar data med våra personuppgiftsbiträden för drift av tjänsten:
              molnleverantör (databas, autentisering och hosting). Inga uppgifter
              säljs vidare. Vi använder inga analys- eller marknadsföringsverktyg
              från tredje part.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-semibold">6. Dina rättigheter</h2>
            <ul className="list-disc pl-6 text-muted-foreground mt-2 space-y-1">
              <li>Rätt till tillgång — begära utdrag av dina personuppgifter.</li>
              <li>Rätt till rättelse — få felaktiga uppgifter ändrade.</li>
              <li>Rätt till radering ("rätten att bli glömd").</li>
              <li>Rätt till dataportabilitet.</li>
              <li>Rätt att invända mot eller begränsa behandling.</li>
              <li>Rätt att återkalla samtycke.</li>
              <li>Rätt att klaga hos Integritetsskyddsmyndigheten (IMY).</li>
            </ul>
            <p className="text-muted-foreground mt-2">
              Skicka begäran till <a className="text-primary underline" href="mailto:kontakt@pmmaster.se">kontakt@pmmaster.se</a>{" "}
              eller via vår <Link to="/kontakt" className="text-primary underline">kontaktsida</Link>.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-semibold">7. Säkerhet</h2>
            <p className="text-muted-foreground mt-2">
              All trafik sker krypterat via HTTPS. Lösenord lagras hashade. Åtkomst
              till data styrs via Row-Level Security i databasen så att användare
              endast ser sin egen organisations data.
            </p>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
