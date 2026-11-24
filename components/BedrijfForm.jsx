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
      toast(String(res.error.message).includes("LIMIET_BEDRIJVEN") ? "Met het gratis abonnement kun je maximaal 3 bedrijven vastleggen. Kies Pro of Premium voor onbeperkt bedrijven." : "Het opslaan is niet gelukt. Probeer het opnieuw.");
      return;
    }
    toast(bedrijf ? "De gegevens zijn bijgewerkt" : "Het bedrijf is toegevoegd aan je overzicht");
    await loadBedrijven();
    onKlaar();
  }

  return (
    <section className="view">
      <div>
        <h1>{bedrijf ? "Bedrijf bewerken" : "Bedrijf toevoegen"}</h1>
        <p className="sub">Vul de gegevens in die bij je bekend zijn. Alleen de bedrijfsnaam is verplicht.</p>
      </div>
      {vol && (
        <div className="upgrade">
          <span>Met het gratis abonnement kun je maximaal {plan.maxBedrijven} bedrijven vastleggen. Met Pro of Premium is dit onbeperkt.</span>
          <button className="btn small" type="button" onClick={() => go("profiel")}>Bekijk abonnementen</button>
        </div>
      )}
      <form onSubmit={opslaan}>
        <fieldset>
          <legend>1. Bedrijfsgegevens</legend>
          <div className="grid2">
            <label className="q"><span>Bedrijfsnaam</span><input value={f.naam} onChange={set("naam")} required placeholder="Bijv. Bedrijfsnaam B.V." /></label>
            <label className="q"><span>Vestigingsplaats <em>(plaats of adres)</em></span><input value={f.plaats} onChange={set("plaats")} placeholder="Plaats of adres" /></label>
          </div>
          <label className="q"><span>Vacature of website <em>(optioneel)</em></span><input value={f.link} onChange={set("link")} type="url" placeholder="https://…" /></label>
        </fieldset>
        <fieldset>
          <legend>2. Contactgegevens</legend>
          <label className="q"><span>Contactpersoon</span><input value={f.contact} onChange={set("contact")} placeholder="Naam contactpersoon" /></label>
          <div className="grid2">
            <label className="q"><span>E-mailadres</span><input value={f.email} onChange={set("email")} type="email" placeholder="naam@bedrijf.nl" /></label>
            <label className="q"><span>Telefoonnummer</span><input value={f.tel} onChange={set("tel")} type="tel" placeholder="076 …" /></label>
          </div>
        </fieldset>
        <fieldset>
          <legend>3. Huidige status</legend>
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
          <legend>4. Planning en aantekeningen</legend>
          <div className="grid2">
            <label className="q"><span>Datum laatste contact</span><input value={f.datum || ""} onChange={set("datum")} type="date" /></label>
            <label className="q"><span>Opvolgen op</span><input value={f.opvolg || ""} onChange={set("opvolg")} type="date" /></label>
          </div>
          <label className="q"><span>Aantekeningen</span><textarea value={f.notes || ""} onChange={set("notes")} placeholder="Bijv. telefonisch contact met de receptie; verzoek om een mail te sturen naar de afdeling HR." /></label>
        </fieldset>
        <div className="actions">
          <button className="btn" type="submit" disabled={bezig || vol}>{bezig ? "Bezig met opslaan…" : bedrijf ? "Wijzigingen opslaan" : "Bedrijf opslaan"}</button>
          <button className="btn ghost" type="button" onClick={onKlaar}>Annuleren</button>
        </div>
      </form>
    </section>
  );
}
