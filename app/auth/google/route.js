import { NextResponse } from "next/server";
import { googleUrl, nieuweState, siteUrl } from "@/lib/google";
import { teVaak, ipVan } from "@/lib/beveilig";

// Start het inloggen (of het koppelen van Gmail met ?gmail=1) bij Google
export async function GET(request) {
  if (teVaak("google:" + ipVan(request), 30, 600e3)) return NextResponse.redirect(`${siteUrl()}/login?fout=inloggen`);
  const gmail = new URL(request.url).searchParams.get("gmail") === "1";
  if (!process.env.GOOGLE_CLIENT_ID) return NextResponse.redirect(`${siteUrl()}/login?fout=google-niet-ingesteld`);
  const state = nieuweState();
  const res = NextResponse.redirect(googleUrl({ state, gmail }));
  res.cookies.set("sj_oauth", `${state}.${gmail ? "1" : "0"}`, { httpOnly: true, sameSite: "lax", secure: siteUrl().startsWith("https://"), path: "/", maxAge: 600 });
  return res;
}
