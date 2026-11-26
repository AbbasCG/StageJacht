import { metGebruiker, ok, fout, profielVan } from "@/lib/api";
import { db } from "@/lib/db";
import { PLANS, effectivePlan, euro } from "@/lib/plans";
import { mollie, siteUrl, checkoutUrl } from "@/lib/mollie";

// Start een abonnement: eerste betaling via iDEAL e.d. Mollie bewaart daarna een machtiging
// voor de maandelijkse incasso. Het abonnement zelf wordt aangemaakt in de webhook.
export const POST = metGebruiker(async (req, { user }) => {
  const body = await req.json().catch(() => ({}));
  const planId = typeof body.plan === "string" ? body.plan : "";
  const plan = Object.prototype.hasOwnProperty.call(PLANS, planId) ? PLANS[planId] : null;
  if (!plan || plan.id === "free") return fout("Onbekend abonnement.");

  const profiel = await profielVan(user.id);
  if (profiel.is_admin) return fout("Een beheerdersaccount heeft al alle functies. Een abonnement is niet nodig.");
  const huidig = effectivePlan(profiel);
  if (huidig.id === plan.id && profiel.mollie_subscription_id) return fout("Je hebt dit abonnement al.");

  const admin = db();
  let customerId = profiel.mollie_customer_id;
  if (!customerId) {
    const customer = await mollie().customers.create({
      name: profiel.naam || user.email,
      email: user.email,
      metadata: { userId: user.id },
    });
    customerId = customer.id;
    await admin.from("profiles").update({ mollie_customer_id: customerId }).eq("id", user.id);
  }

  const payment = await mollie().payments.create({
    amount: { currency: "EUR", value: euro(plan.prijs) },
    description: `Stagejacht ${plan.naam} – eerste maand`,
    customerId,
    sequenceType: "first",
    redirectUrl: `${siteUrl()}/app?betaling=terug#profiel`,
    webhookUrl: `${siteUrl()}/api/billing/webhook`,
    metadata: { userId: user.id, plan: plan.id, soort: "eerste" },
    locale: "nl_NL",
  });
  return ok({ url: checkoutUrl(payment) });
});
