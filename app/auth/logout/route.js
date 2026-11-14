import { NextResponse } from "next/server";
import { stopSessie } from "@/lib/session";
import { herkomstOk } from "@/lib/beveilig";

export async function POST(request) {
  if (!herkomstOk(request)) return new NextResponse("Verzoek geweigerd.", { status: 403 });
  await stopSessie();
  return NextResponse.redirect(new URL("/", request.url), { status: 303 });
}
