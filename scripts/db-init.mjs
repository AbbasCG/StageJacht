// Maakt de tabellen aan in je PostgreSQL-database: npm run db:init
// Leest DATABASE_URL uit .env.local (of uit je omgeving). Veilig om opnieuw te draaien.
import fs from "node:fs";
import pg from "pg";

function leesEnv() {
  for (const naam of [".env.local", ".env"]) {
    if (!fs.existsSync(naam)) continue;
    for (const regel of fs.readFileSync(naam, "utf8").split(/\r?\n/)) {
      const m = regel.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  }
}
leesEnv();
if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL ontbreekt. Kopieer .env.example naar .env.local en vul hem in.");
  process.exit(1);
}
const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
try {
  await client.connect();
  await client.query(fs.readFileSync(new URL("../db/schema.sql", import.meta.url), "utf8"));
  console.log("Klaar: de database van Stagejacht staat klaar.");
} catch (e) {
  console.error("Mislukt:", e.message);
  process.exitCode = 1;
} finally {
  await client.end().catch(() => {});
}
