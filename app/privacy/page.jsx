import Link from "next/link";
import SiteFooter from "@/components/SiteFooter";

export const metadata = { title: "Privacyverklaring" };

// CONCEPT: laat dit controleren voordat je live gaat, en vul alles tussen [haken] in.
export default function Privacy() {
  return (
    <>
      <header className="site-head"><div className="in"><Link href="/" className="logo">Stagejacht</Link></div></header>
      <main className="page">
        <article className="legal">
          <h1>Privacyverklaring</h1>
          <p className="concept"><b>Concept.</b> Deze tekst is een startpunt en geen juridisch advies. Laat hem controleren (bijvoorbeeld via het Juridisch Loket of een privacy-jurist) en vul alles tussen [haken] in voordat je live gaat.</p>
          <p>Laatst bijgewerkt: [datum]</p>

          <h2>Wie zijn wij</h2>
          <p>Stagejacht is een dienst van [bedrijfsnaam / je naam], ingeschreven bij de KvK onder nummer [KvK-nummer], [adres]. Vragen over privacy: [e-mailadres].</p>

          <h2>Welke gegevens we verwerken</h2>
          <ul>
            <li>Accountgegevens van Google: naam, e-mailadres en profielfoto.</li>
            <li>Wat je zelf invult: profiel, opleiding, telefoonnummer, bedrijven, notities en je cv.</li>
            <li>Als je Gmail koppelt: mails van en naar de bedrijven in je lijst, en mails die je via Stagejacht verstuurt.</li>
            <li>Betaalgegevens: die verwerkt Mollie. Wij zien alleen of een betaling gelukt is.</li>
            <li>Gebruik: hoeveel AI-acties je per maand gebruikt.</li>
          </ul>

          <h2>Waarvoor we ze gebruiken</h2>
          <ul>
            <li>Om de dienst te leveren: je lijst bijhouden, mails schrijven en versturen, reacties herkennen, vacatures zoeken en cv-advies geven.</li>
            <li>Om je abonnement te regelen.</li>
            <li>We verkopen je gegevens nooit en gebruiken ze niet voor advertenties.</li>
          </ul>

          <h2>Gmail en Google-gegevens</h2>
          <p>
            Stagejacht leest alleen mails die passen bij de bedrijven in jouw lijst, om te zien of ze hebben gereageerd. Mails worden alleen verstuurd als jij daar zelf op tikt.
            Het gebruik van informatie die Stagejacht van Google API's ontvangt, houdt zich aan het{" "}
            <a href="https://developers.google.com/terms/api-services-user-data-policy" target="_blank" rel="noopener noreferrer">Google API Services User Data Policy</a>, inclusief de eisen voor Limited Use.
            We gebruiken Gmail-gegevens niet om AI-modellen te trainen en geven ze niet door aan anderen, behalve aan de verwerkers hieronder die nodig zijn om de dienst te leveren.
          </p>

          <h2>Verwerkers</h2>
          <ul>
            <li>[Databasebedrijf of hosting] (database en cv-bestanden, servers in de EU: [regio])</li>
            <li>Anthropic (AI voor mails, reacties en cv-advies; gegevens worden niet gebruikt om modellen te trainen)</li>
            <li>Google (inloggen en Gmail)</li>
            <li>Mollie (betalingen)</li>
          </ul>

          <h2>Hoe lang we gegevens bewaren</h2>
          <p>Zolang je account bestaat. Verwijder je je account, dan wissen we je gegevens direct. Betaalgegevens bewaren we 7 jaar, omdat de wet dat verplicht.</p>

          <h2>Jouw rechten</h2>
          <p>Je mag je gegevens inzien, laten aanpassen of verwijderen. Je account en alle gegevens verwijder je zelf bij Profiel → Account verwijderen. Je Gmail-koppeling stop je bij Profiel → Gmail loskoppelen. Je kunt ook een klacht indienen bij de Autoriteit Persoonsgegevens.</p>

          <h2>Jonger dan 16?</h2>
          <p>Dan heb je toestemming van je ouder of verzorger nodig om Stagejacht te gebruiken.</p>

          <h2>Beveiliging</h2>
          <p>Iedere gebruiker ziet alleen zijn eigen gegevens. Gmail-toegang wordt versleuteld opgeslagen. Alle verbindingen gaan via HTTPS.</p>
        </article>
      </main>
      <SiteFooter />
    </>
  );
}
