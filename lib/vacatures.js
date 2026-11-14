import { db } from "@/lib/db";
import { zoek, details } from "@/lib/stagemarkt";
import { aiText, studentTekst } from "@/lib/ai";
import { afstandTussen, reistijd } from "@/lib/afstand";
import { webzoekenAan, zoekStagesOpInternet, isErkend } from "@/lib/webzoek";

const norm = (s) => String(s || "").toLowerCase().replace(/\b(b\.?v\.?|holding|hk)\b/g, "").replace(/[^a-z0-9]/g, "");
const slug = (s) => norm(s).slice(0, 40) || Math.random().toString(36).slice(2, 10);

// Zoekt nieuwe passende stageplekken voor één gebruiker (Stagemarkt + rest van internet),
// alleen binnen de maximale afstand van zijn woonplaats. Geeft het aantal nieuwe.
export async function zoekVacaturesVoor(userId, profiel, { max = 6, deadline = Date.now() + 50000 } = {}) {
  if (!profiel.woonplaats) return 0;
  const maxAfstand = Number(profiel.maxafstand || 15);
  const admin = db();
  const [{ data: bestaand }, { data: bedrijven }] = await Promise.all([
    admin.from("vacatures").select("id, bedrijf").eq("user_id", userId),
    admin.from("bedrijven").select("naam").eq("user_id", userId),
  ]);
  const bekendeIds = new Set((bestaand || []).map((v) => v.id));
  const bekendeNamen = new Set([...(bedrijven || []).map((b) => norm(b.naam)), ...(bestaand || []).map((v) => norm(v.bedrijf))]);

  const nieuw = [];
  const bewaar = async (rij) => {
    if (bekendeNamen.has(norm(rij.bedrijf))) return;
    if (rij.leerweg && profiel.leerweg && rij.leerweg !== profiel.leerweg) return;
    if (rij.niveau && profiel.niveau && String(rij.niveau) !== String(profiel.niveau)) return;
    const afstand = rij.plaats ? await afstandTussen(profiel.woonplaats, rij.plaats) : null;
    if (afstand != null && afstand > maxAfstand) return;
    bekendeNamen.add(norm(rij.bedrijf));
    nieuw.push({ ...rij, afstand_km: afstand, reistijd: reistijd(afstand) });
  };

  // 1) Stagemarkt (alleen erkende leerbedrijven)
  try {
    const resultaten = await zoek(profiel, Math.max(5, Math.min(maxAfstand, 50)));
    for (const k of resultaten.filter((r) => !bekendeIds.has("sm-" + r.id.slice(0, 8)))) {
      if (nieuw.length >= max || Date.now() > deadline) break;
      await new Promise((r) => setTimeout(r, 700)); // netjes langzaam
      let d;
      try { d = await details(k.link); } catch { continue; }
      if (!d.bedrijf) continue;
      await bewaar({
        id: "sm-" + k.id.slice(0, 8), bedrijf: d.bedrijf, functie: d.titel, plaats: d.plaats, contact: d.contact, email: d.email, tel: d.tel,
        leerweg: d.leerweg, niveau: d.niveau, start: d.start, vergoeding: d.vergoeding, waarom: d.omschrijving,
        zoekt: d.omschrijving, link: k.link, bron: "Stagemarkt", erkend: true, soort: "vacature",
      });
    }
  } catch (e) {
    console.error("stagemarkt", e?.message);
  }

  // 2) De rest van internet (vacaturesites, stagebanken, bedrijfswebsites)
  if (webzoekenAan() && nieuw.length < max && Date.now() < deadline) {
    try {
      const web = await zoekStagesOpInternet(profiel, { max: max - nieuw.length + 2, deadline });
      for (const w of web) {
        if (nieuw.length >= max || Date.now() > deadline) break;
        if (bekendeIds.has("web-" + slug(w.bedrijf))) continue;
        await bewaar({
          id: "web-" + slug(w.bedrijf), bedrijf: w.bedrijf, functie: w.functie, plaats: w.adres, contact: w.contact, email: w.email, tel: w.tel,
          leerweg: w.leerweg, niveau: w.niveau, start: w.start, vergoeding: w.vergoeding, waarom: w.waarom,
          link: w.link, bron: w.bron, erkend: await isErkend(w.bedrijf), soort: "vacature",
        });
      }
    } catch (e) {
      console.error("webzoek", e?.message);
    }
  }

  // Korte uitleg per plek en opslaan
  for (const v of nieuw) {
    try {
      v.waarom = await aiText(
        `Schrijf in 1-2 korte zinnen waarom deze stageplek past bij deze student. Alleen feiten uit de tekst.\n\nStudent:\n${studentTekst(profiel)}\n\nStageplek bij ${v.bedrijf}: ${v.functie || ""}. ${v.waarom || ""}`,
        { fast: true, maxTokens: 200 }
      );
    } catch {}
    await admin.from("vacatures").upsert({
      user_id: userId, id: v.id, bedrijf: v.bedrijf, functie: v.functie, plaats: v.plaats, contact: v.contact, email: v.email, tel: v.tel,
      leerweg: v.leerweg, niveau: v.niveau, start: v.start, vergoeding: v.vergoeding, waarom: String(v.waarom || "").slice(0, 500), zoekt: String(v.zoekt || v.waarom || "").slice(0, 1500),
      link: v.link, bron: v.bron, afstand_km: v.afstand_km, reistijd: v.reistijd, erkend: v.erkend, soort: v.soort,
    });
  }
  await admin.from("profiles").update({ laatste_vacaturecheck: new Date().toISOString() }).eq("id", userId);
  return nieuw.length;
}
