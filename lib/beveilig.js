import crypto from "node:crypto";

/* Kleine beveiligingshulpjes die op meerdere plekken gebruikt worden. */

// Vergelijking waarbij de tijd niets verraadt (voor geheimen, tokens en state)
export function gelijk(a, b) {
  const x = crypto.createHash("sha256").update(String(a ?? "")).digest();
  const y = crypto.createHash("sha256").update(String(b ?? "")).digest();
  return crypto.timingSafeEqual(x, y) && String(a ?? "") !== "";
}

// Rate limit in het geheugen van deze server: max `max` keer per `perMs` per sleutel.
// (Bij meerdere servers tegelijk: vervang dit door Redis of een tabel in de database.)
const emmers = globalThis.__sjEmmers || (globalThis.__sjEmmers = new Map());
export function teVaak(sleutel, max, perMs) {
  const nu = Date.now();
  const lijst = (emmers.get(sleutel) || []).filter((t) => nu - t < perMs);
  if (lijst.length >= max) { emmers.set(sleutel, lijst); return true; }
  lijst.push(nu);
  emmers.set(sleutel, lijst);
  if (emmers.size > 5000) for (const [k, v] of emmers) if (!v.length || nu - v[v.length - 1] > 3600e3) emmers.delete(k);
  return false;
}

export function ipVan(request) {
  const f = request.headers.get("x-forwarded-for");
  return (f ? f.split(",")[0] : request.headers.get("x-real-ip") || "onbekend").trim();
}

// Eén geldig e-mailadres. Geen komma's, puntkomma's, haakjes of spaties, dus nooit meerdere ontvangers.
export const EMAIL = /^[A-Za-z0-9._%+-]{1,64}@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,24}$/;
export const geldigEmail = (v) => typeof v === "string" && v.length <= 254 && EMAIL.test(v.trim());

export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const geldigId = (v) => typeof v === "string" && UUID.test(v);

// Haalt alles weg waarmee je een e-mailkop kunt kapen (regeleinden en andere stuurtekens)
export const kopTekst = (v, max = 200) => String(v ?? "").replace(/[\u0000-\u001f\u007f\u2028\u2029]+/g, " ").slice(0, max).trim();
export const bestandsnaam = (v) => kopTekst(v, 120).replace(/["\\/<>:*?|;]/g, "_") || "bijlage";

export const BIJLAGE_TYPES = {
  "application/pdf": "pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
  "image/png": "png",
  "image/jpeg": "jpg",
};

// Controleert aan de eerste bytes of een bestand echt is wat het zegt te zijn
export function echtBestand(buf, type) {
  if (!Buffer.isBuffer(buf) || buf.length < 8) return false;
  if (type === "pdf" || type === "application/pdf") return buf.subarray(0, 5).toString("latin1") === "%PDF-";
  if (type === "docx" || type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") return buf[0] === 0x50 && buf[1] === 0x4b && zipVeilig(buf);
  if (type === "png" || type === "image/png") return buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  if (type === "jpg" || type === "image/jpeg") return buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff;
  return false;
}

// Een docx is een zipbestand. Tegen zip-bommen: lees de inhoudsopgave en weiger als het uitgepakt te groot wordt.
export function zipVeilig(buf, { maxBestanden = 2000, maxTotaal = 60 * 1024 * 1024 } = {}) {
  let eocd = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 22 - 65535); i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd < 0) return false;
  const aantal = buf.readUInt16LE(eocd + 10);
  let pos = buf.readUInt32LE(eocd + 16);
  if (aantal > maxBestanden) return false;
  let totaal = 0;
  for (let i = 0; i < aantal; i++) {
    if (pos + 46 > buf.length || buf.readUInt32LE(pos) !== 0x02014b50) return false;
    totaal += buf.readUInt32LE(pos + 24);
    if (totaal > maxTotaal) return false;
    pos += 46 + buf.readUInt16LE(pos + 28) + buf.readUInt16LE(pos + 30) + buf.readUInt16LE(pos + 32);
  }
  return true;
}

// Komt een verzoek van deze website zelf? (Tweede controle naast de middleware, voor het geval die wordt omzeild.)
export function herkomstOk(request) {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  try {
    const h = new URL(origin).host;
    const ok = new Set([request.headers.get("host")]);
    if (process.env.NEXT_PUBLIC_SITE_URL) ok.add(new URL(process.env.NEXT_PUBLIC_SITE_URL).host);
    return ok.has(h);
  } catch { return false; }
}
