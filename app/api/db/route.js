import { NextResponse } from "next/server";
import { currentUser } from "@/lib/session";
import { db } from "@/lib/db";
import { teVaak, herkomstOk } from "@/lib/beveilig";

/* De enige weg waarlangs de browser bij de database komt. De server bepaalt wie je bent (uit je sessie-cookie)
   en dwingt zelf af dat je alleen je eigen rijen ziet en wijzigt. Wat de browser aan filters meestuurt,
   komt er alleen bovenop. Zo werkt dit net als de Row Level Security eerder. */

const PROFIEL_KOLOMMEN = ["naam", "opleiding", "school", "niveau", "leerweg", "woonplaats", "crebocode", "telefoon", "email",
  "beschikbaar", "overmij", "sterk", "ervaring", "stijl", "maxafstand", "cvinfo", "cv", "cv_advies", "onboarding_klaar"];
const BEDRIJF_KOLOMMEN = ["naam", "plaats", "link", "contact", "email", "tel", "status", "datum", "opvolg", "notes", "zoekt",
  "reactie_msgid", "reactie_threadid", "reactie_datum", "reactie_soort", "reactie_samenvatting", "advies", "updated_at"];

const REGELS = {
  profiles: { eigenaar: "id", select: true, update: PROFIEL_KOLOMMEN },
  bedrijven: { eigenaar: "user_id", select: true, insert: BEDRIJF_KOLOMMEN, update: BEDRIJF_KOLOMMEN, delete: true },
  vacatures: { eigenaar: "user_id", select: true, update: ["verborgen", "toegevoegd"] },
  usage: { eigenaar: "user_id", select: true },
};

const IDENT = /^[a-z_][a-z0-9_]*$/i;
const nee = (bericht, status = 403) => NextResponse.json({ data: null, error: { message: bericht } }, { status });

export async function POST(request) {
  if (!herkomstOk(request)) return nee("Verzoek geweigerd.", 403);
  const user = await currentUser();
  if (!user) return nee("Je bent niet ingelogd.", 401);

  if (teVaak("db:" + user.id, 300, 60e3)) return nee("Even rustig aan. Probeer het zo opnieuw.", 429);

  let b;
  try {
    const tekst = await request.text();
    if (tekst.length > 300_000) return nee("Te groot", 413);
    b = JSON.parse(tekst);
  } catch { return nee("Ongeldig verzoek", 400); }
  if (!b || typeof b !== "object" || Array.isArray(b)) return nee("Ongeldig verzoek", 400);
  const regel = REGELS[b?.tabel];
  if (!regel) return nee("Onbekende tabel", 400);
  const op = b.op;
  if (!["select", "insert", "update", "delete"].includes(op) || !regel[op]) return nee("Niet toegestaan");

  const schoon = (waarden, toegestaan) => {
    if (!waarden || typeof waarden !== "object" || Array.isArray(waarden)) throw new Error("Ongeldige gegevens");
    const uit = {};
    for (const [k, v] of Object.entries(waarden)) {
      if (!toegestaan.includes(k)) throw new Error(`Veld niet toegestaan: ${k}`);
      if (typeof v === "string" && v.length > 20000) throw new Error("Tekst te lang");
      if (v !== null && typeof v === "object" && JSON.stringify(v).length > 100_000) throw new Error("Gegevens te groot");
      uit[k] = v;
    }
    return uit;
  };

  try {
    let q = db().from(b.tabel);
    if (op === "select") {
      const kolommen = String(b.kolommen || "*");
      if (kolommen !== "*" && !kolommen.split(",").every((k) => IDENT.test(k.trim()))) return nee("Ongeldige kolommen", 400);
      q = q.select(kolommen);
    } else if (op === "insert") {
      q = q.insert({ ...schoon(b.waarden, regel.insert), [regel.eigenaar]: user.id });
    } else if (op === "update") {
      q = q.update(schoon(b.waarden, regel.update));
    } else {
      q = q.delete();
    }

    if (Array.isArray(b.filters) && b.filters.length > 6) return nee("Te veel filters", 400);
    for (const f of Array.isArray(b.filters) ? b.filters : []) {
      const [soort, kolom, waarde] = f || [];
      if (!["eq", "neq"].includes(soort) || !IDENT.test(String(kolom))) return nee("Ongeldig filter", 400);
      if (waarde !== null && typeof waarde === "object") return nee("Ongeldig filter", 400);
      if (typeof waarde === "string" && waarde.length > 500) return nee("Ongeldig filter", 400);
      q = q[soort](kolom, waarde);
    }
    if (op !== "insert") q = q.eq(regel.eigenaar, user.id); // altijd alleen je eigen rijen
    for (const [kolom, oplopend] of Array.isArray(b.sortering) ? b.sortering : []) {
      if (!IDENT.test(String(kolom))) return nee("Ongeldige sortering", 400);
      q = q.order(kolom, { ascending: oplopend !== false });
    }
    if (b.een === "single") q = q.single();
    if (b.een === "maybeSingle") q = q.maybeSingle();

    const res = await q;
    if (res.error) {
      // Databasefouten vertellen een aanvaller veel; de browser krijgt alleen wat hij nodig heeft
      const limiet = String(res.error.message).includes("LIMIET_BEDRIJVEN");
      if (!limiet) console.error("db", b.tabel, op, res.error.code, res.error.message);
      return NextResponse.json({ data: null, error: { message: limiet ? "LIMIET_BEDRIJVEN" : "Opslaan lukte niet" } });
    }
    return NextResponse.json(res);
  } catch (e) {
    return nee(/niet toegestaan|te lang|te groot|Ongeldig/.test(e.message) ? e.message : "Er ging iets mis", 400);
  }
}
