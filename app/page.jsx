import Link from "next/link";
import { PLANS } from "@/lib/plans";
import SiteFooter from "@/components/SiteFooter";
import HeroDemo from "@/components/HeroDemo";

const STAPPEN = [
  { t: "Zet je bedrijven erin", d: "Vul in met wie je hebt gesproken en wat ze zeiden. Stagejacht onthoudt de status en wanneer je moet terugbellen." },
  { t: "Laat de mail schrijven, jij controleert", d: "De AI leest wat het bedrijf zoekt en schrijft een mail die bij jou past. Jij leest hem, past hem aan en tikt op Versturen." },
  { t: "Een reactie? Je weet wat je nu doet", d: "Stagejacht ziet dat er een antwoord is, zegt of het goed of slecht nieuws is en geeft advies. Bij een nee: bellen en vragen waarom." },
];

const VOORDELEN = [
  { t: "Vacatures bij jou in de buurt", d: "Nieuwe stageplekken van Stagemarkt en het internet, binnen de afstand die jij kiest. Verversen kan wanneer je wilt." },
  { t: "Een cv dat beter wordt", d: "Je krijgt een cijfer en concrete verbeterpunten. Daarna pas je alles aan in de editor en download je een nette pdf." },
  { t: "Mails die niet als een robot klinken", d: "Een meter laat zien welke zinnen te stijf zijn. Eén tik en ze worden menselijker. Jouw eigen toevoegingen blijven staan." },
  { t: "Als app op je telefoon", d: "Zet Stagejacht op je beginscherm. Open, check wie er heeft gereageerd, klaar." },
];

const VRAGEN = [
  { v: "Hoeveel kost het?", a: "Je begint gratis met maximaal 5 bedrijven. Meer bedrijven, mailcontrole en automatische vacatures zitten in Pro en Premium. Je kunt elke maand opzeggen." },
  { v: "Moet ik mijn Gmail koppelen?", a: "Nee, dat kan later. Zonder Gmail houd je alleen je lijst bij. Met Gmail kan Stagejacht mails versturen en reacties herkennen." },
  { v: "Verstuurt de AI zomaar mails?", a: "Nooit. Elke mail staat eerst voor je klaar. Pas als jij hem hebt gelezen, het vakje hebt aangevinkt en op Versturen tikt, gaat hij weg." },
  { v: "Wie ziet mijn gegevens?", a: "Alleen jij. Je bedrijven, cv en mails zijn van jou. Je kunt Gmail loskoppelen en je account met alle gegevens zelf verwijderen." },
  { v: "Werkt het voor elke opleiding?", a: "Ja. Je vult je opleiding, niveau en leerweg in, en de vacatures en mails passen zich daarop aan." },
];

export default function Home() {
  const plans = [PLANS.free, PLANS.pro, PLANS.premium];
  return (
    <>
      <header className="site-head">
        <div className="in">
          <Link href="/" className="logo"><img src="/logo.svg" alt="" width="34" height="34" />Stagejacht</Link>
          <div className="site-nav" role="navigation" aria-label="Hoofdmenu">
            <a href="#zo-werkt-het">Zo werkt het</a>
            <a href="#prijzen">Prijzen</a>
            <a href="#vragen">Vragen</a>
            <Link href="/login" className="btn small">Inloggen</Link>
          </div>
        </div>
      </header>

      <main>
        <section className="hero2">
          <div className="hero2-in">
            <div className="hero2-copy">
              <h1>Stage vinden is genoeg gedoe. Het overzicht regelen wij.</h1>
              <p>Je mailt tien bedrijven, twee antwoorden en je weet niet meer wie wat zei. Stagejacht houdt het bij, schrijft mails die bij je passen en zegt wat je na elk antwoord moet doen.</p>
              <div className="cta">
                <Link href="/login" className="btn gold">Begin gratis</Link>
                <a href="#zo-werkt-het" className="btn line">Zo werkt het</a>
              </div>
              <p className="hero2-small">Voor mbo-studenten. Geen creditcard nodig.</p>
            </div>
            <HeroDemo />
          </div>
        </section>

        <div className="wrap">
          <section id="zo-werkt-het" className="blok">
            <h2>Van eerste mail tot stageplek</h2>
            <ol className="stappen">
              {STAPPEN.map((s, i) => (
                <li key={s.t}><span className="stap-nr" aria-hidden="true">{i + 1}</span><div><h3>{s.t}</h3><p>{s.d}</p></div></li>
              ))}
            </ol>
          </section>

          <section className="blok">
            <h2>Alles wat erbij komt kijken</h2>
            <dl className="voordelen">
              {VOORDELEN.map((v) => (<div key={v.t}><dt>{v.t}</dt><dd>{v.d}</dd></div>))}
            </dl>
          </section>

          <section id="prijzen" className="blok">
            <h2>Kies wat bij je zoektocht past</h2>
            <p className="sub">Maandelijks opzegbaar. Je betaalt met iDEAL, daarna gaat het automatisch.</p>
            <div className="prices">
              {plans.map((p) => (
                <div key={p.id} className={"price" + (p.id === "pro" ? " hot" : "")}>
                  {p.id === "pro" && <span className="price-flag">Meest gekozen</span>}
                  <h3>{p.naam}</h3>
                  <div className="amount">{p.prijsTekst}<small>{p.prijs ? " per maand" : " voor altijd"}</small></div>
                  <ul>{p.voordelen.map((v) => <li key={v}>{v}</li>)}</ul>
                  <Link href="/login" className={"btn" + (p.id === "pro" ? " gold" : " ghost")}>{p.prijs ? `Kies ${p.naam}` : "Begin gratis"}</Link>
                </div>
              ))}
            </div>
          </section>

          <section id="vragen" className="blok blok-smal">
            <h2>Vragen die je misschien hebt</h2>
            <div className="faq">
              {VRAGEN.map((q) => (<details key={q.v}><summary>{q.v}</summary><p>{q.a}</p></details>))}
            </div>
          </section>
        </div>

        <section className="slot">
          <div className="slot-in">
            <h2>Begin vandaag met je eerste bedrijf</h2>
            <p>Inloggen kost een halve minuut. Daarna zie je meteen waar je staat.</p>
            <Link href="/login" className="btn gold">Begin gratis</Link>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
