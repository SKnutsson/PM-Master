import { Link } from "react-router-dom";

export function Footer() {
  return (
    <footer className="border-t border-border/50 bg-background">
      <div className="mx-auto max-w-6xl px-6 py-8 flex flex-col md:flex-row items-center justify-between gap-4">
        <p className="text-xs text-muted-foreground">
          © {new Date().getFullYear()} PM Master. Alla rättigheter förbehållna.
        </p>
        <nav className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
          <Link to="/integritetspolicy" className="text-muted-foreground hover:text-foreground">
            Integritetspolicy
          </Link>
          <Link to="/cookiepolicy" className="text-muted-foreground hover:text-foreground">
            Cookiepolicy
          </Link>
          <Link to="/kontakt" className="text-muted-foreground hover:text-foreground">
            Kontakt
          </Link>
        </nav>
      </div>
    </footer>
  );
}
