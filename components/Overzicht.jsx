"use client";
import { useState } from "react";
import { S, OPEN, TONE, GROUPS, fmt, isDue, api } from "@/lib/ui";

export default function Overzicht({ setGroep, bedrijven, profile, plan, toast, go, openComposer, loadBedrijven }) {
  const [bezig, setBezig] = useState(false);
  const [melding, setMelding] = useState("");
  const n = (k) => bedrijven.filter((b) => b.status === k).length;
  const lopend = bedrijven.filter((b) => OPEN.includes(b.status)).length;
  const reacties = bedrijven.filter((b) => b.reactie_datum).sort((a, b) => b.reactie_datum.localeCompare(a.reactie_datum));
  const stappen = bedrijven.filter((b) => OPEN.includes(b.status)).sort((a, b) => (a.opvolg || "9999").localeCompare(b.opvolg || "9999"));

  async function check() {
    setBezig(true); setMelding("De assistent checkt je mail…");
    try {
      const { nieuw } = await api("/api/mail/check");
      setMelding(nieuw.length ? `${nieuw.length} nieuwe reactie${nieuw.length > 1 ? "s" : ""} gevonden. Bekijk het advies hieronder.` : "Geen nieuwe reacties gevonden.");
      await loadBedrijven();
    } catch (e) {
      setMelding(e.message);
    } finally { setBezig(false); }
  }

  let mailTekst = melding;
  if (!mailTekst) {
    if (!plan.mailcheckHandmatig) mailTekst = "Met Pro of Premium checkt de assistent je Gmail op reacties en geeft advies.";
    else if (!profile?.gmail_verbonden) mailTekst = "Verbind eerst je Gmail bij Profiel, dan kan de assistent je mail checken.";
    else mailTekst = "Je Gmail wordt elke dag automatisch gecheckt. Wil je nu kijken? Tik op de knop.";
  }

  return (
    <section className="view">
      <div>
        <h1>Hoe staat het ervoor?</h1>
        <p className="sub">{bedrijven.length ? `${bedrijven.length} bedrijven benaderd · ${lopend} lopen nog · ${n("no")} hebben geen plek` : "Nog geen bedrijven. Voeg je eerste contact toe via Nieuw."}</p>
      </div>
      <div className="stats">
        {Object.entries(GROUPS).map(([g, t]) => {
          const v = t.keys.reduce((a, k) => a + n(k), 0);
          return (
            <button key={g} type="button" className="stat" style={{ "--c": t.c }} aria-label={`${t.label}: ${v}. Toon alleen deze bedrijven`}
              onClick={() => { setGroep(g); go("bedrijven"); }}>
              <b>{v}</b><span>{t.label}</span>
            </button>
          );
        })}
      </div>

      <div className="box">
        <div className="checkbar">
          <p className="note">{mailTekst}</p>
          {plan.mailcheckHandmatig
            ? <button className="btn small" type="button" onClick={check} disabled={bezig || !profile?.gmail_verbonden}>{bezig ? "Bezig…" : "Check mijn mail"}</button>
            : <button className="btn small" type="button" onClick={() => go("profiel")}>Bekijk abonnementen</button>}
        </div>
      </div>

      <div className="box">
        <h2>Reacties van bedrijven</h2>
        <div>
          {reacties.length ? reacties.map((b) => {
            const t = TONE[b.reactie_soort] || TONE.neutraal;
            return (
              <div className="msg" key={b.id}>
                <div className="msg-head"><span className="name">{b.naam}</span><span className="tone" style={{ "--c": t.c }}>{t.label}</span><span className="when">{fmt(b.reactie_datum)}</span></div>
                {b.reactie_samenvatting && <p>{b.reactie_samenvatting}</p>}
                {b.advies && <div className="advice"><b>Advies</b>{b.advies}</div>}
                {b.reactie_msgid && <div className="actions"><button className="btn small" type="button" onClick={() => openComposer({ soort: "reply", bedrijf: b })}>Laat AI antwoorden</button></div>}
              </div>
            );
          }) : <div className="empty">Nog geen reacties. Zodra een bedrijf antwoordt, zie je het hier met advies.</div>}
        </div>
      </div>

      <div className="box">
        <h2>Volgende stappen</h2>
        <div>
          {stappen.length ? stappen.map((b) => (
            <div className="todo-item" key={b.id}>
              <div><span className="name">{b.naam}</span> <span className="pill" style={{ "--c": S[b.status].c }}>{S[b.status].label}</span></div>
              <span className={"when" + (isDue(b) ? " due" : "")}>{b.opvolg ? (isDue(b) ? "Vandaag opvolgen" : "Opvolgen " + fmt(b.opvolg)) : "Geen datum"}</span>
            </div>
          )) : <div className="empty">Geen openstaande bedrijven.</div>}
        </div>
      </div>
    </section>
  );
}
