import pg from "pg";

/* PostgreSQL-laag. De rest van de app praat hier via db().from("tabel")... mee, met dezelfde
   vorm als eerder (select / eq / insert / update / upsert / delete), zodat de routes simpel blijven.
   Alles gaat met parameters ($1, $2…), nooit met tekst in de SQL; kolom- en tabelnamen worden gecontroleerd. */

// Datums als tekst ("2026-11-02") en tijden als ISO-tekst, getallen als getal: zo ziet de browser ze zoals eerder.
pg.types.setTypeParser(1082, (v) => v);
pg.types.setTypeParser(1184, (v) => new Date(v).toISOString());
pg.types.setTypeParser(1114, (v) => new Date(v + "Z").toISOString());
pg.types.setTypeParser(1700, (v) => parseFloat(v));
pg.types.setTypeParser(20, (v) => parseInt(v, 10));

let pool;
export function getPool() {
  if (!pool) {
    if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL ontbreekt in .env.local");
    pool = globalThis.__sjPool || new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 10 });
    globalThis.__sjPool = pool;
  }
  return pool;
}

const IDENT = /^[a-z_][a-z0-9_]*$/i;
const TABELLEN = new Set(["users", "sessions", "profiles", "gmail_tokens", "bedrijven", "vacatures", "usage"]);
const FUNCTIES = { gebruik_ai: ["p_user", "p_maand", "p_limiet"] };
// Sleutel voor upsert als er geen onConflict is opgegeven
const SLEUTEL = { gmail_tokens: ["user_id"], vacatures: ["user_id", "id"], usage: ["user_id", "maand"], profiles: ["id"] };

const q = (naam) => {
  if (!IDENT.test(naam)) throw new Error(`Ongeldige naam: ${naam}`);
  return `"${naam}"`;
};

function waarde(v) {
  if (v === undefined) return null;
  if (v === null || v instanceof Date || typeof v !== "object") return v;
  return JSON.stringify(v); // jsonb
}

function fouten(e) {
  return { message: e.message || String(e), code: e.code, hint: e.hint || null };
}

class Vraag {
  constructor(tabel, uitvoeren) {
    if (!TABELLEN.has(tabel)) throw new Error(`Onbekende tabel: ${tabel}`);
    this.tabel = tabel;
    this.uitvoeren = uitvoeren;
    this.op = "select";
    this.kolommen = "*";
    this.filters = [];
    this.sortering = [];
    this.waarden = null;
    this.opties = {};
    this.een = null; // "single" | "maybeSingle"
    this.terug = false;
  }
  select(kolommen = "*") {
    if (this.op === "select") this.kolommen = kolommen;
    else this.terug = true; // insert/update ... .select()
    return this;
  }
  insert(v) { this.op = "insert"; this.waarden = v; return this; }
  update(v) { this.op = "update"; this.waarden = v; return this; }
  upsert(v, opties = {}) { this.op = "upsert"; this.waarden = v; this.opties = opties; return this; }
  delete() { this.op = "delete"; return this; }
  eq(kolom, v) { this.filters.push(["=", kolom, v]); return this; }
  neq(kolom, v) { this.filters.push(["<>", kolom, v]); return this; }
  order(kolom, { ascending = true } = {}) { this.sortering.push([kolom, ascending]); return this; }
  limit(n) { this.max = Math.max(1, Math.min(1000, Number(n) || 1)); return this; }
  single() { this.een = "single"; return this; }
  maybeSingle() { this.een = "maybeSingle"; return this; }

  _where(params) {
    if (!this.filters.length) return "";
    const delen = this.filters.map(([op, kolom, v]) => {
      if (v === null) return `${q(kolom)} ${op === "=" ? "IS NULL" : "IS NOT NULL"}`;
      params.push(waarde(v));
      return `${q(kolom)} ${op} $${params.length}`;
    });
    return " WHERE " + delen.join(" AND ");
  }

  sql() {
    const params = [];
    const t = q(this.tabel);
    const kolommenSql = () =>
      this.kolommen === "*" ? "*" : this.kolommen.split(",").map((k) => q(k.trim())).join(", ");
    const terugSql = this.terug ? ` RETURNING ${kolommenSql()}` : "";

    if (this.op === "select") {
      let s = `SELECT ${kolommenSql()} FROM ${t}${this._where(params)}`;
      if (this.sortering.length) s += " ORDER BY " + this.sortering.map(([k, a]) => `${q(k)} ${a ? "ASC" : "DESC"}`).join(", ");
      if (this.een === "single" || this.een === "maybeSingle") s += " LIMIT 2";
      else if (this.max) s += ` LIMIT ${this.max}`;
      return { text: s, params };
    }

    if (this.op === "insert" || this.op === "upsert") {
      const rijen = Array.isArray(this.waarden) ? this.waarden : [this.waarden];
      if (!rijen.length) throw new Error("Niets om op te slaan");
      const kolommen = Object.keys(rijen[0]);
      kolommen.forEach(q);
      const regels = rijen.map((r) => "(" + kolommen.map((k) => { params.push(waarde(r[k])); return `$${params.length}`; }).join(", ") + ")");
      let s = `INSERT INTO ${t} (${kolommen.map(q).join(", ")}) VALUES ${regels.join(", ")}`;
      if (this.op === "upsert") {
        const sleutel = (this.opties.onConflict ? String(this.opties.onConflict).split(",").map((x) => x.trim()) : SLEUTEL[this.tabel]);
        if (!sleutel) throw new Error("onConflict ontbreekt");
        const rest = kolommen.filter((k) => !sleutel.includes(k));
        s += ` ON CONFLICT (${sleutel.map(q).join(", ")}) ` + (rest.length ? `DO UPDATE SET ${rest.map((k) => `${q(k)} = EXCLUDED.${q(k)}`).join(", ")}` : "DO NOTHING");
      }
      return { text: s + terugSql, params };
    }

    if (this.op === "update") {
      if (!this.filters.length) throw new Error("update zonder filter is niet toegestaan");
      const kolommen = Object.keys(this.waarden);
      if (!kolommen.length) throw new Error("Niets om te wijzigen");
      const sets = kolommen.map((k) => { params.push(waarde(this.waarden[k])); return `${q(k)} = $${params.length}`; });
      return { text: `UPDATE ${t} SET ${sets.join(", ")}${this._where(params)}${terugSql}`, params };
    }

    if (this.op === "delete") {
      if (!this.filters.length) throw new Error("delete zonder filter is niet toegestaan");
      return { text: `DELETE FROM ${t}${this._where(params)}${terugSql}`, params };
    }
    throw new Error("Onbekende bewerking");
  }

  async _run() {
    try {
      const { text, params } = this.sql();
      const res = await this.uitvoeren(text, params);
      const rijen = res.rows || [];
      if (this.een) {
        if (rijen.length > 1 || (this.een === "single" && rijen.length === 0)) {
          return { data: null, error: { message: rijen.length ? "Meer dan één rij gevonden" : "Geen rij gevonden", code: "PGRST116" } };
        }
        return { data: rijen[0] || null, error: null };
      }
      return { data: this.op === "select" || this.terug ? rijen : null, error: null };
    } catch (e) {
      return { data: null, error: fouten(e) };
    }
  }

  then(ok, nok) { return this._run().then(ok, nok); }
}

// db().from("bedrijven")... en db().rpc("gebruik_ai", {...})
export function db(uitvoeren) {
  const run = uitvoeren || ((text, params) => getPool().query(text, params));
  return {
    from: (tabel) => new Vraag(tabel, run),
    async rpc(naam, args = {}) {
      try {
        const namen = FUNCTIES[naam];
        if (!namen) throw new Error(`Onbekende functie: ${naam}`);
        const params = namen.map((n) => waarde(args[n]));
        const res = await run(`SELECT ${q(naam)}(${namen.map((n, i) => `${q(n)} => $${i + 1}`).join(", ")}) AS r`, params);
        return { data: res.rows[0]?.r ?? null, error: null };
      } catch (e) {
        return { data: null, error: fouten(e) };
      }
    },
  };
}

// Voor losse query's (sessies e.d.)
export const sql = (text, params = []) => getPool().query(text, params);
