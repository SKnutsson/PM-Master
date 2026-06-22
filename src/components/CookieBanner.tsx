import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { getCookieConsent, setCookieConsent } from "@/lib/cookieConsent";

export function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(getCookieConsent() === null);
    const handler = () => setVisible(getCookieConsent() === null);
    window.addEventListener("cookie-consent-change", handler);
    return () => window.removeEventListener("cookie-consent-change", handler);
  }, []);

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-label="Cookie-samtycke"
      className="fixed bottom-4 left-4 right-4 z-[100] mx-auto max-w-3xl rounded-lg border border-border bg-card shadow-lg p-5 md:flex md:items-center md:gap-6"
    >
      <p className="text-sm text-foreground flex-1">
        Vi använder endast nödvändiga cookies för att tjänsten ska fungera. Icke-nödvändiga
        cookies laddas inte utan ditt samtycke. Läs mer i vår{" "}
        <Link to="/cookiepolicy" className="text-primary underline">cookiepolicy</Link>.
      </p>
      <div className="mt-4 flex gap-2 md:mt-0 md:shrink-0">
        <Button variant="outline" onClick={() => setCookieConsent("rejected")}>
          Neka
        </Button>
        <Button className="gradient-primary text-primary-foreground" onClick={() => setCookieConsent("accepted")}>
          Acceptera
        </Button>
      </div>
    </div>
  );
}
