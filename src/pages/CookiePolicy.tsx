import { Link } from "react-router-dom";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { resetCookieConsent } from "@/lib/cookieConsent";

export default function CookiePolicy() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <main className="flex-1 mx-auto max-w-3xl px-6 py-16">
        <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">← Tillbaka</Link>
        <h1 className="mt-6 text-4xl font-bold text-foreground">Cookiepolicy</h1>
        <p className="mt-2 text-sm text-muted-foreground">Senast uppdaterad: {new Date().toLocaleDateString("sv-SE")}</p>

        <section className="mt-10 space-y-8 text-foreground">
          <div>
            <h2 className="text-xl font-semibold">Vad är cookies?</h2>
            <p className="text-muted-foreground mt-2">
              Cookies är små textfiler som lagras i din webbläsare. Vi använder dem
              för att tjänsten ska fungera samt — om du samtycker — för andra ändamål.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-semibold">Nödvändiga cookies</h2>
            <p className="text-muted-foreground mt-2">
              Dessa krävs för att du ska kunna logga in och använda tjänsten. De
              kräver inte samtycke.
            </p>
            <ul className="list-disc pl-6 text-muted-foreground mt-2 space-y-1">
              <li><code>sb-*-auth-token</code> — autentiseringssession (Lovable Cloud).</li>
              <li><code>pm_cookie_consent</code> — sparar ditt cookie-val.</li>
              <li><code>theme</code> — sparar valt tema (ljust/mörkt).</li>
            </ul>
          </div>

          <div>
            <h2 className="text-xl font-semibold">Icke-nödvändiga cookies</h2>
            <p className="text-muted-foreground mt-2">
              Vi laddar inga analys- eller marknadsföringscookies från tredje part i
              dagsläget. Om detta ändras kommer de bara att aktiveras efter ditt
              uttryckliga samtycke.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-semibold">Hantera ditt samtycke</h2>
            <p className="text-muted-foreground mt-2">
              Du kan när som helst ändra eller återkalla ditt samtycke.
            </p>
            <Button className="mt-4" variant="outline" onClick={() => { resetCookieConsent(); window.location.reload(); }}>
              Återställ cookie-val
            </Button>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
