import { metGebruiker, ok, fout, profielVan } from "@/lib/api";
import { effectivePlan } from "@/lib/plans";
import { zoekVacaturesVoor } from "@/lib/vacatures";

export const maxDuration = 60;

// Handmatig zoeken (Pro en Premium), maximaal één keer per uur
export const POST = metGebruiker(async (_req, { user }) => {
  const profiel = await profielVan(user.id);
  const plan = effectivePlan(profiel);
  if (!plan.vacatures) return fout("Automatisch vacatures zoeken zit in Pro en Premium.", 402, { code: "upgrade" });
  if (!profiel.woonplaats) return fout("Vul eerst je woonplaats (en liefst je crebocode) in bij Profiel.");
  if (profiel.laatste_vacaturecheck && Date.now() - new Date(profiel.laatste_vacaturecheck).getTime() < 60 * 60 * 1000) {
    return fout("Je hebt het afgelopen uur al gezocht. Probeer het later opnieuw.", 429);
  }
  const aantal = await zoekVacaturesVoor(user.id, profiel);
  return ok({ aantal });
});
