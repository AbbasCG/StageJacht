import * as cheerio from "cheerio";

// Zoekt stageplekken op Stagemarkt.nl (van SBB).
// Let op: vraag SBB of je hun site automatisch mag doorzoeken, of ze een koppeling (API) hebben.
// Deze code leest de openbare pagina's netjes en langzaam (max een paar per gebruiker per dag).

const BASE = "https://stagemarkt.nl";
const BOL_GUID = "2468c1a0-ad7b-4209-b27b-b12ae0e3d1d2";
const UA = "Mozilla/5.0 (compatible; StagejachtBot/1.0; +" + (process.env.NEXT_PUBLIC_SITE_URL || "") + ")";

export function zoekUrl(p, straal = 10) {
  const u = new URL(BASE + "/stages/");
  if (p.crebocode) u.searchParams.set("crebocode", p.crebocode);
  if (p.woonplaats) {
    u.searchParams.set("plaatsPostcode", p.woonplaats);
    u.searchParams.set("straal", String(straal));
    u.searchParams.set("locatieType", "Postcode");
  }
  if (p.niveau) u.searchParams.set("opleidingsniveau", p.niveau);
  if ((p.leerweg || "BOL") === "BOL") u.searchParams.set("leerweg", BOL_GUID);
  return u.toString();
}

const toegestaan = (u) => u.protocol === "https:" && /^(www\.)?stagemarkt\.nl$/.test(u.hostname);

async function haal(url) {
  let doel = new URL(url);
  for (let i = 0; i < 3; i++) {
    if (!toegestaan(doel)) throw new Error("Alleen Stagemarkt");
    const res = await fetch(doel, { headers: { "User-Agent": UA, "Accept-Language": "nl-NL" }, cache: "no-store", redirect: "manual", signal: AbortSignal.timeout(10000) });
    if (res.status >= 300 && res.status < 400 && res.headers.get("location")) { doel = new URL(res.headers.get("location"), doel); continue; }
    if (!res.ok) throw new Error("Stagemarkt gaf " + res.status);
    return (await res.text()).slice(0, 2_000_000);
  }
  throw new Error("Te veel omleidingen");
}

// Geeft [{ id, link, titel }] uit de zoekresultaten
export async function zoek(p, straal = 10) {
  const html = await haal(zoekUrl(p, straal));
  const $ = cheerio.load(html);
  const gezien = new Map();
  $('a[href*="/stages/"]').each((_, a) => {
    const href = $(a).attr("href") || "";
    const m = href.match(/\/stages\/[^/?#]*?_([0-9a-f-]{36})(?:-\d+)?/i);
    if (!m) return;
    const id = m[1].toLowerCase();
    if (gezien.has(id)) return;
    const doel = new URL(href.split("?")[0], BASE);
    if (doel.protocol !== "https:" || !/^(www\.)?stagemarkt\.nl$/.test(doel.hostname)) return; // nooit naar een andere site
    const link = doel.toString();
    gezien.set(id, { id, link, titel: $(a).text().trim().slice(0, 120) });
  });
  return [...gezien.values()];
}

function veld($, label) {
  let waarde = "";
  $("strong, b, dt").each((_, el) => {
    const t = $(el).text().trim().replace(/:$/, "").toLowerCase();
    if (!waarde && t === label.toLowerCase()) {
      waarde = ($(el).next().text() || $(el).parent().text().replace($(el).text(), "")).trim();
    }
  });
  return waarde.replace(/\s+/g, " ").trim();
}

// Haalt details van één stageplek op
export async function details(link) {
  const html = await haal(link);
  const $ = cheerio.load(html);
  const tekst = $("body").text().replace(/\s+/g, " ");
  const titel = $("h1").first().text().trim();
  const bedrijf = (($("title").text().match(/bij (.+?) in /) || [])[1] || "").trim();
  const plaats = (($("title").text().match(/ in ([^-|]+)/) || [])[1] || "").trim();
  const mails = [...new Set((tekst.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) || []).map((x) => x.toLowerCase()))]
    .filter((x) => !/stagemarkt|s-bb\.nl/.test(x));
  const tel = (tekst.match(/(?:\+31|0)[\s-]?\d[\d\s-]{7,12}\d/) || [])[0] || "";
  const contact = veld($, "Contact persoon") || veld($, "Contactpersoon");
  const leerweg = /\bBBL\b/.test(tekst) && !/\bBOL\b/.test(tekst) ? "BBL" : /\bBOL\b/.test(tekst) ? "BOL" : "";
  const niveau = (tekst.match(/Niveau\s+([1-4])/i) || [])[1] || "";
  const vergoeding = (tekst.match(/€\s?\d+\s?-\s?€\s?\d+\s?p\/m/) || [])[0] || "";
  const start = /Per direct/i.test(tekst) ? "Per direct" : "";
  const adres = $('a[href*="#map-container"]').first().text().trim();
  // Voorkeur: mailadres van de contactpersoon (bevat vaak zijn naam), anders het eerste adres
  const voornaam = contact.split(" ")[0]?.toLowerCase();
  const email = mails.find((m) => voornaam && m.includes(voornaam)) || mails[0] || "";
  const omschrijving = $("h2").first().nextAll("p").first().text().trim().slice(0, 400);
  return { titel, bedrijf, plaats: adres || plaats, email, tel: tel.trim(), contact, leerweg, niveau, vergoeding, start, omschrijving };
}
