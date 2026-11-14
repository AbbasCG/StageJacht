import { metGebruiker, ok, fout, profielVan } from "@/lib/api";
import { effectivePlan } from "@/lib/plans";
import { checkMailVoor } from "@/lib/mailcheck";

export const maxDuration = 60;

export const POST = metGebruiker(async (_req, { user }) => {
  const profiel = await profielVan(user.id);
  const plan = effectivePlan(profiel);
  if (!plan.mailcheckHandmatig) return fout("Mail checken op reacties zit in Pro en Premium.", 402, { code: "upgrade" });
  if (!profiel.gmail_verbonden) return fout("Verbind eerst je Gmail.", 409, { code: "not_connected" });
  if (profiel.laatste_mailcheck && Date.now() - new Date(profiel.laatste_mailcheck).getTime() < 2 * 60 * 1000) {
    return fout("Je hebt net al gecheckt. Probeer het over een paar minuten opnieuw.", 429);
  }
  const nieuw = await checkMailVoor(user.id);
  return ok({ nieuw });
});
