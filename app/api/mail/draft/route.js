import { metGebruiker, ok, fout, profielVan } from "@/lib/api";
import { db } from "@/lib/db";
import { aiJson, promptMail, promptRedactie, verbruikAi, metGegevens, handtekening } from "@/lib/ai";

export const maxDuration = 60;

export const POST = metGebruiker(async (req, { user }) => {
  const { soort, bedrijfId, vacatureId, cvMee, gegevens, toevoegingen, zoekt } = await req.json();
  const admin = db();
  let bedrijf = null, vacature = null;
  if (bedrijfId) ({ data: bedrijf } = await admin.from("bedrijven").select("*").eq("id", bedrijfId).eq("user_id", user.id).maybeSingle());
  if (vacatureId) ({ data: vacature } = await admin.from("vacatures").select("*").eq("id", vacatureId).eq("user_id", user.id).maybeSingle());
  if (!bedrijf && !vacature) return fout("Bedrijf niet gevonden.", 404);

  // Aangepast onderzoek ("Wat zoekt dit bedrijf?") bewaren bij het bedrijf of de vacature
  if (typeof zoekt === "string") {
    const z = zoekt.slice(0, 2000);
    if (vacature) { await admin.from("vacatures").update({ zoekt: z }).eq("id", vacature.id).eq("user_id", user.id); vacature.zoekt = z; }
    else if (bedrijf) { await admin.from("bedrijven").update({ zoekt: z }).eq("id", bedrijf.id).eq("user_id", user.id); bedrijf.zoekt = z; }
  }
  const verbruik = await verbruikAi(user.id);
  if (!verbruik.ok) return fout(verbruik.fout, 402, { code: "limiet" });

  const opgeslagen = await profielVan(user.id);
  const profiel = metGegevens(opgeslagen, gegevens);
  const out = await aiJson(promptMail({ profiel, soort, bedrijf, vacature, cvMee: !!cvMee && !!opgeslagen.cv_bestand, toevoegingen: Array.isArray(toevoegingen) ? toevoegingen.map(String).slice(0, 10) : [] }));
  let tekst = String(out.tekst || "").trim();
  try {
    const doel = vacature || bedrijf || {};
    const beter = await aiJson(promptRedactie({ profiel, tekst, zoekt: doel.zoekt, toevoegingen: Array.isArray(toevoegingen) ? toevoegingen : [], aanhef: doel.contact ? `Beste ${doel.contact},` : "" }));
    if (beter?.tekst && String(beter.tekst).trim().length > 200) tekst = String(beter.tekst).trim();
  } catch {}
  const sig = handtekening(profiel);
  if (sig.split("\n").some((l) => l && !tekst.includes(l))) {
    tekst = tekst.replace(/\n*(Met vriendelijke groet|Vriendelijke groet|Groetjes)[\s\S]*$/i, "").trimEnd() + "\n\nMet vriendelijke groet,\n" + sig;
  }
  return ok({ onderwerp: String(out.onderwerp || ""), tekst });
});
