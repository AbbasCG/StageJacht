import { metGebruiker, ok, fout, profielVan } from "@/lib/api";
import { db } from "@/lib/db";
import { mollie } from "@/lib/mollie";

// Opzeggen: er wordt niets meer afgeschreven. Je houdt je abonnement tot het einde van de betaalde maand.
export const POST = metGebruiker(async (_req, { user }) => {
  const profiel = await profielVan(user.id);
  if (!profiel.mollie_subscription_id) return fout("Je hebt geen lopend abonnement.");
  try {
    await mollie().customerSubscriptions.cancel(profiel.mollie_subscription_id, { customerId: profiel.mollie_customer_id });
  } catch (e) {
    console.error("opzeggen", e?.message);
  }
  await db().from("profiles").update({ mollie_subscription_id: null }).eq("id", user.id);
  return ok({ tot: profiel.plan_tot });
});
