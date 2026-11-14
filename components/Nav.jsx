"use client";

const Icon = ({ d }) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">{d}</svg>
);

const ITEMS = [
  { id: "overzicht", label: "Overzicht", icon: <><path d="M3 11.5 12 4l9 7.5" /><path d="M5.5 10v9.5h13V10" /></> },
  { id: "bedrijven", label: "Bedrijven", icon: <><rect x="4" y="3.5" width="16" height="17" rx="2" /><path d="M8 8h8M8 12h8M8 16h5" /></> },
  { id: "vacatures", label: "Vacatures", icon: <><circle cx="11" cy="11" r="6.5" /><path d="m20 20-4.2-4.2" /></> },
  { id: "cv", label: "Mijn cv", icon: <><path d="M14 3.5H7a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8.5z" /><path d="M14 3.5v5h5" /><circle cx="12" cy="12.5" r="1.8" /><path d="M8.8 17.2c.6-1.4 1.8-2.1 3.2-2.1s2.6.7 3.2 2.1" /></> },
  { id: "toevoegen", label: "Nieuw", icon: <><circle cx="12" cy="12" r="8.5" /><path d="M12 8v8M8 12h8" /></> },
  { id: "profiel", label: "Profiel", icon: <><circle cx="12" cy="8" r="3.6" /><path d="M5 20c.9-3.6 3.7-5.5 7-5.5s6.1 1.9 7 5.5" /></> },
];

export default function Nav({ view, aantalBedrijven, aantalVacatures }) {
  return (
    <nav aria-label="Menu">
      {ITEMS.map((it) => (
        <a key={it.id} href={"#" + it.id} aria-current={view === it.id ? "page" : undefined}>
          <Icon d={it.icon} />
          <span className="lbl">{it.label}</span>
          {it.id === "bedrijven" && <span className="n">{aantalBedrijven}</span>}
          {it.id === "vacatures" && aantalVacatures > 0 && <span className="n">{aantalVacatures}</span>}
        </a>
      ))}
    </nav>
  );
}
