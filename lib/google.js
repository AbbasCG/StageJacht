import crypto from "node:crypto";

/* Inloggen met Google zonder tussenpartij. Zet in Google Cloud Console:
   Authorized redirect URI = <NEXT_PUBLIC_SITE_URL>/auth/callback  (lokaal: http://localhost:3000/auth/callback) */

export const siteUrl = () => (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");
const GMAIL = "https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/gmail.send";

export function nieuweState() {
  return crypto.randomBytes(24).toString("hex");
}

export function googleUrl({ state, gmail }) {
  const p = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID || "",
    redirect_uri: `${siteUrl()}/auth/callback`,
    response_type: "code",
    scope: "openid email profile" + (gmail ? " " + GMAIL : ""),
    state,
    access_type: "offline",
    prompt: gmail ? "consent" : "select_account",
    include_granted_scopes: "true",
  });
  return "https://accounts.google.com/o/oauth2/v2/auth?" + p;
}

export async function wissel(code) {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID || "",
      client_secret: process.env.GOOGLE_CLIENT_SECRET || "",
      redirect_uri: `${siteUrl()}/auth/callback`,
      grant_type: "authorization_code",
    }),
  });
  const tokens = await res.json().catch(() => ({}));
  if (!res.ok || !tokens.access_token) throw new Error("Google gaf geen toegang: " + (tokens.error_description || tokens.error || res.status));
  const info = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", { headers: { authorization: `Bearer ${tokens.access_token}` } });
  const gebruiker = await info.json();
  if (!info.ok || !gebruiker.email) throw new Error("Geen e-mailadres van Google ontvangen");
  if (gebruiker.email_verified !== true) throw new Error("Dit Google-adres is niet bevestigd");
  return { tokens, gebruiker };
}
