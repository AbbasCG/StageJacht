import { metGebruiker, ok, fout, profielVan } from "@/lib/api";
import { db } from "@/lib/db";
import { aiJson, aiText, cvInfoTekst, promptCvAdvies, promptProfieltekst, verbruikAi } from "@/lib/ai";

export const maxDuration = 60;

// POST { soort: "advies" | "profieltekst" }
export const POST = metGebruiker(async (req, { user }) => {
  const { soort } = await req.json();
  const profiel = await profielVan(user.id);
  const cv = profiel.cv || {};
  if (!cvInfoTekst(cv)) return fout("Upload eerst je cv of vul de editor in.");

  const verbruik = await verbruikAi(user.id);
  if (!verbruik.ok) return fout(verbruik.fout, 402, { code: "limiet" });

  if (soort === "profieltekst") {
    const tekst = await aiText(promptProfieltekst(profiel, cv), { maxTokens: 500 });
    return ok({ tekst });
  }

  const out = await aiJson(promptCvAdvies(profiel, cv), { maxTokens: 1800 });
  const advies = {
    cijfer: Math.max(1, Math.min(10, Math.round(Number(out.cijfer) || 0))) || null,
    oordeel: String(out.oordeel || ""),
    sterk: (out.sterk || []).map(String).slice(0, 3),
    verbeteren: (out.verbeteren || []).slice(0, 5).map((x) => ({ punt: String(x.punt || ""), waarom: String(x.waarom || ""), voorbeeld: String(x.voorbeeld || "") })),
    ontbreekt: (out.ontbreekt || []).map(String).slice(0, 4),
    profiel_voorstel: String(out.profiel_voorstel || ""),
    datum: new Date().toISOString().slice(0, 10),
  };
  await db().from("profiles").update({ cv_advies: advies }).eq("id", user.id);
  return ok({ advies });
});
