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
    if (error) { toast("Opslaan lukte niet. Probeer het opnieuw."); return; }
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
                <h1>Vind sneller een stageplek</h1>
                <p>Vertel kort wie je bent. Dan kan de AI je mails en vacatures op jou afstemmen.</p>
              </div>
              <form className="box" style={{ gap: 14 }} onSubmit={opslaan}>
                <h2>Over jou</h2>
                <label className="q"><span>Wat is je naam?</span><input value={f.naam} onChange={set("naam")} required autoComplete="name" placeholder="Voornaam en achternaam" /></label>
                <label className="q"><span>Welke opleiding doe je?</span><input value={f.opleiding} onChange={set("opleiding")} placeholder="Bijv. Software developer" /></label>
                <label className="q"><span>Op welke school?</span><input value={f.school} onChange={set("school")} placeholder="Naam van je school" /></label>
                <div className="grid2">
                  <label className="q"><span>Welk niveau?</span><select value={f.niveau} onChange={set("niveau")}>{["4", "3", "2", "1"].map((n) => <option key={n} value={n}>Niveau {n}</option>)}</select></label>
                  <label className="q"><span>Welke leerweg?</span><select value={f.leerweg} onChange={set("leerweg")}><option value="BOL">BOL (school + stage)</option><option value="BBL">BBL (werken + leren)</option></select></label>
                  <label className="q"><span>Waar woon je?</span><input value={f.woonplaats} onChange={set("woonplaats")} placeholder="Plaatsnaam" /></label>
                  <label className="q"><span>Je telefoonnummer</span><input value={f.telefoon} onChange={set("telefoon")} type="tel" autoComplete="tel" placeholder="06 …" /></label>
                </div>
                <button className="btn wide" type="submit">Volgende</button>
              </form>
            </>
          )}

          {stap === 2 && (
            <>
              <div className="welcome-hero">
                <span className="eyebrow">Stap 2 van 3</span>
                <h1>Verbind je Gmail</h1>
                <p>Dan kun je mails versturen vanaf je eigen Gmail en ziet Stagejacht wanneer een bedrijf reageert.</p>
              </div>
              <div className="box">
                <GmailKnop />
                <p className="note">Kies hetzelfde Google-account waarmee je net bent ingelogd. Stagejacht leest alleen mails van bedrijven uit jouw lijst en verstuurt nooit iets zonder dat jij op Versturen tikt.</p>
              </div>
              <div className="actions"><button className="btn ghost" type="button" onClick={() => setStap(3)}>Later doen</button></div>
            </>
          )}

          {stap === 3 && (
            <>
              <div className="welcome-hero">
                <span className="eyebrow">Klaar</span>
                <h1>Je bent klaar om te beginnen</h1>
                <p>Tip: zet bij Mijn cv je cv en vul bij Profiel een stukje over jezelf in. Dan schrijft de AI veel betere mails voor je.</p>
              </div>
              <button className="btn wide" type="button" onClick={klaar}>Naar mijn overzicht</button>
            </>
          )}
        </div>
      </section>
    </main>
  );
}
