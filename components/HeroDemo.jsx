"use client";
import { useState } from "react";

/* Speelbare voorbeeld van het overzicht. Alle namen zijn verzonnen. */
const BEDRIJVEN = [
  { naam: "Brandsma Automatisering", plaats: "Breda", groep: "wacht", status: "Gemaild", dag: "gisteren" },
  { naam: "Kloosterman ICT", plaats: "Tilburg", groep: "wacht", status: "Wacht op antwoord", dag: "3 dagen geleden" },
  { naam: "Vervoort Systemen", plaats: "Oosterhout", groep: "bellen", status: "Nog bellen", dag: "vandaag opvolgen" },
  { naam: "NetwerkWerf", plaats: "Etten-Leur", groep: "bellen", status: "Nog benaderen", dag: "" },
  { naam: "Dijkstra Cloud", plaats: "Breda", groep: "gesprek", status: "Gesprek gepland", dag: "dinsdag 10:00" },
  { naam: "Meulenbelt Beheer", plaats: "Roosendaal", groep: "nee", status: "Geen stageplek", dag: "dit jaar vol" },
];
const TEGELS = [
  { g: "wacht", label: "Wacht op antwoord", c: "var(--s-wait)" },
  { g: "bellen", label: "Nog bellen", c: "var(--s-bellen)" },
  { g: "gesprek", label: "Gesprek", c: "var(--s-yes)" },
  { g: "nee", label: "Geen plek", c: "var(--s-no)" },
];

export default function HeroDemo() {
  const [g, setG] = useState("wacht");
  const lijst = BEDRIJVEN.filter((b) => b.groep === g);
  const tegel = TEGELS.find((t) => t.g === g);
  return (
    <div className="demo" aria-label="Voorbeeld van het overzicht">
      <div className="demo-top"><span className="demo-dot" /><span className="demo-dot" /><span className="demo-dot" /><span className="demo-title">Overzicht stagezoektocht</span></div>
      <div className="demo-tiles" role="group" aria-label="Kies een groep">
        {TEGELS.map((t) => {
          const v = BEDRIJVEN.filter((b) => b.groep === t.g).length;
          return (
            <button key={t.g} type="button" className="demo-tile" style={{ "--c": t.c }} aria-pressed={g === t.g} onClick={() => setG(t.g)}>
              <b>{v}</b><span>{t.label}</span>
            </button>
          );
        })}
      </div>
      <ul className="demo-list" aria-live="polite">
        {lijst.map((b) => (
          <li key={b.naam}>
            <div><span className="demo-name">{b.naam}</span><small>{b.plaats}</small></div>
            <div className="demo-meta"><span className="demo-pill" style={{ "--c": tegel.c }}>{b.status}</span>{b.dag && <small>{b.dag}</small>}</div>
          </li>
        ))}
      </ul>
      <p className="demo-note">Voorbeeld met fictieve bedrijven. Selecteer een tegel om te filteren.</p>
    </div>
  );
}
