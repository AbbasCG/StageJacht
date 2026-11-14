"use client";
import { useState } from "react";
import { api, fileToBase64 } from "@/lib/ui";

const VELDEN = ["naam", "telefoon", "email", "woonplaats", "opleiding", "school", "niveau", "leerweg", "beschikbaar", "overmij", "sterk", "ervaring"];
const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

// 1. Jij controleert je gegevens → 2. AI schrijft → 3. jij controleert de mail → 4. pas dan versturen.
export default function Composer({ soort, bedrijf, vacature, profile, user, dbc, toast, onClose, onSent, loadUsage, loadProfile, go }) {
  const doel = vacature || bedrijf || {};
  const naamDoel = doel.bedrijf || doel.naam || "";
  const [fase, setFase] = useState("gegevens");
  const [g, setG] = useState(() => {
    const p = profile || {};
    const start = Object.fromEntries(VELDEN.map((k) => [k, p[k] ?? ""]));
    if (!start.naam) start.naam = user?.user_metadata?.full_name || "";
    if (!start.email) start.email = user?.email || "";
    if (!start.niveau) start.niveau = "4";
    if (!start.leerweg) start.leerweg = "BOL";
    return { ...start, extra: "" };
  });
  const [opslaanInProfiel, setOpslaanInProfiel] = useState(true);
  const [to, setTo] = useState(soort === "reply" ? bedrijf?.email || "" : doel.email || "");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [cvMee, setCvMee] = useState(!!profile?.cv_bestand);
  const [extraBestand, setExtraBestand] = useState(null);
  const [ok, setOk] = useState(false);
  const [bezig, setBezig] = useState("");
  const [review, setReview] = useState(null);
  const [zoekt, setZoekt] = useState(doel.zoekt || "");

  const setVeld = (k) => (e) => setG({ ...g, [k]: e.target.value });
  const ontbreekt = [!g.telefoon && "telefoonnummer", !g.email && "e-mail", !g.opleiding && "opleiding",
    !g.overmij && !g.sterk && "iets over jezelf", !profile?.cv_bestand && "cv (bij Mijn cv)"].filter(Boolean);
  const stap = fase === "gegevens" ? 0 : ok ? 3 : body ? 2 : 1;

  async function schrijf(gegevens = g) {
    setBezig("De AI schrijft je mail…"); setReview(null); setOk(false);
    try {
      const out = await api("/api/mail/draft", { soort, bedrijfId: bedrijf?.id, vacatureId: vacature?.id, cvMee, gegevens, zoekt, toevoegingen: gegevens?.extra ? [gegevens.extra] : [] });
      if (soort !== "reply") setSubject(out.onderwerp);
      setBody(out.tekst);
      loadUsage?.();
    } catch (e) {
      toast(e.message);
      if (e.code === "limiet") { onClose(); go("profiel"); }
    } finally { setBezig(""); }
  }

  async function bevestigGegevens(e) {
    e.preventDefault();
    const schoon = Object.fromEntries(Object.entries(g).map(([k, v]) => [k, String(v || "").trim()]));
    if (!schoon.naam) { toast("Vul je naam in"); return; }
    if (!schoon.telefoon && !schoon.email) { toast("Vul je telefoonnummer of e-mail in, zodat het bedrijf je kan bereiken"); return; }
    if (schoon.email && !EMAIL.test(schoon.email)) { toast("Je e-mailadres klopt niet"); return; }
    setG(schoon);
    if (opslaanInProfiel) {
      const gewijzigd = Object.fromEntries(VELDEN.filter((k) => (profile?.[k] ?? "") !== schoon[k]).map((k) => [k, schoon[k]]));
      if (Object.keys(gewijzigd).length) {
        const { error } = await dbc.from("profiles").update(gewijzigd).eq("id", user.id);
        if (error) toast("Opslaan in je profiel lukte niet, maar je mail gebruikt je nieuwe gegevens wel");
        else loadProfile?.();
      }
    }
    setFase("mail");
    schrijf(schoon);
  }

  async function nakijken() {
    setBezig("De AI kijkt je mail na…");
    try {
      const out = await api("/api/mail/review", { naar: to, onderwerp: subject, tekst: body, bedrijfNaam: naamDoel, contact: doel.contact, gegevens: g });
      const haken = /\[[^\]]+\]/.test(body);
      const opmerkingen = [...out.opmerkingen, ...(haken ? ["Er staan nog [vierkante haken] in je mail die je moet invullen."] : [])];
      setReview({ verbeteringen: out.verbeteringen.map((f) => ({ ...f, aan: true })), opmerkingen });
      loadUsage?.();
    } catch (e) { toast(e.message); } finally { setBezig(""); }
  }

  async function verstuur() {
    if (!ok) return;
    if (/\[[^\]]+\]/.test(body)) { toast("Vul eerst alles tussen [vierkante haken] in"); return; }
    setBezig("Versturen…");
    try {
      let bijlage;
      if (extraBestand) {
        if (extraBestand.size > 2.5 * 1024 * 1024) { toast("Je extra bijlage is te groot (max 2,5 MB)"); setBezig(""); return; }
        bijlage = { naam: extraBestand.name, type: extraBestand.type || "application/octet-stream", data: await fileToBase64(extraBestand) };
      }
      await api("/api/mail/send", { soort, bedrijfId: bedrijf?.id, vacatureId: vacature?.id, naar: to, onderwerp: subject, tekst: body, cvMee, bijlage, gecontroleerd: true });
      onSent();
    } catch (e) {
      toast(e.message + (e.status >= 500 ? " Kijk in je Verzonden-map of hij toch is verstuurd." : ""));
      setBezig("");
    }
  }

  const wijzig = (fn) => (e) => { fn(e.target.value); setOk(false); };

  return (
    <div className="overlay" role="dialog" aria-modal="true" aria-labelledby="cTitle" onKeyDown={(e) => e.key === "Escape" && !bezig && onClose()}>
      <div className="sheet">
        <div className="sheet-head">
          <h2 id="cTitle">{soort === "reply" ? `Antwoord aan ${naamDoel}` : `Mail aan ${naamDoel}`}</h2>
          <button className="x" type="button" aria-label="Sluiten" onClick={onClose} disabled={bezig === "Versturen…"}>×</button>
        </div>
        <div className="steps-bar" aria-hidden="true">
          {["1. Je gegevens", "2. AI schrijft", "3. Jij controleert", "4. Versturen"].map((t, i) => <span key={t} className={i <= stap ? "on" : ""}>{t}</span>)}
        </div>

        {fase === "gegevens" ? (
          <form className="gegevens" onSubmit={bevestigGegevens}>
            <p className="note">Controleer je gegevens. De AI gebruikt precies wat hier staat, dus vul aan wat ontbreekt en verbeter wat niet klopt.</p>
            <div className="grid2">
              <label className="q"><span>Naam</span><input value={g.naam} onChange={setVeld("naam")} required autoComplete="name" /></label>
              <label className="q"><span>Telefoon</span><input value={g.telefoon} onChange={setVeld("telefoon")} type="tel" autoComplete="tel" placeholder="06 …" /></label>
              <label className="q"><span>E-mail</span><input value={g.email} onChange={setVeld("email")} type="email" autoComplete="email" /></label>
              <label className="q"><span>Woonplaats</span><input value={g.woonplaats} onChange={setVeld("woonplaats")} /></label>
              <label className="q"><span>Opleiding</span><input value={g.opleiding} onChange={setVeld("opleiding")} /></label>
              <label className="q"><span>School</span><input value={g.school} onChange={setVeld("school")} /></label>
              <label className="q"><span>Niveau</span><select value={g.niveau} onChange={setVeld("niveau")}>{["4", "3", "2", "1"].map((n) => <option key={n} value={n}>Niveau {n}</option>)}</select></label>
              <label className="q"><span>Leerweg</span><select value={g.leerweg} onChange={setVeld("leerweg")}><option value="BOL">BOL</option><option value="BBL">BBL</option></select></label>
              <label className="q span2"><span>Wanneer kun je beginnen?</span><input value={g.beschikbaar} onChange={setVeld("beschikbaar")} placeholder="Bijv. per direct" /></label>
              <label className="q span2"><span>Over mij <em>(wie ben je, wat wil je leren?)</em></span><textarea style={{ minHeight: 70 }} value={g.overmij} onChange={setVeld("overmij")} /></label>
              <label className="q span2"><span>Waar ben je goed in? <em>(sterke punten, vaardigheden)</em></span><textarea style={{ minHeight: 60 }} value={g.sterk} onChange={setVeld("sterk")} placeholder="Bijv. ik leg dingen rustig uit, ik ben handig met computers" /></label>
              <label className="q span2"><span>Ervaring, projecten en bijbanen</span><textarea style={{ minHeight: 60 }} value={g.ervaring} onChange={setVeld("ervaring")} placeholder="Bijv. schoolproject, bijbaan, vrijwilligerswerk" /></label>
            </div>
            <div className="extra-box">
              <label className="q"><span>Extra voor deze sollicitatie <em>(alleen voor deze mail)</em></span>
                <textarea style={{ minHeight: 70 }} value={g.extra} onChange={setVeld("extra")} placeholder="Bijv. waarom je juist bij dit bedrijf wilt, iets wat je over ze weet, je rijbewijs, of dat je ook in de avond kunt" />
              </label>
            </div>
            {ontbreekt.length > 0 && <p className="hint">Nog niet ingevuld: {ontbreekt.join(", ")}. Hoe meer je invult, hoe persoonlijker en beter je mail.</p>}
            <label className="check"><input type="checkbox" checked={opslaanInProfiel} onChange={(e) => setOpslaanInProfiel(e.target.checked)} /> Wijzigingen ook opslaan in mijn profiel</label>
            <div className="actions">
              <button className="btn" type="submit">Klopt, laat de AI schrijven</button>
              <button className="btn ghost" type="button" onClick={onClose}>Annuleren</button>
            </div>
          </form>
        ) : (
          <div className="cmail">
            <div className="actions"><button className="btn ghost small" type="button" onClick={() => setFase("gegevens")} disabled={!!bezig}>← Gegevens aanpassen</button></div>
            {bezig && <div className="loading"><span className="spin" /><span>{bezig}</span></div>}
            <details className="zoekt-box" open={!zoekt}>
              <summary>Wat zoekt dit bedrijf? <span className="note">{zoekt ? "(onderzocht)" : "(nog niet onderzocht)"}</span></summary>
              <textarea style={{ minHeight: 90 }} value={zoekt} onChange={(e) => setZoekt(e.target.value)} placeholder="Plak hier wat het bedrijf zoekt (uit de vacature of hun website). Tik daarna op Opnieuw laten schrijven." />
              <p className="note">De AI laat je mail hierop aansluiten. Het wordt bewaard bij dit bedrijf.</p>
            </details>
            {soort !== "reply" && <label className="q"><span>Aan</span><input type="email" value={to} onChange={wijzig(setTo)} placeholder="naam@bedrijf.nl" /></label>}
            {soort !== "reply" && <label className="q"><span>Onderwerp</span><input value={subject} onChange={wijzig(setSubject)} /></label>}
            <label className="q"><span>Je mail <em>(je kunt alles aanpassen)</em></span><textarea value={body} onChange={wijzig(setBody)} /></label>
            {profile?.cv_bestand && (
              <label className="check"><input type="checkbox" checked={cvMee} onChange={(e) => { setCvMee(e.target.checked); setOk(false); }} /> Mijn cv meesturen ({profile.cv_bestandsnaam || "cv"})</label>
            )}
            <label className="q"><span>Extra bijlage <em>(optioneel, max 2,5 MB)</em></span>
              <input type="file" accept="application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,.pdf,.docx,.png,.jpg" onChange={(e) => { setExtraBestand(e.target.files?.[0] || null); setOk(false); }} />
            </label>
            <div className="actions">
              <button className="btn ghost small" type="button" onClick={() => schrijf()} disabled={!!bezig}>Opnieuw laten schrijven</button>
              <button className="btn ghost small" type="button" onClick={nakijken} disabled={!!bezig || !body}>Laat AI nakijken</button>
            </div>
            {review && (
              <div className={"review " + (!review.verbeteringen.length && !review.opmerkingen.length ? "ok" : "warn")}>
                {!review.verbeteringen.length && !review.opmerkingen.length ? <><b>De AI vond geen fouten.</b> Lees hem zelf nog even door en vink het vakje aan.</> : (
                  <>
                    {review.verbeteringen.length > 0 && (
                      <>
                        <b>Voorgestelde verbeteringen</b> <span className="note">(je tekst blijft verder precies hetzelfde)</span>
                        <ul className="fixes">
                          {review.verbeteringen.map((f, i) => (
                            <li key={i}><label className="check">
                              <input type="checkbox" checked={f.aan} onChange={(e) => setReview({ ...review, verbeteringen: review.verbeteringen.map((x, j) => j === i ? { ...x, aan: e.target.checked } : x) })} />
                              <span><s>{f.van}</s> → <b>{f.naar}</b>{f.waarom && <><br /><span className="note">{f.waarom}</span></>}</span>
                            </label></li>
                          ))}
                        </ul>
                        <div className="actions"><button className="btn small" type="button" onClick={() => {
                          let nieuw = body, n = 0;
                          review.verbeteringen.forEach((f) => { if (f.aan && nieuw.includes(f.van)) { nieuw = nieuw.replace(f.van, f.naar); n++; } });
                          setBody(nieuw); setReview(null); setOk(false);
                          toast(n ? `${n} verbetering${n > 1 ? "en" : ""} toegepast. Verder is je mail niet veranderd.` : "Niets toegepast");
                        }}>Aangevinkte verbeteringen toepassen</button></div>
                      </>
                    )}
                    {review.opmerkingen.length > 0 && <><b>Check zelf even</b><ul>{review.opmerkingen.map((p, i) => <li key={i}>{p}</li>)}</ul></>}
                  </>
                )}
              </div>
            )}
              </div>
            )}
            <label className="check"><input type="checkbox" checked={ok} onChange={(e) => setOk(e.target.checked)} disabled={!body} /> Ik heb de mail zelf gelezen. Namen, bedrijf en inhoud kloppen.</label>
            <div className="actions">
              <button className="btn" type="button" onClick={verstuur} disabled={!ok || !!bezig}>Versturen</button>
              <button className="btn ghost" type="button" onClick={onClose} disabled={bezig === "Versturen…"}>Annuleren</button>
            </div>
            <p className="note">Er wordt pas iets verstuurd als jij op Versturen tikt. De mail gaat vanaf je eigen Gmail.</p>
          </div>
        )}
      </div>
    </div>
  );
}
