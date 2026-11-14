import { NextResponse } from "next/server";
import { db, sql } from "@/lib/db";
import { geldigId } from "@/lib/beveilig";
import { PLANS, euro } from "@/lib/plans";
import { mollie, siteUrl, plusMaand } from "@/lib/mollie";

export const dynamic = "force-dynamic";

// Mollie roept dit aan bij elke wijziging van een betaling. We vertrouwen alleen op wat we
// zelf bij Mollie opvragen (het verzoek bevat alleen een id).
export async function POST(request) {
  const form = await request.formData().catch(() => null);
  const id = form?.get("id");
  if (!id || typeof id !== "string") return new NextResponse("ok");

  const admin = db();
  let payment;
  try {
    payment = await mollie().payments.get(id);
  } catch {
    return new NextResponse("ok"); // onbekend id: negeren
  }

  // 1) Eerste betaling betaald → abonnement aanmaken
  if (payment.sequenceType === "first" && payment.status === "paid") {
    const { userId, plan: planId } = payment.metadata || {};
    const plan = PLANS[planId];
    if (!geldigId(userId) || !plan) return new NextResponse("ok");
    // Alleen echt het bedrag voor dit abonnement erkennen
    if (payment.amount?.currency !== "EUR" || payment.amount?.value !== euro(plan.prijs)) { console.error("webhook: bedrag klopt niet", payment.id); return new NextResponse("ok"); }
    const { data: profiel } = await admin.from("profiles").select("mollie_subscription_id, mollie_customer_id, mollie_laatste_eerste_betaling").eq("id", userId).single();
    if (profiel?.mollie_customer_id && profiel.mollie_customer_id !== payment.customerId) { console.error("webhook: klant klopt niet", payment.id); return new NextResponse("ok"); }
    // Eén keer verwerken, ook als Mollie twee keer tegelijk aanroept
    const claim = await sql("update profiles set mollie_laatste_eerste_betaling = $2 where id = $1 and mollie_laatste_eerste_betaling is distinct from $2", [userId, payment.id]);
    if (!claim.rowCount) return new NextResponse("ok");

    // Bestaand abonnement (bij upgrade/downgrade) eerst stopzetten
    if (profiel?.mollie_subscription_id) {
      try {
        await mollie().customerSubscriptions.cancel(profiel.mollie_subscription_id, { customerId: payment.customerId });
      } catch {}
    }
    const start = plusMaand(new Date()).toISOString().slice(0, 10);
    let subscription = null;
    try {
      subscription = await mollie().customerSubscriptions.create({
        customerId: payment.customerId,
        amount: { currency: "EUR", value: euro(plan.prijs) },
        interval: "1 month",
        startDate: start,
        description: `Stagejacht ${plan.naam}`,
        webhookUrl: `${siteUrl()}/api/billing/webhook`,
        metadata: { userId, plan: plan.id },
      });
    } catch (e) {
      console.error("abonnement aanmaken mislukt", e?.message);
    }
    await admin.from("profiles").update({
      plan: plan.id,
      plan_tot: plusMaand(new Date(), 3).toISOString(), // 3 dagen speling voor de incasso
      mollie_subscription_id: subscription?.id || null,
    }).eq("id", userId);
    return new NextResponse("ok");
  }

  // 2) Maandelijkse incasso betaald → abonnement een maand verlengen
  if (payment.subscriptionId && payment.status === "paid") {
    const { data: profiel } = await admin.from("profiles").select("id, plan_tot").eq("mollie_subscription_id", payment.subscriptionId).maybeSingle();
    if (profiel) {
      const basis = profiel.plan_tot && new Date(profiel.plan_tot) > new Date() ? new Date(profiel.plan_tot) : new Date();
      await admin.from("profiles").update({ plan_tot: plusMaand(basis).toISOString() }).eq("id", profiel.id);
    }
  }

  // Mislukte incasso: niets doen. Het abonnement loopt vanzelf af op plan_tot,
  // en Mollie probeert het zelf opnieuw of stopt het abonnement.
  return new NextResponse("ok");
}
