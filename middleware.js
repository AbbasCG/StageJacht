import { NextResponse } from "next/server";

/* 1) Bezoekers zonder sessie-cookie gaan van /app naar /login (de echte controle staat op de server in currentUser).
   2) Elk verzoek dat iets verandert (POST/PUT/PATCH/DELETE) moet van deze website zelf komen. Zo kan een andere site
      jouw browser niet misbruiken om iets in je account te doen (CSRF). Mollie en de geplande taken zijn uitgezonderd:
      die hebben hun eigen controle (Mollie vraagt de betaling zelf op, cron heeft een geheim).
   3) Te grote verzoeken worden meteen geweigerd. */

const UITGEZONDERD = ["/api/billing/webhook", "/api/cron/"];
const MAX = { "/api/mail/send": 4_500_000, "/api/cv/upload": 4_000_000 };
const STANDAARD_MAX = 400_000;

function toegestaneHosts(request) {
  const hosts = new Set([request.headers.get("host"), request.nextUrl.host]);
  try { if (process.env.NEXT_PUBLIC_SITE_URL) hosts.add(new URL(process.env.NEXT_PUBLIC_SITE_URL).host); } catch {}
  return hosts;
}

export function middleware(request) {
  const path = request.nextUrl.pathname;
  const methode = request.method;

  if (path.startsWith("/app") && !request.cookies.get("sj_session")?.value) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (!["GET", "HEAD", "OPTIONS"].includes(methode) && !UITGEZONDERD.some((p) => path.startsWith(p))) {
    const origin = request.headers.get("origin");
    let goed = false;
    if (origin) { try { goed = toegestaneHosts(request).has(new URL(origin).host); } catch {} }
    if (!goed) return NextResponse.json({ ok: false, fout: "Verzoek geweigerd." }, { status: 403 });
    const lengte = Number(request.headers.get("content-length") || 0);
    const max = MAX[path] || STANDAARD_MAX;
    if (lengte > max) return NextResponse.json({ ok: false, fout: "Te groot." }, { status: 413 });
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/app/:path*", "/api/:path*", "/auth/:path*"],
};
