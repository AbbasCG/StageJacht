import { NextResponse } from "next/server";
import { cronToegestaan } from "@/lib/api";
import { db } from "@/lib/db";
import { effectivePlan } from "@/lib/plans";
import { checkMailVoor, meldReacties } from "@/lib/mailcheck";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

// Draait elke dag (geplant via cron, zie scripts/cron.mjs). Verwerkt gebruikers die het langst niet gecheckt zijn eerst,
// tot de tijd bijna op is. Bij veel gebruikers: vaker laten draaien of een wachtrij gebruiken.
export async function GET(request) {
  if (!cronToegestaan(request)) return NextResponse.json({ ok: false }, { status: 401 });
  const deadline = Date.now() + 50000;
  const admin = db();
  const { data: profielen } = await admin
    .from("profiles")
    .select("id, plan, plan_tot, gmail_verbonden, gmail_adres, laatste_mailcheck")
    .eq("gmail_verbonden", true)
    .neq("plan", "free")
    .order("laatste_mailcheck", { ascending: true, nullsFirst: true })
    .limit(200);

  let verwerkt = 0;
  for (const p of profielen || []) {
    if (Date.now() > deadline) break;
    if (!effectivePlan(p).mailcheck) continue;
    try {
      const nieuw = await checkMailVoor(p.id, { deadline });
      if (nieuw.length) await meldReacties(p.id, p.gmail_adres, nieuw);
      verwerkt++;
    } catch (e) {
      console.error("mailcheck", p.id, e?.message);
    }
  }
  return NextResponse.json({ ok: true, verwerkt });
}
