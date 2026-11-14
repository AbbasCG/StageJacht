import { NextResponse } from "next/server";
import { currentUser } from "@/lib/session";
import { db } from "@/lib/db";
import { gelijk, herkomstOk } from "@/lib/beveilig";

export function ok(data = {}) {
  return NextResponse.json({ ok: true, ...data });
}

export function fout(bericht, status = 400, extra = {}) {
  return NextResponse.json({ ok: false, fout: bericht, ...extra }, { status });
}

// Wrapper voor API-routes: vereist een ingelogde gebruiker en vangt fouten af.
export function metGebruiker(handler) {
  return async (request, ctx) => {
    if (!["GET", "HEAD"].includes(request.method) && !herkomstOk(request)) return fout("Verzoek geweigerd.", 403);
    const user = await currentUser();
    if (!user) return fout("Je bent niet ingelogd.", 401);
    try {
      return await handler(request, { user, ...ctx });
    } catch (e) {
      console.error(e);
      if (e?.code === "not_connected" || e?.code === "needs_reauth") return fout(e.message, 409, { code: e.code });
      return fout("Er ging iets mis. Probeer het opnieuw.", 500);
    }
  };
}

export async function profielVan(userId) {
  const { data } = await db().from("profiles").select("*").eq("id", userId).single();
  return data || {};
}

export function cronToegestaan(request) {
  const auth = request.headers.get("authorization") || "";
  const geheim = process.env.CRON_SECRET;
  return !!geheim && geheim.length >= 16 && gelijk(auth, `Bearer ${geheim}`);
}
