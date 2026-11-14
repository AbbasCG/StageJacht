import { cookies } from "next/headers";
import crypto from "node:crypto";
import { sql } from "@/lib/db";

/* Inloggen met een eigen sessie-cookie. Het cookie is een willekeurig token; in de database staat alleen
   de sha256 ervan, dus een gelekte database bevat geen bruikbare sessies. */

export const COOKIE = "sj_session";
const DAGEN = 30;
const hash = (t) => crypto.createHash("sha256").update(t).digest("hex");
const veilig = () => (process.env.NEXT_PUBLIC_SITE_URL || "").startsWith("https://");

export async function startSessie(userId) {
  const token = crypto.randomBytes(32).toString("hex");
  await sql("insert into sessions (token_hash, user_id, expires_at) values ($1, $2, now() + ($3 || ' days')::interval)", [hash(token), userId, String(DAGEN)]);
  await sql("delete from sessions where expires_at < now()"); // opruimen
  // Maximaal 10 tegelijk: de oudste vervalt
  await sql("delete from sessions where user_id = $1 and token_hash not in (select token_hash from sessions where user_id = $1 order by created_at desc limit 10)", [userId]);
  cookies().set(COOKIE, token, { httpOnly: true, sameSite: "lax", secure: veilig(), path: "/", maxAge: DAGEN * 86400 });
}

export async function stopSessie() {
  const token = cookies().get(COOKIE)?.value;
  if (token) await sql("delete from sessions where token_hash = $1", [hash(token)]);
  cookies().set(COOKIE, "", { httpOnly: true, sameSite: "lax", secure: veilig(), path: "/", maxAge: 0 });
}

// De ingelogde gebruiker, of null
export async function currentUser() {
  const token = cookies().get(COOKIE)?.value;
  if (!token || !/^[a-f0-9]{64}$/.test(token)) return null;
  const { rows } = await sql(
    "select u.id, u.email, u.naam from sessions s join users u on u.id = s.user_id where s.token_hash = $1 and s.expires_at > now()",
    [hash(token)]
  );
  return rows[0] || null;
}

// Maakt de gebruiker aan als die nog niet bestaat (het profiel volgt via een trigger in de database)
export async function zoekOfMaakGebruiker({ email, naam, sub }) {
  const adres = String(email).trim().toLowerCase();
  const bestaand = await sql("select id from users where lower(email) = $1", [adres]);
  if (bestaand.rows[0]) {
    if (sub) {
      // Een account hoort bij één Google-identiteit. Als het adres bij een ander Google-account hoort, niet inloggen.
      const r = await sql("update users set google_sub = coalesce(google_sub, $2) where id = $1 returning google_sub", [bestaand.rows[0].id, sub]);
      if (r.rows[0]?.google_sub !== sub) throw new Error("Google-account komt niet overeen");
    }
    return bestaand.rows[0].id;
  }
  const nieuw = await sql("insert into users (email, naam, google_sub) values ($1, $2, $3) returning id", [adres, naam || null, sub || null]);
  return nieuw.rows[0].id;
}
