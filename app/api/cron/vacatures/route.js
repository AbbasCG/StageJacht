import { NextResponse } from "next/server";
import { cronToegestaan } from "@/lib/api";
import { db } from "@/lib/db";
import { effectivePlan } from "@/lib/plans";
import { zoekVacaturesVoor } from "@/lib/vacatures";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

const DAG = 24 * 60 * 60 * 1000;

export async function GET(request) {
  if (!cronToegestaan(request)) return NextResponse.json({ ok: false }, { status: 401 });
  const deadline = Date.now() + 50000;
  const admin = db();
  const { data: profielen } = await admin
    .from("profiles")
    .select("*")
    .neq("plan", "free")
    .order("laatste_vacaturecheck", { ascending: true, nullsFirst: true })
    .limit(200);

  let verwerkt = 0;
  for (const p of profielen || []) {
    if (Date.now() > deadline) break;
    const plan = effectivePlan(p);
    if (!plan.vacatures) continue;
    const sinds = p.laatste_vacaturecheck ? Date.now() - new Date(p.laatste_vacaturecheck).getTime() : Infinity;
    if (plan.vacatures === "wekelijks" && sinds < 6.5 * DAG) continue;
    if (plan.vacatures === "dagelijks" && sinds < 0.8 * DAG) continue;
    try {
      await zoekVacaturesVoor(p.id, p, { deadline });
      verwerkt++;
    } catch (e) {
      console.error("vacatures", p.id, e?.message);
    }
  }
  return NextResponse.json({ ok: true, verwerkt });
}
