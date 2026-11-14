"use client";
import { useEffect, useState } from "react";
import { PLANS } from "@/lib/plans";
import { api } from "@/lib/ui";

// Knop om Gmail te koppelen (ook gebruikt in de welkomststappen)
export function GmailKnop({ label = "Verbind Gmail" }) {
  const [bezig, setBezig] = useState(false);
  async function koppel() {
    setBezig(true);
    window.location.href = "/auth/google?gmail=1";
  }
  return <button className="btn wide" type="button" onClick={koppel} disabled={bezig}>{bezig ? "Bezig…" : label}</button>;
}

export default function Profiel({ dbc, user, profile, plan, usage, toast, loadProfile }) {
  const p = profile || {};
  const [f, setF] = useState({});
  const [bezig, setBezig] = useState("");
  const [verwijderTekst, setVerwijderTekst] = useState("");
  const [installPrompt, setInstallPrompt] = useState(null);
  const [opzeggen, setOpzeggen] = useState(false);

  useEffect(() => {
    setF({
      naam: p.naam || "", opleiding: p.opleiding || "", school: p.school || "", woonplaats: p.woonplaats || "",
      niveau: p.niveau || "4", leerweg: p.leerweg || "BOL", crebocode: p.crebocode || "", telefoon: p.telefoon || "",
      email: p.email || user?.email || "", beschikbaar: p.beschikbaar || "", overmij: p.overmij || "", sterk: p.sterk || "", ervaring: p.ervaring || "", maxafstand: String(p.maxafstand || 15),
    });
  }, [profile]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const h = (e) => { e.preventDefault(); setInstallPrompt(e); };
    window.addEventListener("beforeinstallprompt", h);
    return () => window.removeEventListener("beforeinstallprompt", h);
  }, []);

  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  async function opslaan(e) {
    e.preventDefault();
    const { error } = await dbc.from("profiles").update({ ...f, maxafstand: Number(f.maxafstand || 15) }).eq("id", user.id);
    if (error) toast("Opslaan lukte niet"); else { toast("Profiel opgeslagen"); loadProfile(); }
  }
  async function kies(planId) {
    setBezig(planId);
    try { const { url } = await api("/api/billing/checkout", { plan: planId }); window.location.href = url; }
    catch (e) { toast(e.message); setBezig(""); }
  }
  async function zegOp() {
    setBezig("opzeggen");
    try {
      const { tot } = await api("/api/billing/cancel");
      toast(`Opgezegd. Je houdt ${plan.naam} tot ${new Date(tot).toLocaleDateString("nl-NL")}.`);
      setOpzeggen(false); loadProfile();
    } catch (e) { toast(e.message); } finally { setBezig(""); }
  }
  async function ontkoppel() {
    try { await api("/api/gmail/disconnect"); toast("Gmail losgekoppeld"); loadProfile(); } catch (e) { toast(e.message); }
  }
  async function verwijderAccount() {
    setBezig("verwijderen");
    try { await api("/api/account/delete"); await dbc.auth.signOut(); window.location.href = "/"; }
    catch (e) { toast(e.message); setBezig(""); }
  }

  const avatar = user?.user_metadata?.avatar_url;
  const procent = plan.aiPerMaand ? Math.min(100, Math.round((usage / plan.aiPerMaand) * 100)) : 0;
  const isBetaald = plan.id !== "free";

  return (
    <section className="view">
      <div>
        <h1>Profiel en instellingen</h1>
        <p className="sub">Je account, abonnement, Gmail en gegevens.</p>
      </div>

      <div className="box">
        <h2>Account</h2>
        <div className="account">
          {avatar ? <img src={avatar} alt="" referrerPolicy="no-referrer" /> : <span className="lock-icon" style={{ width: 44, height: 44, margin: 0 }} />}
          <div><b>{p.naam || user?.user_metadata?.full_name || "Onbekend"}</b><span className="note">{user?.email}</span></div>
        </div>
        <form action="/auth/logout" method="post"><button className="btn ghost" type="submit">Uitloggen</button></form>
      </div>

      <div className="box">
        <div className="toggle-row"><h2>Abonnement</h2><span className="tag">{plan.naam}</span></div>
        <div>
          <p className="note" style={{ marginBottom: 6 }}>AI-acties deze maand: {usage} van {plan.aiPerMaand}</p>
          <div className="meter"><span style={{ width: procent + "%" }} /></div>
        </div>
        {isBetaald && p.plan_tot && (
          <p className="note">
            {p.mollie_subscription_id
              ? `Wordt automatisch verlengd. Volgende afschrijving rond ${new Date(p.plan_tot).toLocaleDateString("nl-NL")}.`
              : `Opgezegd. Je houdt ${plan.naam} tot ${new Date(p.plan_tot).toLocaleDateString("nl-NL")}.`}
          </p>
        )}
        <div className="plan-row">
          {[PLANS.free, PLANS.pro, PLANS.premium].map((pl) => (
            <div key={pl.id} className={"plan-card" + (pl.id === plan.id ? " current" : "")}>
              <b>{pl.naam}</b>
              <span className="amount" style={{ fontFamily: "var(--f-display)", fontWeight: 800, fontSize: "1.5rem" }}>{pl.prijsTekst}<small className="note">{pl.prijs ? " /maand" : ""}</small></span>
              <ul className="note" style={{ margin: 0, paddingLeft: 18 }}>{pl.voordelen.map((v) => <li key={v}>{v}</li>)}</ul>
              {pl.id === plan.id ? <span className="tag">Je huidige abonnement</span>
                : pl.id === "free" ? null
                : <button className="btn small" type="button" onClick={() => kies(pl.id)} disabled={!!bezig}>{bezig === pl.id ? "Even geduld…" : isBetaald ? `Overstappen naar ${pl.naam}` : `Kies ${pl.naam}`}</button>}
            </div>
          ))}
        </div>
        <p className="note">Betalen met iDEAL, daarna maandelijkse automatische incasso via Mollie. Overstappen start een nieuwe maand. Maandelijks opzegbaar.</p>
        {isBetaald && p.mollie_subscription_id && (
          opzeggen ? (
            <div className="actions">Weet je het zeker? Je houdt {plan.naam} tot het einde van de betaalde maand.
              <button className="btn danger small" type="button" onClick={zegOp} disabled={!!bezig}>Ja, opzeggen</button>
              <button className="btn ghost small" type="button" onClick={() => setOpzeggen(false)}>Nee</button>
            </div>
          ) : <div className="actions"><button className="btn ghost small" type="button" onClick={() => setOpzeggen(true)}>Abonnement opzeggen</button></div>
        )}
      </div>

      <div className="box">
        <h2>Gmail</h2>
        <div className="connect-state" style={{ "--c": p.gmail_verbonden ? "var(--s-yes)" : "var(--s-todo)" }}>
          <span className="dot" /><span>{p.gmail_verbonden ? `Verbonden${p.gmail_adres ? " met " + p.gmail_adres : ""}` : "Nog niet verbonden"}</span>
        </div>
        {p.gmail_verbonden
          ? <div className="actions"><button className="btn ghost small" type="button" onClick={ontkoppel}>Gmail loskoppelen</button></div>
          : <GmailKnop />}
        <p className="note">Stagejacht leest alleen mails van bedrijven uit jouw lijst en verstuurt alleen mails waar jij zelf op Versturen tikt. Loskoppelen trekt de toegang direct in bij Google.</p>
      </div>

      <form className="box" onSubmit={opslaan}>
        <h2>Mijn profiel</h2>
        <div className="grid2">
          <label className="q"><span>Naam</span><input value={f.naam || ""} onChange={set("naam")} required /></label>
          <label className="q"><span>Opleiding</span><input value={f.opleiding || ""} onChange={set("opleiding")} /></label>
          <label className="q"><span>School</span><input value={f.school || ""} onChange={set("school")} /></label>
          <label className="q"><span>Woonplaats</span><input value={f.woonplaats || ""} onChange={set("woonplaats")} /></label>
          <label className="q"><span>Niveau</span><select value={f.niveau || "4"} onChange={set("niveau")}>{["4", "3", "2", "1"].map((n) => <option key={n} value={n}>Niveau {n}</option>)}</select></label>
          <label className="q"><span>Leerweg</span><select value={f.leerweg || "BOL"} onChange={set("leerweg")}><option value="BOL">BOL</option><option value="BBL">BBL</option></select></label>
          <label className="q"><span>Crebocode <em>(optioneel)</em></span><input value={f.crebocode || ""} onChange={set("crebocode")} inputMode="numeric" placeholder="5 cijfers" /></label>
          <label className="q"><span>Telefoonnummer</span><input value={f.telefoon || ""} onChange={set("telefoon")} type="tel" autoComplete="tel" placeholder="06 …" /></label>
          <label className="q"><span>E-mailadres <em>(komt onder je mails)</em></span><input value={f.email || ""} onChange={set("email")} type="email" /></label>
          <label className="q"><span>Wanneer kun je beginnen?</span><input value={f.beschikbaar || ""} onChange={set("beschikbaar")} placeholder="Bijv. per direct" /></label>
          <label className="q"><span>Hoe ver wil je reizen?</span><select value={f.maxafstand || "15"} onChange={set("maxafstand")}>{["5", "10", "15", "25", "40"].map((k) => <option key={k} value={k}>Max {k} km</option>)}</select></label>
          <label className="q span2"><span>Waar ben je goed in? <em>(sterke punten, vaardigheden)</em></span><textarea value={f.sterk || ""} onChange={set("sterk")} /></label>
          <label className="q span2"><span>Ervaring, projecten en bijbanen</span><textarea value={f.ervaring || ""} onChange={set("ervaring")} /></label>
          <label className="q span2"><span>Over mij <em>(wat kun je, waar ben je goed in, wat wil je leren?)</em></span><textarea value={f.overmij || ""} onChange={set("overmij")} /></label>
        </div>
        <div className="actions"><button className="btn small" type="submit">Profiel opslaan</button></div>
      </form>

      <div className="box">
        <h2>Stagejacht als app</h2>
        {installPrompt
          ? <div className="actions"><button className="btn small" type="button" onClick={async () => { installPrompt.prompt(); await installPrompt.userChoice; setInstallPrompt(null); }}>Installeer de app</button></div>
          : null}
        <div className="steps">
          <div><b>iPhone (Safari)</b><ol className="note"><li>Tik op Deel (vierkantje met pijl).</li><li>Kies Zet op beginscherm.</li><li>Tik op Voeg toe.</li></ol></div>
          <div><b>Android (Chrome)</b><ol className="note"><li>Tik op ⋮ rechtsboven.</li><li>Kies App installeren of Toevoegen aan startscherm.</li></ol></div>
        </div>
      </div>

      <div className="box danger-zone">
        <h2>Account verwijderen</h2>
        <p className="note">Dit verwijdert je account, je bedrijven, je cv en je Gmail-koppeling voor altijd. Een lopend abonnement wordt gestopt. Typ VERWIJDER om te bevestigen.</p>
        <div className="actions">
          <input value={verwijderTekst} onChange={(e) => setVerwijderTekst(e.target.value)} placeholder="VERWIJDER" aria-label="Typ VERWIJDER" style={{ maxWidth: 200 }} />
          <button className="btn danger small" type="button" disabled={verwijderTekst !== "VERWIJDER" || !!bezig} onClick={verwijderAccount}>{bezig === "verwijderen" ? "Bezig…" : "Account verwijderen"}</button>
        </div>
      </div>
    </section>
  );
}
