"use client";

export const STATUSES = [
  { key: "todo", label: "Nog benaderen", c: "var(--s-todo)" },
  { key: "mail", label: "Gemaild", c: "var(--s-mail)" },
  { key: "wait", label: "Wacht op antwoord", c: "var(--s-wait)" },
  { key: "bellen", label: "Nog bellen", c: "var(--s-bellen)" },
  { key: "call", label: "Telefonisch gesproken", c: "var(--s-call)" },
  { key: "talk", label: "Gesprek gepland", c: "var(--s-talk)" },
  { key: "yes", label: "Aangenomen", c: "var(--s-yes)" },
  { key: "no", label: "Geen stageplek", c: "var(--s-no)" },
];
export const S = Object.fromEntries(STATUSES.map((s) => [s.key, s]));
/* De vier tegels op het overzicht: elk een eigen groep statussen */
export const GROUPS = {
  wacht:   { label: "Wacht op antwoord",      keys: ["wait", "mail"],        c: "var(--s-wait)" },
  bellen:  { label: "Nog bellen / benaderen", keys: ["bellen", "todo"],      c: "var(--s-bellen)" },
  gesprek: { label: "Gesprek / aangenomen",   keys: ["talk", "yes", "call"], c: "var(--s-yes)" },
  nee:     { label: "Geen stageplek",         keys: ["no"],                  c: "var(--s-no)" },
};
export const OPEN = ["todo", "mail", "wait", "bellen", "call", "talk"];
export const TONE = {
  positief: { label: "Positief", c: "var(--s-yes)" },
  negatief: { label: "Negatief", c: "var(--s-no)" },
  neutraal: { label: "Neutraal", c: "var(--s-mail)" },
};

export function today() {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 10);
}
export function fmt(d) {
  return d ? new Date(d + "T12:00").toLocaleDateString("nl-NL", { weekday: "short", day: "numeric", month: "short" }) : "";
}
export function isDue(b) {
  return !!b.opvolg && b.opvolg <= today() && OPEN.includes(b.status);
}
export function safeUrl(u) {
  return /^https?:\/\//i.test(u || "") ? u : "";
}
export function linesOf(t) {
  return String(t || "").split(/\n+/).map((x) => x.replace(/^[-•*]\s*/, "").trim()).filter(Boolean);
}

// Roept een API-route aan. Gooit een Error met .code en .status bij een fout.
export async function api(path, body, { method = "POST" } = {}) {
  const isForm = typeof FormData !== "undefined" && body instanceof FormData;
  const res = await fetch(path, {
    method,
    headers: isForm || body === undefined ? undefined : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : isForm ? body : JSON.stringify(body),
  });
  let data = {};
  try { data = await res.json(); } catch {}
  if (!res.ok || data.ok === false) {
    const err = new Error(data.fout || "Er is iets misgegaan. Probeer het opnieuw.");
    err.code = data.code;
    err.status = res.status;
    throw err;
  }
  return data;
}

export function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(String(fr.result).split(",")[1]);
    fr.onerror = reject;
    fr.readAsDataURL(file);
  });
}
