import { metGebruiker, ok, profielVan } from "@/lib/api";
import { sql } from "@/lib/db";
import { disconnectGmail } from "@/lib/gmail";
import { mollie } from "@/lib/mollie";
import { verwijderAlleCvs } from "@/lib/storage";
import { stopSessie } from "@/lib/session";

// Verwijdert het account en alle gegevens (AVG: recht op vergetelheid).
export const POST = metGebruiker(async (_req, { user }) => {
  const profiel = await profielVan(user.id);
  if (profiel.mollie_subscription_id) {
    try {
      await mollie().customerSubscriptions.cancel(profiel.mollie_subscription_id, { customerId: profiel.mollie_customer_id });
    } catch {}
  }
  try {
    await disconnectGmail(user.id);
  } catch {}
  await verwijderAlleCvs(user.id);
  await stopSessie();
  // Verwijdert ook profiel, bedrijven, vacatures, gebruik en sessies (on delete cascade)
  await sql("delete from users where id = $1", [user.id]);
  return ok();
});
