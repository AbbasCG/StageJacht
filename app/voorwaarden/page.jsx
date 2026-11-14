import Link from "next/link";
import SiteFooter from "@/components/SiteFooter";
import { PLANS } from "@/lib/plans";

export const metadata = { title: "Algemene voorwaarden" };

// CONCEPT: laat dit controleren voordat je live gaat, en vul alles tussen [haken] in.
export default function Voorwaarden() {
  return (
    <>
      <header className="site-head"><div className="in"><Link href="/" className="logo">Stagejacht</Link></div></header>
      <main className="page">
        <article className="legal">
          <h1>Algemene voorwaarden</h1>
          <p className="concept"><b>Concept.</b> Deze tekst is een startpunt en geen juridisch advies. Laat hem controleren en vul alles tussen [haken] in voordat je live gaat.</p>
          <p>Laatst bijgewerkt: [datum]</p>

          <h2>1. Wie</h2>
          <p>Deze voorwaarden gelden voor Stagejacht van [bedrijfsnaam / je naam], KvK [nummer], [adres], [e-mailadres].</p>

          <h2>2. De dienst</h2>
          <p>Stagejacht helpt je bij het zoeken naar een stageplek. We doen ons best, maar we garanderen niet dat je een stageplek vindt. AI-teksten en advies kunnen fouten bevatten: jij controleert alles voordat je het verstuurt en bent zelf verantwoordelijk voor wat je verstuurt.</p>

          <h2>3. Abonnementen en betalen</h2>
          <ul>
            <li>Gratis: {PLANS.free.voordelen.join(", ").toLowerCase()}.</li>
            <li>Pro: {PLANS.pro.prijsTekst} per maand. Premium: {PLANS.premium.prijsTekst} per maand. Prijzen zijn inclusief btw [controleer of je btw-plichtig bent].</li>
            <li>Je betaalt de eerste maand met iDEAL of een andere methode. Daarna schrijven we elke maand automatisch af.</li>
            <li>Je kunt maandelijks opzeggen bij Profiel. Je houdt je abonnement tot het einde van de betaalde maand.</li>
            <li>Herroepingsrecht: je hebt 14 dagen bedenktijd. Omdat je de dienst meteen gebruikt, vragen we bij het afsluiten om akkoord dat je direct begint; bij opzeggen binnen 14 dagen betaal je naar verhouding voor de dagen die je hebt gebruikt. [laat dit controleren]</li>
            <li>We mogen prijzen aanpassen. Dat melden we minstens 30 dagen van tevoren; je mag dan opzeggen.</li>
          </ul>

          <h2>4. Eerlijk gebruik</h2>
          <p>Gebruik Stagejacht alleen voor je eigen stagezoektocht. Geen spam, geen massamails en geen misbruik. Bij misbruik mogen we je account blokkeren.</p>

          <h2>5. Aansprakelijkheid</h2>
          <p>We zijn niet aansprakelijk voor schade door het gebruik van Stagejacht, behalve bij opzet of grove nalatigheid. Onze aansprakelijkheid is in elk geval beperkt tot wat je in de laatste 12 maanden hebt betaald.</p>

          <h2>6. Stoppen</h2>
          <p>Je kunt je account altijd verwijderen bij Profiel. Wij mogen de dienst stoppen met 30 dagen opzegtermijn; betaalde maanden die nog niet zijn gebruikt krijg je dan terug.</p>

          <h2>7. Recht</h2>
          <p>Op deze voorwaarden is Nederlands recht van toepassing.</p>
        </article>
      </main>
      <SiteFooter />
    </>
  );
}
