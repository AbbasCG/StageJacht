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
      toast(aantal ? `${aantal} nieuwe stageplek${aantal > 1 ? "ken" : ""} gevonden` : "Geen nieuwe stageplekken gevonden");
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
    if (error) { toast(String(error.message).includes("LIMIET_BEDRIJVEN") ? "Je lijst is vol (Gratis: 5 bedrijven). Upgrade voor meer." : "Toevoegen lukte niet"); return; }
    await dbc.from("vacatures").update({ toegevoegd: true }).eq("id", v.id).eq("user_id", user.id);
    toast("Toegevoegd aan je lijst");
    loadVacatures(); loadBedrijven();
  }

  return (
    <section className="view">
      <div>
        <h1>Vacatures voor jou</h1>
        <p className="sub">Stageplekken van Stagemarkt en de rest van internet die passen bij je opleiding, niveau en leerweg, binnen {p.maxafstand || 15} km van huis.</p>
      </div>
      <div className="box">
        <div className="checkbar">
          <p className="note">
            {p.woonplaats
              ? `Zoek zelf op Stagemarkt: niveau ${p.niveau || "?"}, ${p.leerweg || "BOL"}, rond ${p.woonplaats}.` + (p.crebocode ? "" : " Vul je crebocode in bij Profiel voor betere resultaten.")
              : "Vul je woonplaats in bij Profiel, dan zoekt de link in jouw buurt."}
          </p>
          <a className="btn small ghost" href={stagemarktUrl(p)} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none" }}>Open Stagemarkt</a>
          {plan.vacatures
            ? <button className="btn small" type="button" onClick={zoekNu} disabled={bezig}>{bezig ? "Zoeken…" : "Zoek nu"}</button>
            : <button className="btn small" type="button" onClick={() => go("profiel")}>Automatisch zoeken (Pro)</button>}
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
              ? `Nog geen nieuwe vacatures. De assistent zoekt ${plan.vacatures} op Stagemarkt naar plekken die bij jou passen.`
              : "Met Pro of Premium zoekt de assistent automatisch passende stageplekken voor je."}
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
              {v.erkend === false && <span className="tag warn">Niet als leerbedrijf gevonden, check bij school</span>}
              {v.bron && <span className="tag src">Bron: {v.bron}</span>}
            </div>
            <div className="meta">{[v.functie, v.plaats, v.vergoeding, v.start && "Start: " + v.start].filter(Boolean).map((x) => <span key={x}>{x}</span>)}</div>
            <div className="meta">{[v.contact, v.email, v.tel].filter(Boolean).map((x) => <span key={x}>{x}</span>)}</div>
            {v.waarom && <p className="why">{v.waarom}</p>}
            <div className="actions">
              {v.email && <button className="btn small" type="button" onClick={() => openComposer({ soort: "new", vacature: v })}>Sollicitatiemail laten schrijven</button>}
              <button className="btn ghost small" type="button" onClick={() => zetInLijst(v)}>Zet in mijn lijst</button>
              <button className="btn ghost small" type="button" onClick={() => verberg(v)}>Niet interessant</button>
              {safeUrl(v.link) && <a href={safeUrl(v.link)} target="_blank" rel="noopener noreferrer">Bekijk {v.bron ? "op " + v.bron : "vacature"}</a>}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
