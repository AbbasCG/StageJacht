"use client";

/* Dezelfde vorm als eerder (supabase.from("bedrijven").select()...), maar nu via /api/db.
   De server bepaalt wie je bent en geeft je alleen je eigen gegevens. */

function bouw(tabel) {
  const st = { tabel, op: "select", kolommen: "*", waarden: null, filters: [], sortering: [], een: null };
  const b = {
    select(k = "*") { if (st.op === "select") st.kolommen = k; return b; },
    insert(v) { st.op = "insert"; st.waarden = v; return b; },
    update(v) { st.op = "update"; st.waarden = v; return b; },
    delete() { st.op = "delete"; return b; },
    eq(k, v) { st.filters.push(["eq", k, v]); return b; },
    neq(k, v) { st.filters.push(["neq", k, v]); return b; },
    order(k, o = {}) { st.sortering.push([k, o.ascending !== false]); return b; },
    single() { st.een = "single"; return b; },
    maybeSingle() { st.een = "maybeSingle"; return b; },
    then(ok, nok) {
      return fetch("/api/db", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(st) })
        .then((r) => r.json())
        .catch(() => ({ data: null, error: { message: "Geen verbinding" } }))
        .then((r) => ({ data: r.data ?? null, error: r.error ?? null }))
        .then(ok, nok);
    },
  };
  return b;
}

let client;
export function dbBrowser() {
  if (!client) {
    client = {
      from: bouw,
      auth: {
        async getUser() {
          try {
            const r = await fetch("/api/me");
            if (!r.ok) return { data: { user: null } };
            return { data: { user: (await r.json()).user } };
          } catch { return { data: { user: null } }; }
        },
        async signOut() { await fetch("/auth/logout", { method: "POST", redirect: "manual" }).catch(() => {}); },
      },
    };
  }
  return client;
}
