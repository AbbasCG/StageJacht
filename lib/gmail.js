import { db } from "@/lib/db";
import crypto from "node:crypto";
import { decrypt, encrypt } from "@/lib/crypto";
import { kopTekst, bestandsnaam, geldigEmail, BIJLAGE_TYPES } from "@/lib/beveilig";

export const GMAIL_SCOPES = [
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/gmail.send",
];

const API = "https://gmail.googleapis.com/gmail/v1/users/me";

export class GmailError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
  }
}

export async function saveRefreshToken(userId, refreshToken, adres) {
  const admin = db();
  await admin.from("gmail_tokens").upsert({
    user_id: userId,
    refresh_token_enc: encrypt(refreshToken),
    scopes: GMAIL_SCOPES.join(" "),
    updated_at: new Date().toISOString(),
  });
  await admin.from("profiles").update({ gmail_verbonden: true, gmail_adres: adres || null }).eq("id", userId);
}

export async function disconnectGmail(userId) {
  const admin = db();
  const { data } = await admin.from("gmail_tokens").select("refresh_token_enc").eq("user_id", userId).maybeSingle();
  if (data) {
    try {
      await fetch("https://oauth2.googleapis.com/revoke", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ token: decrypt(data.refresh_token_enc) }),
      });
    } catch {}
  }
  await admin.from("gmail_tokens").delete().eq("user_id", userId);
  await admin.from("profiles").update({ gmail_verbonden: false, gmail_adres: null }).eq("id", userId);
}

async function accessToken(userId) {
  const admin = db();
  const { data } = await admin.from("gmail_tokens").select("refresh_token_enc").eq("user_id", userId).maybeSingle();
  if (!data) throw new GmailError("not_connected", "Je Gmail-account is niet gekoppeld.");
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      refresh_token: decrypt(data.refresh_token_enc),
      grant_type: "refresh_token",
    }),
  });
  const json = await res.json();
  if (!res.ok) {
    if (json.error === "invalid_grant") {
      await admin.from("profiles").update({ gmail_verbonden: false }).eq("id", userId);
      throw new GmailError("needs_reauth", "Je Gmail-koppeling is verlopen. Koppel je Gmail-account opnieuw via Profiel.");
    }
    throw new GmailError("token_error", "De toegang tot Gmail is niet gelukt. Probeer het later opnieuw.");
  }
  return json.access_token;
}

async function gmailFetch(token, path, init = {}) {
  const res = await fetch(API + path, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...(init.headers || {}) },
  });
  if (!res.ok) {
    const t = await res.text();
    throw new GmailError("api_error", `Gmail gaf een fout (${res.status}): ${t.slice(0, 200)}`);
  }
  return res.json();
}

function header(msg, name) {
  const h = (msg.payload?.headers || []).find((x) => x.name.toLowerCase() === name.toLowerCase());
  return h ? h.value : "";
}

function decodeB64Url(s) {
  return Buffer.from(String(s || "").replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8");
}

function bodyText(part) {
  if (!part) return "";
  if (part.mimeType === "text/plain" && part.body?.data) return decodeB64Url(part.body.data);
  if (part.parts) {
    for (const p of part.parts) {
      const t = bodyText(p);
      if (t) return t;
    }
  }
  if (part.mimeType === "text/html" && part.body?.data) {
    return decodeB64Url(part.body.data).replace(/<style[\s\S]*?<\/style>/gi, "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  }
  return "";
}

// Zoekt de nieuwste ontvangen mail (niet door de gebruiker zelf verstuurd) die bij de zoekopdracht past.
export async function nieuwsteReactie(userId, query) {
  const token = await accessToken(userId);
  const list = await gmailFetch(token, `/threads?maxResults=3&q=${encodeURIComponent(query)}`);
  const threads = list.threads || [];
  if (!threads.length) return null;
  const thread = await gmailFetch(token, `/threads/${threads[0].id}?format=full`);
  const ontvangen = (thread.messages || []).filter((m) => !(m.labelIds || []).includes("SENT"));
  const m = ontvangen[ontvangen.length - 1];
  if (!m) return null;
  return {
    id: m.id,
    threadId: m.threadId,
    from: header(m, "From"),
    subject: header(m, "Subject"),
    messageIdHeader: header(m, "Message-ID") || header(m, "Message-Id"),
    date: new Date(Number(m.internalDate || Date.now())).toISOString().slice(0, 10),
    body: bodyText(m.payload).slice(0, 8000),
  };
}

// Haalt één bericht op (nodig om netjes te antwoorden)
export async function bericht(userId, messageId) {
  const token = await accessToken(userId);
  const m = await gmailFetch(token, `/messages/${messageId}?format=metadata&metadataHeaders=From&metadataHeaders=Subject&metadataHeaders=Message-ID&metadataHeaders=Reply-To`);
  return {
    threadId: m.threadId,
    from: header(m, "Reply-To") || header(m, "From"),
    subject: header(m, "Subject"),
    messageIdHeader: header(m, "Message-ID") || header(m, "Message-Id"),
  };
}

function encodeHeader(v) {
  v = kopTekst(v, 300); // geen regeleinden: anders kan iemand extra mailkoppen inspuiten
  return /[^\x20-\x7E]/.test(v) || /[=?"]/.test(v) ? `=?UTF-8?B?${Buffer.from(v, "utf8").toString("base64")}?=` : v;
}

// Precies één geldig e-mailadres, anders een fout (nooit meerdere ontvangers of extra koppen)
function adres(v) {
  const m = String(v || "").match(/<([^<>]+)>/);
  const a = kopTekst(m ? m[1] : v, 254);
  if (!geldigEmail(a)) throw new GmailError("ongeldig_adres", "Dit is geen geldig e-mailadres.");
  return a;
}

// Verstuurt een mail vanaf de Gmail van de gebruiker. attachments: [{ filename, mimeType, data: Buffer }]
export async function verstuur(userId, { to, subject, body, attachments = [], replyTo }) {
  const token = await accessToken(userId);
  const boundary = "sj_" + crypto.randomBytes(18).toString("hex");
  const headers = [
    `To: ${adres(to)}`,
    `Subject: ${encodeHeader(subject)}`,
    "MIME-Version: 1.0",
  ];
  if (replyTo?.messageIdHeader) {
    const mid = kopTekst(replyTo.messageIdHeader, 300);
    headers.push(`In-Reply-To: ${mid}`, `References: ${mid}`);
  }
  let raw;
  if (!attachments.length) {
    raw = [...headers, 'Content-Type: text/plain; charset="UTF-8"', "Content-Transfer-Encoding: base64", "", Buffer.from(body, "utf8").toString("base64")].join("\r\n");
  } else {
    const parts = [
      `--${boundary}`,
      'Content-Type: text/plain; charset="UTF-8"',
      "Content-Transfer-Encoding: base64",
      "",
      Buffer.from(body, "utf8").toString("base64"),
    ];
    for (const a of attachments) {
      const type = BIJLAGE_TYPES[a.mimeType] ? a.mimeType : "application/octet-stream";
      const naam = encodeHeader(bestandsnaam(a.filename));
      parts.push(
        `--${boundary}`,
        `Content-Type: ${type}; name="${naam}"`,
        `Content-Disposition: attachment; filename="${naam}"`,
        "Content-Transfer-Encoding: base64",
        "",
        a.data.toString("base64").replace(/(.{76})/g, "$1\r\n")
      );
    }
    parts.push(`--${boundary}--`);
    raw = [...headers, `Content-Type: multipart/mixed; boundary="${boundary}"`, "", ...parts].join("\r\n");
  }
  const encoded = Buffer.from(raw, "utf8").toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  return gmailFetch(token, "/messages/send", {
    method: "POST",
    body: JSON.stringify({ raw: encoded, ...(replyTo?.threadId ? { threadId: replyTo.threadId } : {}) }),
  });
}

// Zoekopdracht voor reacties van een bedrijf
const GRATIS = /@(gmail|hotmail|outlook|live|yahoo|icloud|ziggo|kpnmail|home|planet)\./i;
export function zoekopdracht(b) {
  if (b.email) {
    const q = GRATIS.test(b.email) ? `from:${b.email}` : `from:${b.email.split("@")[1]}`;
    return `${q} -in:sent newer_than:30d`;
  }
  if (b.naam) {
    const naam = b.naam.replace(/"/g, "").replace(/\b(B\.?V\.?|HK|Holding)\b/gi, "").trim();
    return `"${naam}" -in:sent newer_than:30d`;
  }
  return null;
}
