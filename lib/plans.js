// Abonnementen. Pas prijzen en limieten hier aan; de website en de server lezen dit bestand.
export const PLANS = {
  free: {
    id: "free",
    naam: "Gratis",
    prijs: 0,
    prijsTekst: "€0",
    maxBedrijven: 5,
    aiPerMaand: 3,
    mailcheck: false,          // automatische reactie-check
    mailcheckHandmatig: false, // knop "Check mijn mail"
    vacatures: false,          // automatisch vacatures zoeken
    voordelen: [
      "5 bedrijven bijhouden",
      "3 AI-acties per maand (mail schrijven, cv-advies)",
      "Cv-editor en PDF-download",
      "Mails versturen via je eigen Gmail",
    ],
  },
  pro: {
    id: "pro",
    naam: "Pro",
    prijs: 3.99,
    prijsTekst: "€3,99",
    maxBedrijven: Infinity,
    aiPerMaand: 40,
    mailcheck: true,
    mailcheckHandmatig: true,
    vacatures: "wekelijks",
    voordelen: [
      "Onbeperkt bedrijven",
      "40 AI-acties per maand",
      "Elke dag automatisch je Gmail checken op reacties, met advies",
      "Elke week passende vacatures van Stagemarkt",
    ],
  },
  premium: {
    id: "premium",
    naam: "Premium",
    prijs: 7.99,
    prijsTekst: "€7,99",
    maxBedrijven: Infinity,
    aiPerMaand: 200, // eerlijk gebruik
    mailcheck: true,
    mailcheckHandmatig: true,
    vacatures: "dagelijks",
    voordelen: [
      "Alles van Pro",
      "200 AI-acties per maand",
      "Elke dag nieuwe vacatures van Stagemarkt",
      "Onbeperkt cv-advies en mails laten nakijken",
    ],
  },
};

// Het abonnement dat nu geldt: een betaald plan telt alleen zolang plan_tot in de toekomst ligt.
export function effectivePlan(profile) {
  if (!profile) return PLANS.free;
  const p = PLANS[profile.plan] || PLANS.free;
  if (p.id === "free") return p;
  if (!profile.plan_tot || new Date(profile.plan_tot) < new Date()) return PLANS.free;
  return p;
}

export function huidigeMaand() {
  return new Date().toISOString().slice(0, 7);
}

export function euro(bedrag) {
  return bedrag.toFixed(2); // Mollie verwacht "3.99"
}
