import { metGebruiker, ok, fout, profielVan } from "@/lib/api";
import { aiJson, promptNakijken, verbruikAi, metGegevens } from "@/lib/ai";

export const maxDuration = 60;

export const POST = metGebruiker(async (req, { user }) => {
  const { naar, onderwerp, tekst, bedrijfNaam, contact, gegevens } = await req.json();
  if (!tekst || tekst.length < 20) return fout("Je mail is nog leeg.");
  const verbruik = await verbruikAi(user.id);
  if (!verbruik.ok) return fout(verbruik.fout, 402, { code: "limiet" });
  const profiel = metGegevens(await profielVan(user.id), gegevens);
  const out = await aiJson(promptNakijken({ profiel, naar, onderwerp, tekst: String(tekst).slice(0, 6000), bedrijfNaam, contact }));
  const fixes = (Array.isArray(out.verbeteringen) ? out.verbeteringen : [])
    .filter((f) => f && f.van && f.naar && f.van !== f.naar && String(tekst).includes(f.van))
    .slice(0, 15).map((f) => ({ van: String(f.van), naar: String(f.naar), waarom: String(f.waarom || "") }));
  const opmerkingen = (Array.isArray(out.opmerkingen) ? out.opmerkingen : []).map(String).filter(Boolean).slice(0, 8);
  return ok({ verbeteringen: fixes, opmerkingen });
});
