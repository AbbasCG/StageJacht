import { NextResponse } from "next/server";
import { currentUser } from "@/lib/session";

export async function GET() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ user: null }, { status: 401 });
  return NextResponse.json({ user: { id: user.id, email: user.email, user_metadata: { full_name: user.naam || "", avatar_url: null } } });
}
