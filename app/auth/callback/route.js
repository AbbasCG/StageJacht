import { NextResponse } from "next/server";
import { saveRefreshToken } from "@/lib/gmail";
import { wissel, siteUrl } from "@/lib/google";
import { startSessie, zoekOfMaakGebruiker } from "@/lib/session";
import { gelijk, teVaak, ipVan } from "@/lib/beveilig";

// Google stuurt de gebruiker hierheen terug na het inloggen of het koppelen van Gmail.
export async function GET(request) {
  const url = new URL(request.url);
  const origin = siteUrl();
  const code = url.searchParams.get("code");
  const [state, gmailFlag] = (request.cookies.get("sj_oauth")?.value || "").split(".");
  const gmail = gmailFlag === "1";

  const terug = (pad) => {
    const res = NextResponse.redirect(`${origin}${pad}`);
    res.cookies.set("sj_oauth", "", { path: "/", maxAge: 0 });
    return res;
  };

  if (teVaak("callback:" + ipVan(request), 20, 600e3)) return terug("/login?fout=inloggen");
  if (!code || code.length > 2048 || !state || !gelijk(state, url.searchParams.get("state"))) return terug("/login?fout=inloggen");

  let info;
  try {
    info = await wissel(code);
  } catch (e) {
    console.error(e);
    return terug("/login?fout=inloggen");
  }

  let userId;
  try {
    userId = await zoekOfMaakGebruiker({ email: info.gebruiker.email, naam: String(info.gebruiker.name || "").slice(0, 80), sub: info.gebruiker.sub });
  } catch (e) {
    console.error(e);
    return terug("/login?fout=inloggen");
  }
  await startSessie(userId);

  if (gmail) {
    const refresh = info.tokens.refresh_token;
    // Alleen opslaan als de gebruiker echt Gmail-toegang gaf
    const gegeven = String(info.tokens.scope || "");
    if (!gegeven.includes("gmail.readonly") || !gegeven.includes("gmail.send")) return terug("/app?gmail=geen-toegang#profiel");
    if (!refresh) return terug("/app?gmail=geen-toegang#profiel");
    try {
      await saveRefreshToken(userId, refresh, info.gebruiker.email);
    } catch (e) {
      console.error(e);
      return terug("/app?gmail=fout#profiel");
    }
    return terug("/app?gmail=ok#profiel");
  }
  return terug("/app");
}
