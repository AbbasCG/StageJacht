"use client";
import { useState } from "react";
import { GmailKnop } from "@/components/Profiel";

export default function Onboarding({ dbc, profile, user, toast, onKlaar }) {
  // Na het koppelen van Gmail kom je terug op de pagina: ga dan verder waar je was
  const [stap, setStap] = useState(profile?.gmail_verbonden ? 3 : profile?.opleiding || profile?.telefoon ? 2 : 1);
  const [f, setF] = useState({
    naam: profile?.naam || user?.user_metadata?.full_name || "",
    opleiding: profile?.opleiding || "",
    school: profile?.school || "",
    niveau: profile?.niveau || "4",
    leerweg: profile?.leerweg || "BOL",
    woonplaats: profile?.woonplaats || "",
    telefoon: profile?.telefoon || "",
  });
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  async function opslaan(e) {
    e.preventDefault();
    const { error } = await dbc.from("profiles").update({ ...f, email: profile?.email || user?.email }).eq("id", user.id);
    if (error) { toast("Het opslaan is niet gelukt. Probeer het opnieuw."); return; }
    setStap(2);
  }
  async function klaar() {
    await dbc.from("profiles").update({ onboarding_klaar: true }).eq("id", user.id);
    onKlaar();
  }

  return (
    <main className="wrap">
      <section className="view welcome">
        <div className="welcome-card">
          <div className="progress" aria-hidden="true">{[1, 2, 3].map((n) => <span key={n} className={n <= stap ? "on" : ""} />)}</div>

          {stap === 1 && (
            <>
              <div className="welcome-hero">
                <span className="eyebrow">Welkom bij Stagejacht</span>
                <h1>Je stagezoektocht, overzichtelijk geregeld</h1>
                <p>Vul een aantal gegevens in. Hiermee worden mails en vacatures afgestemd op jouw opleiding en situatie. Dit duurt ongeveer een minuut.</p>
              </div>
              <form className="box" style={{ gap: 14 }} onSubmit={opslaan}>
                <h2>Persoonlijke gegevens</h2>
                <label className="q"><span>Volledige naam</span><input value={f.naam} onChange={set("naam")} required autoComplete="name" placeholder="Voornaam en achternaam" /></label>
                <label className="q"><span>Opleiding</span><input value={f.opleiding} onChange={set("opleiding")} placeholder="Bijv. Software developer" /></label>
                <label className="q"><span>School</span><input value={f.school} onChange={set("school")} placeholder="Naam van je school" /></label>
                <div className="grid2">
                  <label className="q"><span>Niveau</span><select value={f.niveau} onChange={set("niveau")}>{["4", "3", "2", "1"].map((n) => <option key={n} value={n}>Niveau {n}</option>)}</select></label>
                  <label className="q"><span>Leerweg</span><select value={f.leerweg} onChange={set("leerweg")}><option value="BOL">BOL (school + stage)</option><option value="BBL">BBL (werken + leren)</option></select></label>
                  <label className="q"><span>Woonplaats</span><input value={f.woonplaats} onChange={set("woonplaats")} placeholder="Plaatsnaam" /></label>
                  <label className="q"><span>Telefoonnummer</span><input value={f.telefoon} onChange={set("telefoon")} type="tel" autoComplete="tel" placeholder="06 …" /></label>
                </div>
                <button className="btn wide" type="submit">Opslaan en doorgaan</button>
              </form>
            </>
          )}

          {stap === 2 && (
            <>
              <div className="welcome-hero">
                <span className="eyebrow">Stap 2 van 3</span>
                <h1>Koppel je Gmail-account</h1>
                <p>Hiermee verstuur je mails vanaf je eigen adres en worden reacties van bedrijven automatisch herkend.</p>
              </div>
              <div className="box">
                <GmailKnop />
                <p className="note">Kies hetzelfde Google-account waarmee je zojuist bent ingelogd. Stagejacht leest uitsluitend mails van bedrijven uit je overzicht en verstuurt nooit iets zonder jouw uitdrukkelijke bevestiging.</p>
              </div>
              <div className="actions"><button className="btn ghost" type="button" onClick={() => setStap(3)}>Later koppelen</button></div>
            </>
          )}

          {stap === 3 && (
            <>
              <div className="welcome-hero">
                <span className="eyebrow">Gereed</span>
                <h1>Je account is gereed</h1>
                <p>Advies: upload je cv bij Mijn cv en vul bij Profiel een korte beschrijving over jezelf in. Zo worden je mails persoonlijker en overtuigender.</p>
              </div>
              <button className="btn wide" type="button" onClick={klaar}>Naar mijn overzicht</button>
            </>
          )}
        </div>
      </section>
    </main>
  );
}
