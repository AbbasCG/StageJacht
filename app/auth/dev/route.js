import { NextResponse } from "next/server";
import { startSessie, zoekOfMaakGebruiker } from "@/lib/session";
import { teVaak, ipVan, herkomstOk } from "@/lib/beveilig";

// Alleen voor lokaal testen zonder Google: zet DEV_LOGIN=1 in .env.local. Nooit aanzetten op een echte server.
export async function POST(request) {
  if (process.env.DEV_LOGIN !== "1" || process.env.NODE_ENV === "production") return NextResponse.json({ ok: false, fout: "Niet beschikbaar" }, { status: 404 });
  if (!herkomstOk(request)) return NextResponse.json({ ok: false, fout: "Verzoek geweigerd." }, { status: 403 });
  // Ook als DEV_LOGIN per ongeluk aanstaat: alleen vanaf localhost
  const host = (request.headers.get("host") || "").split(":")[0];
  if (!["localhost", "127.0.0.1", "[::1]"].includes(host)) return NextResponse.json({ ok: false, fout: "Niet beschikbaar" }, { status: 404 });
  if (teVaak("dev:" + ipVan(request), 20, 600e3)) return NextResponse.json({ ok: false, fout: "Te vaak geprobeerd" }, { status: 429 });
  const { email, naam } = await request.json().catch(() => ({}));
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(email || ""))) return NextResponse.json({ ok: false, fout: "Vul een geldig e-mailadres in." }, { status: 400 });
  const userId = await zoekOfMaakGebruiker({ email, naam: String(naam || "").slice(0, 80) });
  await startSessie(userId);
  return NextResponse.json({ ok: true });
}
