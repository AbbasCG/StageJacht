"use client";
import { useEffect, useState } from "react";
import { STATUSES, today } from "@/lib/ui";

const LEEG = { naam: "", plaats: "", link: "", contact: "", email: "", tel: "", status: "wait", datum: "", opvolg: "", notes: "" };

export default function BedrijfForm({ dbc, bedrijf, toast, go, onKlaar, loadBedrijven, plan, bedrijven }) {
  const [f, setF] = useState({ ...LEEG, datum: today() });
  const [bezig, setBezig] = useState(false);
  useEffect(() => {
    setF(bedrijf ? Object.fromEntries(Object.keys(LEEG).map((k) => [k, bedrijf[k] ?? ""])) : { ...LEEG, datum: today() });
  }, [bedrijf]);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const vol = !bedrijf && plan.maxBedrijven !== Infinity && bedrijven.length >= plan.maxBedrijven;

  async function opslaan(e) {
    e.preventDefault();
    setBezig(true);
    const data = Object.fromEntries(Object.entries(f).map(([k, v]) => [k, typeof v === "string" ? v.trim() || null : v]));
    data.naam = f.naam.trim();
    data.status = f.status || "todo";
    data.updated_at = new Date().toISOString();
    const res = bedrijf
      ? await dbc.from("bedrijven").update(data).eq("id", bedrijf.id)
      : await dbc.from("bedrijven").insert(data);
    setBezig(false);
    if (res.error) {
      toast(String(res.error.message).includes("LIMIET_BEDRIJVEN") ? "Met Gratis kun je 5 bedrijven bijhouden. Upgrade voor meer." : "Opslaan lukte niet");
      return;
    }
    toast(bedrijf ? "Bijgewerkt" : "Toegevoegd");
    await loadBedrijven();
    onKlaar();
  }

  return (
    <section className="view">
      <div>
        <h1>{bedrijf ? "Bedrijf bewerken" : "Bedrijf toevoegen"}</h1>
        <p className="sub">Vul in wat je weet. Alleen de naam is verplicht.</p>
      </div>
      {vol && (
        <div className="upgrade">
          <span>Met Gratis kun je {plan.maxBedrijven} bedrijven bijhouden. Met Pro of Premium onbeperkt.</span>
          <button className="btn small" type="button" onClick={() => go("profiel")}>Bekijk abonnementen</button>
        </div>
      )}
      <form onSubmit={opslaan}>
        <fieldset>
          <legend>1. Over het bedrijf</legend>
          <div className="grid2">
            <label className="q"><span>Hoe heet het bedrijf?</span><input value={f.naam} onChange={set("naam")} required placeholder="Bijv. Bedrijfsnaam B.V." /></label>
            <label className="q"><span>Waar zit het? <em>(plaats of adres)</em></span><input value={f.plaats} onChange={set("plaats")} placeholder="Plaats of adres" /></label>
          </div>
          <label className="q"><span>Link naar de vacature of website <em>(optioneel)</em></span><input value={f.link} onChange={set("link")} type="url" placeholder="https://…" /></label>
        </fieldset>
        <fieldset>
          <legend>2. Contact</legend>
          <label className="q"><span>Met wie heb je contact?</span><input value={f.contact} onChange={set("contact")} placeholder="Naam contactpersoon" /></label>
          <div className="grid2">
            <label className="q"><span>E-mailadres</span><input value={f.email} onChange={set("email")} type="email" placeholder="naam@bedrijf.nl" /></label>
            <label className="q"><span>Telefoonnummer</span><input value={f.tel} onChange={set("tel")} type="tel" placeholder="076 …" /></label>
          </div>
        </fieldset>
        <fieldset>
          <legend>3. Hebben ze iets voor je?</legend>
          <div className="options" role="radiogroup" aria-label="Status">
            {STATUSES.map((s) => (
              <label key={s.key} className="opt" style={{ "--c": s.c }}>
                <input type="radio" name="status" value={s.key} checked={f.status === s.key} onChange={set("status")} />
                <span>{s.label}</span>
              </label>
            ))}
          </div>
        </fieldset>
        <fieldset>
          <legend>4. Planning en notities</legend>
          <div className="grid2">
            <label className="q"><span>Wanneer had je contact?</span><input value={f.datum || ""} onChange={set("datum")} type="date" /></label>
            <label className="q"><span>Wanneer moet je opvolgen?</span><input value={f.opvolg || ""} onChange={set("opvolg")} type="date" /></label>
          </div>
          <label className="q"><span>Wat is er besproken?</span><textarea value={f.notes || ""} onChange={set("notes")} placeholder="Bijv. gebeld met de receptie, ze zeiden: mail sturen naar HR." /></label>
        </fieldset>
        <div className="actions">
          <button className="btn" type="submit" disabled={bezig || vol}>{bezig ? "Bezig…" : "Opslaan"}</button>
          <button className="btn ghost" type="button" onClick={onKlaar}>Annuleren</button>
        </div>
      </form>
    </section>
  );
}
