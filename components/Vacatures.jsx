"use client";
import { useState } from "react";
import { api, safeUrl, today } from "@/lib/ui";

function stagemarktUrl(p = {}) {
  const u = new URL("https://stagemarkt.nl/stages/");
  if (p.crebocode) u.searchParams.set("crebocode", p.crebocode);
  if (p.woonplaats) { u.searchParams.set("plaatsPostcode", p.woonplaats); u.searchParams.set("straal", "15"); u.searchParams.set("locatieType", "Postcode"); }
  if (p.niveau) u.searchParams.set("opleidingsniveau", p.niveau);
  return u.toString();
}

export default function Vacatures({ dbc, user, profile, plan, vacatures, toast, go, openComposer, loadVacatures, loadBedrijven }) {
  const [bezig, setBezig] = useState(false);
  const [sort, setSort] = useState("afstand");
  const [alleenErkend, setAlleenErkend] = useState(false);
  const p = profile || {};
  const lijst = vacatures
    .filter((v) => !alleenErkend || v.erkend === true)
    .slice()
    .sort(sort === "afstand" ? (a, b) => (a.afstand_km ?? 999) - (b.afstand_km ?? 999) : (a, b) => String(b.gevonden_at).localeCompare(String(a.gevonden_at)));

  async function zoekNu() {
    setBezig(true);
    try {
      const { aantal } = await api("/api/vacatures/zoek");
      toast(aantal ? `${aantal} nieuwe stageplek${aantal > 1 ? "ken" : ""} gevonden` : "Er zijn geen nieuwe stageplekken gevonden");
      loadVacatures();
    } catch (e) { toast(e.message); } finally { setBezig(false); }
  }
  async function verberg(v) {
    await dbc.from("vacatures").update({ verborgen: true }).eq("id", v.id).eq("user_id", user.id);
    loadVacatures();
  }
  async function zetInLijst(v) {
    const { error } = await dbc.from("bedrijven").insert({
      naam: v.bedrijf, plaats: v.plaats, link: v.link, contact: v.contact, email: v.email, tel: v.tel,
      status: "todo", datum: today(), notes: v.functie ? "Vacature: " + v.functie : null,
    });
    if (error) { toast(String(error.message).includes("LIMIET_BEDRIJVEN") ? "Je hebt het maximum van 3 bedrijven bereikt. Kies Pro of Premium voor onbeperkt bedrijven." : "Het toevoegen is niet gelukt. Probeer het opnieuw."); return; }
    await dbc.from("vacatures").update({ toegevoegd: true }).eq("id", v.id).eq("user_id", user.id);
    toast("De stageplek is toegevoegd aan je overzicht");
    loadVacatures(); loadBedrijven();
  }

  return (
    <section className="view">
      <div>
        <h1>Passende stageplekken</h1>
        <p className="sub">Stageplekken van Stagemarkt en andere bronnen die aansluiten bij je opleiding, niveau en leerweg, binnen {p.maxafstand || 15} km van je woonplaats.</p>
      </div>
      <div className="box">
        <div className="checkbar">
          <p className="note">
            {p.woonplaats
              ? `Zelf zoeken op Stagemarkt: niveau ${p.niveau || "?"}, ${p.leerweg || "BOL"}, in de omgeving van ${p.woonplaats}.` + (p.crebocode ? "" : " Vul je crebocode in bij Profiel voor nauwkeurigere resultaten.")
              : "Vul je woonplaats in bij Profiel om stageplekken in je omgeving te vinden."}
          </p>
          <a className="btn small ghost" href={stagemarktUrl(p)} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none" }}>Open Stagemarkt</a>
          {plan.vacatures
            ? <button className="btn small" type="button" onClick={zoekNu} disabled={bezig}>{bezig ? "Bezig met zoeken…" : "Nu zoeken"}</button>
            : <button className="btn small" type="button" onClick={() => go("profiel")}>Automatisch zoeken met Pro</button>}
        </div>
      </div>

      {vacatures.length > 0 && (
        <div className="vac-tools">
          <span className="note">Sorteren:</span>
          <button type="button" className="chip" aria-pressed={sort === "afstand"} onClick={() => setSort("afstand")}>Dichtstbij</button>
          <button type="button" className="chip" aria-pressed={sort === "nieuw"} onClick={() => setSort("nieuw")}>Nieuwste</button>
          <button type="button" className="chip" aria-pressed={alleenErkend} onClick={() => setAlleenErkend(!alleenErkend)}>Alleen erkend leerbedrijf</button>
        </div>
      )}
      <div className="vac-list">
        {!vacatures.length ? (
          <div className="empty">
            {plan.vacatures
              ? `Er zijn nog geen nieuwe stageplekken. Stagemarkt wordt ${plan.vacatures} doorzocht op plekken die bij je passen.`
              : "Met Pro of Premium worden passende stageplekken automatisch voor je gezocht."}
          </div>
        ) : lijst.map((v) => (
          <article className="vac" key={v.id}>
            <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", gap: "6px 12px", alignItems: "baseline" }}>
              <h3>{v.bedrijf}</h3>
              {v.leerweg && <span className="tag">{v.leerweg}{v.niveau ? " · niveau " + v.niveau : ""}</span>}
            </div>
            <div className="badges">
              {typeof v.afstand_km === "number" && <span className="tag">± {Math.round(v.afstand_km)} km van huis{v.reistijd ? " · " + v.reistijd : ""}</span>}
              {v.erkend === true && <span className="tag ok">Erkend leerbedrijf</span>}
              {v.erkend === false && <span className="tag warn">Erkenning niet gevonden; controleer dit bij je school</span>}
              {v.bron && <span className="tag src">Bron: {v.bron}</span>}
            </div>
            <div className="meta">{[v.functie, v.plaats, v.vergoeding, v.start && "Start: " + v.start].filter(Boolean).map((x) => <span key={x}>{x}</span>)}</div>
            <div className="meta">{[v.contact, v.email, v.tel].filter(Boolean).map((x) => <span key={x}>{x}</span>)}</div>
            {v.waarom && <p className="why">{v.waarom}</p>}
            <div className="actions">
              {v.email && <button className="btn small" type="button" onClick={() => openComposer({ soort: "new", vacature: v })}>Sollicitatiemail laten opstellen</button>}
              <button className={"btn small" + (v.email ? " ghost" : "")} type="button" onClick={() => zetInLijst(v)}>+ Toevoegen aan overzicht</button>
              <button className="btn ghost small" type="button" onClick={() => verberg(v)}>Niet relevant</button>
              {safeUrl(v.link) && <a href={safeUrl(v.link)} target="_blank" rel="noopener noreferrer">Bekijk {v.bron ? "op " + v.bron : "vacature"}</a>}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
