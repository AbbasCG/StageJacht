import Link from "next/link";

// Zet NEXT_PUBLIC_CONTACT_EMAIL in .env.local om een contactadres te tonen
const CONTACT = process.env.NEXT_PUBLIC_CONTACT_EMAIL;

export default function SiteFooter() {
  return (
    <footer className="site-foot">
      <div className="foot-in">
        <div className="foot-merk">
          <Link href="/" className="logo-foot"><img src="/logo.svg" alt="" width="28" height="28" />Stagejacht</Link>
          <p>Overzicht en regie bij de zoektocht naar een stageplek voor mbo-studenten.</p>
        </div>
        <div className="foot-col" role="navigation" aria-label="Informatie">
          <h2>Informatie</h2>
          <Link href="/#zo-werkt-het">Werkwijze</Link>
          <Link href="/#zekerheid">Zekerheid</Link>
          <Link href="/#prijzen">Abonnementen</Link>
        </div>
        <div className="foot-col" role="navigation" aria-label="Juridisch">
          <h2>Juridisch</h2>
          <Link href="/privacy">Privacyverklaring</Link>
          <Link href="/voorwaarden">Algemene voorwaarden</Link>
          {CONTACT && <a href={`mailto:${CONTACT}`}>Contact</a>}
        </div>
      </div>
      <div className="foot-onder">© {new Date().getFullYear()} Stagejacht. Alle rechten voorbehouden.</div>
    </footer>
  );
}
