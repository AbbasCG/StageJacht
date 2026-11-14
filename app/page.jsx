import Link from "next/link";
import { PLANS } from "@/lib/plans";
import SiteFooter from "@/components/SiteFooter";
import HeroDemo from "@/components/HeroDemo";

export const metadata = {
  title: "Overzicht en regie bij je stagezoektocht",
  description: "Houd je stagezoektocht overzichtelijk bij: bedrijven, gesprekken, reacties en opvolging op één plek. Mails worden door jou gecontroleerd voordat ze verstuurd worden.",
};

const STAPPEN = [
  { t: "Bedrijven vastleggen", d: "Leg per bedrijf vast met wie je contact had, wat de status is en wanneer je opnieuw contact opneemt. Niets raakt meer zoek." },
  { t: "Mails opstellen en controleren", d: "Op basis van je profiel en wat het bedrijf zoekt, stelt de AI een passende mail op. Jij leest, past aan en verstuurt pas na je eigen akkoord." },
  { t: "Reacties opvolgen", d: "Stagejacht herkent een antwoord, vat het samen en geeft advies voor de volgende stap, ook bij een afwijzing." },
];

const VOORDELEN = [
  { t: "Passende vacatures", d: "Stageplekken van Stagemarkt en het internet binnen de afstand die je zelf instelt, met aanduiding of het bedrijf erkend is." },
  { t: "Een sterker cv", d: "Je ontvangt een beoordeling met concrete verbeterpunten. In de editor werk je het bij en download je het als pdf." },
  { t: "Natuurlijk geformuleerde mails", d: "Een meter toont welke zinnen te stijf of te algemeen klinken. Je eigen aanvullingen blijven altijd behouden." },
  { t: "Ook op je telefoon", d: "Installeer Stagejacht op je beginscherm en raadpleeg je overzicht waar je ook bent." },
];

const ZEKERHEID = [
  { t: "Jij houdt de regie", d: "Er wordt nooit automatisch een mail verstuurd. Elke mail wordt eerst door jou gelezen en bevestigd." },
  { t: "Zorgvuldig met je gegevens", d: "Alleen jij ziet je gegevens. De Gmail-koppeling wordt versleuteld opgeslagen en kun je op elk moment verbreken." },
  { t: "Beveiligd ontwikkeld", d: "Beveiligde sessies, controle van elk verzoek op herkomst, en beperkingen op het aantal verzonden mails." },
  { t: "Volledig verwijderbaar", d: "Je kunt je account en alle bijbehorende gegevens zelf verwijderen. Dat gebeurt direct en definitief." },
];

const VRAGEN = [
  { v: "Wat kost Stagejacht?", a: "Je begint gratis met maximaal 3 bedrijven en 2 AI-acties per maand. Pro en Premium bieden onbeperkt bedrijven, meer AI-acties, controle van je mail en automatisch zoeken naar vacatures. Je kunt maandelijks opzeggen." },
  { v: "Is koppeling met Gmail verplicht?", a: "Nee. Zonder Gmail houd je alleen je overzicht bij. Met Gmail kan Stagejacht mails namens jou versturen en reacties herkennen." },
  { v: "Verstuurt de AI zelfstandig mails?", a: "Nooit. Elke mail wordt eerst aan jou voorgelegd. Pas nadat je hem hebt gelezen, bevestigd en zelf op Versturen hebt gedrukt, wordt hij verzonden." },
  { v: "Wie heeft toegang tot mijn gegevens?", a: "Uitsluitend jij. Bedrijven, cv en mails zijn persoonlijk. Zie ook de privacyverklaring voor de verwerkers die we inschakelen." },
  { v: "Is Stagejacht geschikt voor elke opleiding?", a: "Ja. Je geeft je opleiding, niveau en leerweg op; vacatures en mails sluiten daarop aan." },
];

const Vink = () => (<svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true"><path d="M4 10.5l4 4 8-9" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>);

export default function Home() {
  const plans = [PLANS.free, PLANS.pro, PLANS.premium];
  return (
    <>
      <header className="site-head">
        <div className="in">
          <Link href="/" className="logo"><img src="/logo.svg" alt="" width="34" height="34" />Stagejacht</Link>
          <div className="site-nav" role="navigation" aria-label="Hoofdmenu">
            <a href="#zo-werkt-het">Werkwijze</a>
            <a href="#zekerheid">Zekerheid</a>
            <a href="#prijzen">Abonnementen</a>
            <a href="#vragen">Veelgestelde vragen</a>
            <Link href="/login" className="btn small">Inloggen</Link>
          </div>
        </div>
      </header>

      <main>
        <section className="hero2">
          <div className="hero2-in">
            <div className="hero2-copy">
              <p className="eyebrow">Voor mbo-studenten op zoek naar een stageplek</p>
              <h1>Een overzichtelijke en zorgvuldige aanpak van je stagezoektocht</h1>
              <p className="lead">Leg bedrijven, gesprekken en reacties op één plek vast. Stagejacht helpt je met het opstellen van mails en adviseert over de volgende stap. De beslissingen blijven bij jou.</p>
              <div className="cta">
                <Link href="/login" className="btn gold">Gratis beginnen</Link>
                <a href="#zo-werkt-het" className="btn line">Bekijk de werkwijze</a>
              </div>
              <ul className="hero2-punten">
                <li><Vink />Geen creditcard nodig</li>
                <li><Vink />Maandelijks opzegbaar</li>
                <li><Vink />Mails alleen met jouw akkoord</li>
              </ul>
            </div>
            <HeroDemo />
          </div>
        </section>

        <div className="wrap">
          <section id="zo-werkt-het" className="blok">
            <header className="blok-kop"><p className="eyebrow dark">Werkwijze</p><h2>Van eerste contact tot stageplek</h2></header>
            <ol className="stappen">
              {STAPPEN.map((s, i) => (
                <li key={s.t}><span className="stap-nr" aria-hidden="true">{i + 1}</span><div><h3>{s.t}</h3><p>{s.d}</p></div></li>
              ))}
            </ol>
          </section>

          <section className="blok">
            <header className="blok-kop"><p className="eyebrow dark">Mogelijkheden</p><h2>Alles wat bij je zoektocht komt kijken</h2></header>
            <dl className="voordelen">
              {VOORDELEN.map((v) => (<div key={v.t}><dt>{v.t}</dt><dd>{v.d}</dd></div>))}
            </dl>
          </section>
        </div>

        <section id="zekerheid" className="zeker">
          <div className="zeker-in">
            <header className="blok-kop"><p className="eyebrow">Zekerheid</p><h2>Zorgvuldig en veilig, vanaf het ontwerp</h2></header>
            <div className="zeker-grid">
              {ZEKERHEID.map((z) => (<div key={z.t} className="zeker-item"><span className="zeker-icoon"><Vink /></span><h3>{z.t}</h3><p>{z.d}</p></div>))}
            </div>
          </div>
        </section>

        <div className="wrap">
          <section id="prijzen" className="blok">
            <header className="blok-kop"><p className="eyebrow dark">Abonnementen</p><h2>Kies het abonnement dat bij je past</h2></header>
            <p className="sub">Maandelijks opzegbaar. Betaling verloopt via iDEAL; daarna wordt het bedrag automatisch afgeschreven.</p>
            <div className="prices">
              {plans.map((p) => (
                <div key={p.id} className={"price" + (p.id === "pro" ? " hot" : "")}>
                  {p.id === "pro" && <span className="price-flag">Meest gekozen</span>}
                  <h3>{p.naam}</h3>
                  <div className="amount">{p.prijsTekst}<small>{p.prijs ? " per maand" : " blijvend gratis"}</small></div>
                  <ul>{p.voordelen.map((v) => <li key={v}><Vink />{v}</li>)}</ul>
                  <Link href="/login" className={"btn" + (p.id === "pro" ? " gold" : " ghost")}>{p.prijs ? `${p.naam} kiezen` : "Gratis beginnen"}</Link>
                </div>
              ))}
            </div>
          </section>

          <section id="vragen" className="blok blok-smal">
            <header className="blok-kop"><p className="eyebrow dark">Veelgestelde vragen</p><h2>Antwoorden op je vragen</h2></header>
            <div className="faq">
              {VRAGEN.map((q) => (<details key={q.v}><summary>{q.v}</summary><p>{q.a}</p></details>))}
            </div>
          </section>
        </div>

        <section className="slot">
          <div className="slot-in">
            <h2>Breng je stagezoektocht in kaart</h2>
            <p>Inloggen duurt een halve minuut. Daarna heb je direct overzicht.</p>
            <Link href="/login" className="btn gold">Gratis beginnen</Link>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
