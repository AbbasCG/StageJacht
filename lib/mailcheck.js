import { db } from "@/lib/db";
import { nieuwsteReactie, zoekopdracht, verstuur } from "@/lib/gmail";
import { aiJson, promptReactie } from "@/lib/ai";

const STATUSSEN = ["todo", "mail", "wait", "bellen", "call", "talk", "yes", "no"];

// Checkt de Gmail van één gebruiker op reacties van zijn bedrijven. Geeft een lijst met nieuwe reacties.
export async function checkMailVoor(userId, { deadline = Date.now() + 50000 } = {}) {
  const admin = db();
  const { data: bedrijven } = await admin.from("bedrijven").select("*").eq("user_id", userId).neq("status", "yes");
  const nieuw = [];
  for (const b of bedrijven || []) {
    if (Date.now() > deadline) break;
    const q = zoekopdracht(b);
    if (!q) continue;
    const r = await nieuwsteReactie(userId, q);
    if (!r || r.id === b.reactie_msgid) continue;
    let a;
    try {
      a = await aiJson(promptReactie(b, r), { fast: true, maxTokens: 900 });
    } catch {
      continue;
    }
    if (!a || a.echt === false) {
      await admin.from("bedrijven").update({ reactie_msgid: r.id }).eq("id", b.id).eq("user_id", userId);
      continue;
    }
    const upd = {
      reactie_msgid: r.id,
      reactie_threadid: r.threadId,
      reactie_datum: r.date,
      reactie_soort: ["positief", "negatief", "neutraal"].includes(a.soort) ? a.soort : "neutraal",
      reactie_samenvatting: String(a.samenvatting || "").slice(0, 600),
      advies: String(a.advies || "").slice(0, 2000),
      updated_at: new Date().toISOString(),
    };
    if (STATUSSEN.includes(a.status)) upd.status = a.status;
    await admin.from("bedrijven").update(upd).eq("id", b.id).eq("user_id", userId);
    nieuw.push({ naam: b.naam, soort: upd.reactie_soort, samenvatting: upd.reactie_samenvatting });
  }
  await admin.from("profiles").update({ laatste_mailcheck: new Date().toISOString() }).eq("id", userId);
  return nieuw;
}

// Stuurt de gebruiker een korte mail naar zichzelf met de nieuwe reacties.
export async function meldReacties(userId, adres, nieuw) {
  if (!adres || !nieuw.length) return;
  const site = process.env.NEXT_PUBLIC_SITE_URL || "";
  const regels = nieuw.map((n) => `- ${n.naam} (${n.soort}): ${n.samenvatting}`).join("\n");
  await verstuur(userId, {
    to: adres,
    subject: `Stagejacht: ${nieuw.length} nieuwe reactie${nieuw.length > 1 ? "s" : ""} van bedrijven`,
    body: `Hoi!\n\nJe hebt nieuwe reacties op je stage-mails:\n\n${regels}\n\nOpen Stagejacht voor advies en om te antwoorden:\n${site}/app\n\nGroet,\nStagejacht`,
  });
}
