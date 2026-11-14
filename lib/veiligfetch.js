import dns from "node:dns/promises";
import net from "node:net";

/* Haalt een webpagina op, maar alleen van het openbare internet. Voorkomt dat een link in een zoekresultaat
   de server laat praten met je eigen netwerk, de database of de cloud-metadata (SSRF).
   Elke omleiding wordt opnieuw gecontroleerd; grootte en tijd zijn begrensd. */

export function priveAdres(ip) {
  if (net.isIPv4(ip)) {
    const [a, b] = ip.split(".").map(Number);
    return a === 0 || a === 10 || a === 127 || (a === 100 && b >= 64 && b <= 127) || (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 192 && b === 0) || (a === 198 && (b === 18 || b === 19)) || a >= 224;
  }
  if (net.isIPv6(ip)) {
    const l = ip.toLowerCase();
    if (l === "::" || l === "::1") return true;
    const m = l.match(/^(?:::ffff:|64:ff9b::)(\d+\.\d+\.\d+\.\d+)$/);
    if (m) return priveAdres(m[1]);
    return /^f[cd]/.test(l) || /^fe[89ab]/.test(l) || l.startsWith("ff");
  }
  return true;
}

export async function controleerUrl(u) {
  let url;
  try { url = new URL(u); } catch { throw new Error("Ongeldige URL"); }
  if (!["http:", "https:"].includes(url.protocol)) throw new Error("Alleen http en https");
  if (url.username || url.password) throw new Error("Geen inloggegevens in een URL");
  if (url.port && !["80", "443"].includes(url.port)) throw new Error("Poort niet toegestaan");
  const host = url.hostname.replace(/^\[|\]$/g, "");
  if (net.isIP(host)) { if (priveAdres(host)) throw new Error("Intern adres"); return url; }
  if (/(^|\.)(localhost|local|internal|lan|home|intranet)$/i.test(host)) throw new Error("Intern adres");
  const adressen = await dns.lookup(host, { all: true });
  if (!adressen.length || adressen.some((a) => priveAdres(a.address))) throw new Error("Intern adres");
  return url;
}

export async function veiligeTekst(u, { maxBytes = 800_000, ms = 8000, hops = 3, headers = {} } = {}) {
  let url = await controleerUrl(u);
  for (let i = 0; i <= hops; i++) {
    const res = await fetch(url, { headers, redirect: "manual", cache: "no-store", signal: AbortSignal.timeout(ms) });
    if (res.status >= 300 && res.status < 400 && res.headers.get("location")) {
      url = await controleerUrl(new URL(res.headers.get("location"), url).toString());
      continue;
    }
    if (!res.ok) throw new Error("Status " + res.status);
    const type = res.headers.get("content-type") || "";
    if (!/text\/|json|xml/i.test(type)) throw new Error("Geen tekstpagina");
    const reader = res.body.getReader();
    const delen = [];
    let n = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      n += value.length;
      if (n > maxBytes) { await reader.cancel(); break; }
      delen.push(value);
    }
    return Buffer.concat(delen).toString("utf8");
  }
  throw new Error("Te veel omleidingen");
}
