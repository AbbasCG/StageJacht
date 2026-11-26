// Abonnementen. Pas prijzen en limieten hier aan; de website en de server lezen dit bestand.
export const PLANS = {
  free: {
    id: "free",
    naam: "Gratis",
    prijs: 0,
    prijsTekst: "€0",
    maxBedrijven: 3,
    aiPerMaand: 2,
    mailcheck: false,          // automatische reactie-check
    mailcheckHandmatig: false, // knop "Check mijn mail"
    vacatures: false,          // automatisch vacatures zoeken
    voordelen: [
      "3 bedrijven bijhouden",
      "2 AI-acties per maand (mail schrijven, cv-advies of nakijken)",
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

// Beheerdersaccount (zie ADMIN_EMAILS): alles aan, geen limieten. Staat bewust niet in PLANS,
// zodat het niet als abonnement te kiezen of te betalen is.
export const ADMIN_PLAN = {
  id: "admin",
  naam: "Beheerder",
  prijs: 0,
  prijsTekst: "€0",
  maxBedrijven: Infinity,
  aiPerMaand: 1000000,
  mailcheck: true,
  mailcheckHandmatig: true,
  vacatures: "dagelijks",
  voordelen: ["Alle functies", "Geen limieten", "Geen betaling nodig"],
};

// Is dit e-mailadres een beheerder? Leest ADMIN_EMAILS (komma-gescheiden) uit de omgeving. Alleen op de server.
export function isAdminEmail(email) {
  const lijst = String(process.env.ADMIN_EMAILS || "").split(",").map((x) => x.trim().toLowerCase()).filter(Boolean);
  return !!email && lijst.includes(String(email).trim().toLowerCase());
}

// Het abonnement dat nu geldt: een betaald plan telt alleen zolang plan_tot in de toekomst ligt.
export function effectivePlan(profile) {
  if (!profile) return PLANS.free;
  if (profile.is_admin === true) return ADMIN_PLAN;
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
