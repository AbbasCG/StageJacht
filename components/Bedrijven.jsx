"use client";
import { useEffect, useMemo, useState } from "react";
import { STATUSES, S, TONE, GROUPS, fmt, isDue, safeUrl } from "@/lib/ui";

export default function Bedrijven({ groep, setGroep, focusId, setFocusId, go, dbc, bedrijven, toast, edit, openComposer, loadBedrijven }) {
  const [filter, setFilter] = useState(null);
  const [zoek, setZoek] = useState("");
  const [open, setOpen] = useState(null);
  const [bevestig, setBevestig] = useState(null);

  // Vanuit het overzicht direct een bedrijf openen
  useEffect(() => {
    if (!focusId) return;
    setFilter(null); setZoek(""); setOpen(focusId); setFocusId(null);
    requestAnimationFrame(() => document.getElementById("bedrijf-" + focusId)?.scrollIntoView({ block: "center", behavior: "smooth" }));
  }, [focusId, setFocusId]);

  const counts = useMemo(() => Object.fromEntries(STATUSES.map((s) => [s.key, bedrijven.filter((b) => b.status === s.key).length])), [bedrijven]);
  const order = Object.fromEntries(STATUSES.map((s, i) => [s.key, i]));
  const q = zoek.toLowerCase();
  const shown = bedrijven
    .filter((b) => (groep ? GROUPS[groep].keys.includes(b.status) : !filter || b.status === filter))
    .filter((b) => !q || [b.naam, b.contact, b.email, b.plaats].some((x) => (x || "").toLowerCase().includes(q)))
    .sort((a, b) => (order[a.status] ?? 0) - (order[b.status] ?? 0) || a.naam.localeCompare(b.naam));

  async function verwijder(id) {
    const { error } = await dbc.from("bedrijven").delete().eq("id", id);
    setBevestig(null); setOpen(null);
    if (error) toast("Verwijderen lukte niet"); else { toast("Verwijderd"); loadBedrijven(); }
  }

  return (
    <section className="view">
      <div className="toolbar">
        <div>
          <h1>Bedrijven</h1>
          <p className="sub">Tik op een bedrijf voor details, mail en notities.</p>
        </div>
        <button className="btn" type="button" onClick={() => go("toevoegen")}>+ Bedrijf toevoegen</button>
      </div>
      {bedrijven.length > 0 && <input className="search" type="search" placeholder="Zoek op bedrijf, contact of plaats…" aria-label="Zoeken" value={zoek} onChange={(e) => setZoek(e.target.value)} />}
      {bedrijven.length > 0 && <div className="chips" aria-label="Filter op status">
        <button type="button" className="chip" aria-pressed={filter === null && !groep} onClick={() => { setFilter(null); setGroep(null); }}>Alles <b>{bedrijven.length}</b></button>
        {groep && <button type="button" className="chip" style={{ "--c": GROUPS[groep].c }} aria-pressed="true" onClick={() => setGroep(null)}><span className="dot" />{GROUPS[groep].label} <b>{bedrijven.filter((b) => GROUPS[groep].keys.includes(b.status)).length}</b></button>}
        {STATUSES.filter((s) => counts[s.key]).map((s) => (
          <button key={s.key} type="button" className="chip" style={{ "--c": s.c }} aria-pressed={!groep && filter === s.key} onClick={() => { setGroep(null); setFilter(s.key); }}>
            <span className="dot" />{s.label} <b>{counts[s.key]}</b>
          </button>
        ))}
      </div>}

      <div className="table">
        {!bedrijven.length ? (
          <div className="empty">
            <p>Je lijst is nog leeg. Voeg een bedrijf toe waar je stage wilt lopen.</p>
            <button className="btn" type="button" onClick={() => go("toevoegen")}>+ Eerste bedrijf toevoegen</button>
          </div>
        ) : (
          <>
            <div className="tr th"><span>Bedrijf</span><span>Contactpersoon</span><span>E-mail</span><span>Status</span><span>Opvolgen</span></div>
            {!shown.length && <div className="empty">Geen bedrijven gevonden met deze zoekopdracht of filter.</div>}
            {shown.map((b) => {
              const s = S[b.status] || S.todo;
              const isOpen = open === b.id;
              const url = safeUrl(b.link);
              const toggle = () => { setOpen(isOpen ? null : b.id); setBevestig(null); };
              return (
                <div key={b.id} id={"bedrijf-" + b.id} className={"tr item" + (isOpen ? " is-open" : "")} role="button" tabIndex={0} aria-expanded={isOpen}
                  onClick={(e) => { if (!e.target.closest("[data-stop]")) toggle(); }}
                  onKeyDown={(e) => { if ((e.key === "Enter" || e.key === " ") && e.target === e.currentTarget) { e.preventDefault(); toggle(); } }}>
                  <span className="name">{b.naam}
                    {b.reactie_soort && <span className="badge" style={{ "--c": (TONE[b.reactie_soort] || TONE.neutraal).c }}>reactie</span>}
                    {b.plaats && <small>{b.plaats}</small>}
                  </span>
                  <span className={"c-contact cell-muted" + (b.contact ? "" : " leeg")}>{b.contact || "—"}</span>
                  <span className={"c-mail cell-muted" + (b.email ? "" : " leeg")}>{b.email || "—"}</span>
                  <span className="c-status"><span className="pill" style={{ "--c": s.c }}>{s.label}</span></span>
                  <span className={"c-date date" + (isDue(b) ? " due" : "")}>{b.opvolg ? <><span className="lbl-m">{isDue(b) ? "Opvolgen: " : "Opvolgen "}</span>{fmt(b.opvolg)}</> : ""}</span>
                  {isOpen && (
                    <div className="detail" data-stop>
                      <div className="links">
                        {b.tel && <a href={`tel:${b.tel.replace(/\s+/g, "")}`}>Bel {b.tel}</a>}
                        {b.datum && <span>Laatste contact: {fmt(b.datum)}</span>}
                        {url && <a href={url} target="_blank" rel="noopener noreferrer">Vacature / website</a>}
                      </div>
                      {b.reactie_samenvatting && <p className="notes"><b>Reactie ({(TONE[b.reactie_soort] || TONE.neutraal).label.toLowerCase()}, {fmt(b.reactie_datum)}):</b> {b.reactie_samenvatting}</p>}
                      {b.advies && <div className="advice"><b>Advies</b>{b.advies}</div>}
                      {b.notes && <p className="notes">{b.notes}</p>}
                      {bevestig === b.id ? (
                        <div className="actions">{b.naam} verwijderen?
                          <button className="btn danger small" type="button" onClick={() => verwijder(b.id)}>Verwijderen</button>
                          <button className="btn ghost small" type="button" onClick={() => setBevestig(null)}>Annuleren</button>
                        </div>
                      ) : (
                        <div className="actions">
                          {b.reactie_msgid
                            ? <button className="btn small" type="button" onClick={() => openComposer({ soort: "reply", bedrijf: b })}>Laat AI antwoorden</button>
                            : b.email ? <button className="btn small" type="button" onClick={() => openComposer({ soort: "new", bedrijf: b })}>Mail laten schrijven</button> : null}
                          <button className="btn ghost small" type="button" onClick={() => edit(b)}>Bewerken</button>
                          <button className="btn ghost small" type="button" onClick={() => setBevestig(b.id)}>Verwijderen</button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </>
        )}
      </div>
    </section>
  );
}
