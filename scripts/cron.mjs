// Draaien van de geplande taken (op de Hetzner-server via cron):
//   npm run cron:mail        controleert de mail van alle gebruikers met Gmail
//   npm run cron:vacatures   zoekt nieuwe vacatures
// Plan ze met cron (Linux/Mac) of Taakplanner (Windows). De app moet dan draaien.
import fs from "node:fs";

for (const naam of [".env.local", ".env"]) {
  if (!fs.existsSync(naam)) continue;
  for (const regel of fs.readFileSync(naam, "utf8").split(/\r?\n/)) {
    const m = regel.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}
const taak = process.argv[2];
if (!["mailcheck", "vacatures"].includes(taak)) { console.error("Gebruik: node scripts/cron.mjs mailcheck|vacatures"); process.exit(1); }
const basis = process.env.CRON_BASE_URL || "http://localhost:3000";
const res = await fetch(`${basis}/api/cron/${taak}`, { headers: { authorization: `Bearer ${process.env.CRON_SECRET || ""}` } });
console.log(res.status, await res.text());
process.exit(res.ok ? 0 : 1);
