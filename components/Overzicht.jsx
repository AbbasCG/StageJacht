"use client";
import { useState } from "react";
import { S, OPEN, TONE, GROUPS, fmt, isDue, api } from "@/lib/ui";

function groet() {
  const u = new Date().getHours();
  if (u < 6) return "Goedenacht";
  if (u < 12) return "Goedemorgen";
  if (u < 18) return "Goedemiddag";
  return "Goedenavond";
}

const Pijl = () => (<svg viewBox="0 0 20 20" width="16" height="16" aria-hidden="true"><path d="M7 4l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>);
const MailIcoon = () => (<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5" width="18" height="14" rx="2.5" /><path d="m4 7 8 6 8-6" /></svg>);

export default function Overzicht({ setGroep, setFocusId, bedrijven, profile, user, plan, go, openComposer, loadBedrijven }) {
  const [bezig, setBezig] = useState(false);
  const [melding, setMelding] = useState("");
  const n = (k) => bedrijven.filter((b) => b.status === k).length;
  const lopend = bedrijven.filter((b) => OPEN.includes(b.status)).length;
  const reacties = bedrijven.filter((b) => b.reactie_datum).sort((a, b) => b.reactie_datum.localeCompare(a.reactie_datum));
  const open = bedrijven.filter((b) => OPEN.includes(b.status)).sort((a, b) => (a.opvolg || "9999").localeCompare(b.opvolg || "9999"));
  const vandaag = open.filter(isDue);
  const later = open.filter((b) => !isDue(b));
  const voornaam = (profile?.naam || user?.user_metadata?.full_name || "").trim().split(/\s+/)[0];

  const bekijk = (b) => { setGroep(null); setFocusId(b.id); go("bedrijven"); };

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
    else mailTekst = "Je Gmail wordt elke dag automatisch gecheckt. Wil je nu kijken?";
  }

  const kop = (
    <div className="ov-head">
      <div>
        <h1>{groet()}{voornaam ? `, ${voornaam}` : ""}</h1>
        <p className="sub">
          {bedrijven.length
            ? `${bedrijven.length} bedrijven benaderd · ${lopend} lopen nog${vandaag.length ? ` · ${vandaag.length} vandaag opvolgen` : ""}`
            : "Welkom bij Stagejacht. Laten we beginnen met je eerste bedrijf."}
        </p>
      </div>
      {bedrijven.length > 0 && <button className="btn" type="button" onClick={() => go("toevoegen")}>+ Bedrijf toevoegen</button>}
    </div>
  );

  if (!bedrijven.length) {
    return (
      <section className="view">
        {kop}
        <div className="start">
          <ol className="start-steps">
            <li><span className="start-nr">1</span><div><b>Zet een bedrijf in je lijst</b><p>Een bedrijf waar je stage wilt lopen, of waar je al contact mee had.</p></div></li>
            <li><span className="start-nr">2</span><div><b>Laat een mail schrijven</b><p>De AI schrijft een mail die bij jou past. Jij leest hem en verstuurt hem zelf.</p></div></li>
            <li><span className="start-nr">3</span><div><b>Volg reacties op</b><p>Stagejacht houdt bij wie er reageert en zegt wat je daarna kunt doen.</p></div></li>
          </ol>
          <div className="actions">
            <button className="btn" type="button" onClick={() => go("toevoegen")}>+ Eerste bedrijf toevoegen</button>
            <button className="btn ghost" type="button" onClick={() => go("vacatures")}>Bekijk vacatures</button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="view">
      {kop}

      {vandaag.length > 0 && (
        <div className="box today">
          <div className="box-kop"><h2>Vandaag te doen</h2><span className="count">{vandaag.length}</span></div>
          <ul className="rows">
            {vandaag.map((b) => {
              const s = S[b.status] || S.todo;
              return (
                <li key={b.id} className="row">
                  <button type="button" className="row-main" onClick={() => bekijk(b)}>
                    <span className="name">{b.naam}</span>
                    <span className="pill" style={{ "--c": s.c }}>{s.label}</span>
                  </button>
                  <div className="row-acties">
                    {b.tel && <a className="btn ghost small" href={`tel:${b.tel.replace(/\s+/g, "")}`}>Bellen</a>}
                    {b.email && !b.reactie_msgid && ["todo", "bellen"].includes(b.status) && <button className="btn small" type="button" onClick={() => openComposer({ soort: "new", bedrijf: b })}>Mail schrijven</button>}
                    <button className="btn ghost small" type="button" onClick={() => bekijk(b)}>Bekijk</button>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <div className="stats">
        {Object.entries(GROUPS).map(([g, t]) => {
          const v = t.keys.reduce((a, k) => a + n(k), 0);
          return (
            <button key={g} type="button" className="stat" style={{ "--c": t.c }} aria-label={`${t.label}: ${v}. Toon alleen deze bedrijven`}
              onClick={() => { setGroep(g); go("bedrijven"); }}>
              <b>{v}</b><span>{t.label}</span><i className="stat-pijl"><Pijl /></i>
            </button>
          );
        })}
      </div>

      <div className="box mailbar">
        <span className="mailbar-ic"><MailIcoon /></span>
        <p className="note">{mailTekst}</p>
        {plan.mailcheckHandmatig
          ? <button className="btn small" type="button" onClick={check} disabled={bezig || !profile?.gmail_verbonden}>{bezig ? "Bezig…" : "Check mijn mail"}</button>
          : <button className="btn small" type="button" onClick={() => go("profiel")}>Bekijk abonnementen</button>}
      </div>

      <div className="box">
        <div className="box-kop"><h2>Reacties van bedrijven</h2>{reacties.length > 0 && <span className="count">{reacties.length}</span>}</div>
        <div>
          {reacties.length ? reacties.map((b) => {
            const t = TONE[b.reactie_soort] || TONE.neutraal;
            return (
              <div className="msg" key={b.id}>
                <div className="msg-head"><button type="button" className="name linkish" onClick={() => bekijk(b)}>{b.naam}</button><span className="tone" style={{ "--c": t.c }}>{t.label}</span><span className="when">{fmt(b.reactie_datum)}</span></div>
                {b.reactie_samenvatting && <p>{b.reactie_samenvatting}</p>}
                {b.advies && <div className="advice"><b>Advies</b>{b.advies}</div>}
                {b.reactie_msgid && <div className="actions"><button className="btn small" type="button" onClick={() => openComposer({ soort: "reply", bedrijf: b })}>Laat AI antwoorden</button></div>}
              </div>
            );
          }) : <div className="empty small-empty">Nog geen reacties. Zodra een bedrijf antwoordt, zie je het hier met advies.</div>}
        </div>
      </div>

      <div className="box">
        <div className="box-kop"><h2>Volgende stappen</h2></div>
        {later.length ? (
          <ul className="rows">
            {later.map((b) => {
              const s = S[b.status] || S.todo;
              return (
                <li key={b.id}>
                  <button type="button" className="row row-btn" onClick={() => bekijk(b)}>
                    <span className="row-main"><span className="name">{b.naam}</span><span className="pill" style={{ "--c": s.c }}>{s.label}</span></span>
                    <span className="when">{b.opvolg ? "Opvolgen " + fmt(b.opvolg) : "Geen datum"}</span>
                    <Pijl />
                  </button>
                </li>
              );
            })}
          </ul>
        ) : <div className="empty small-empty">{vandaag.length ? "Verder staat er niets gepland." : "Geen openstaande bedrijven."}</div>}
      </div>
    </section>
  );
}
