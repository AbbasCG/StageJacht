import { metGebruiker, ok, fout, profielVan } from "@/lib/api";
import { db } from "@/lib/db";
import { bewaarCv, verwijderCv } from "@/lib/storage";
import { aiJson, cvInfoTekst, promptCvStructuur, verbruikAi } from "@/lib/ai";
import { echtBestand, bestandsnaam, teVaak } from "@/lib/beveilig";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX = 3 * 1024 * 1024;
const TYPES = {
  pdf: "application/pdf",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
};

async function leesTekst(buf, ext) {
  if (ext === "pdf") {
    const pdf = (await import("pdf-parse/lib/pdf-parse.js")).default;
    const out = await pdf(buf, { max: 5 });
    return out.text || "";
  }
  const mammoth = (await import("mammoth")).default;
  const out = await mammoth.extractRawText({ buffer: buf });
  return out.value || "";
}

// Upload een cv. ?verwerk=0 slaat alleen het bestand op (bijv. de PDF uit de cv-editor).
export const POST = metGebruiker(async (req, { user }) => {
  if (teVaak("cv:" + user.id, 20, 3600e3)) return fout("Je hebt veel geüpload. Probeer het later opnieuw.", 429);
  const verwerk = new URL(req.url).searchParams.get("verwerk") !== "0";
  const form = await req.formData().catch(() => null);
  if (!form) return fout("Geen bestand ontvangen.");
  const file = form.get("bestand");
  if (!file || typeof file === "string") return fout("Geen bestand ontvangen.");
  const ext = (file.name.split(".").pop() || "").toLowerCase();
  if (!TYPES[ext]) return fout("Kies een PDF- of Word-bestand (.pdf of .docx).");
  if (file.size > MAX) return fout("Je cv is te groot (max 3 MB).");

  const buf = Buffer.from(await file.arrayBuffer());
  if (!echtBestand(buf, ext)) return fout("Dit bestand is geen echte " + (ext === "pdf" ? "PDF" : "Word-file") + ".");
  const admin = db();
  const profiel = await profielVan(user.id);

  // Oud bestand weghalen als de extensie verandert
  const pad = `${user.id}/cv.${ext}`;
  if (profiel.cv_bestand && profiel.cv_bestand !== pad) await verwijderCv(profiel.cv_bestand);
  try { await bewaarCv(pad, buf); } catch (e) { console.error(e); return fout("Opslaan van je cv lukte niet."); }
  await admin.from("profiles").update({ cv_bestand: pad, cv_bestandsnaam: bestandsnaam(file.name) }).eq("id", user.id);

  if (!verwerk) return ok({ naam: file.name });

  let tekst = "";
  try {
    tekst = (await leesTekst(buf, ext)).trim();
  } catch {}
  if (tekst.length < 40) return ok({ naam: file.name, gelezen: false, melding: "Je cv is opgeslagen, maar de tekst kon niet gelezen worden. Vul de editor zelf in." });

  const huidig = profiel.cv || {};
  const alGevuld = huidig.profiel || (huidig.opleidingen || []).length || (huidig.werk || []).length;
  if (alGevuld) return ok({ naam: file.name, gelezen: false, melding: "Je cv is opgeslagen. Je editor had al gegevens; die zijn niet overschreven." });

  const verbruik = await verbruikAi(user.id);
  if (!verbruik.ok) return ok({ naam: file.name, gelezen: false, melding: "Je cv is opgeslagen. " + verbruik.fout });

  const out = await aiJson(promptCvStructuur(tekst));
  const cv = {
    profiel: String(out.profiel || ""),
    opleidingen: Array.isArray(out.opleidingen) ? out.opleidingen.slice(0, 10) : [],
    werk: Array.isArray(out.werk) ? out.werk.slice(0, 15) : [],
    vaardigheden: (out.vaardigheden || []).map(String).join("\n"),
    talen: (out.talen || []).map(String).join("\n"),
    hobbys: (out.hobbys || []).map(String).join(", "),
  };
  await admin.from("profiles").update({ cv, cvinfo: cvInfoTekst(cv) }).eq("id", user.id);
  return ok({ naam: file.name, gelezen: true, cv });
});

export const DELETE = metGebruiker(async (_req, { user }) => {
  const admin = db();
  const profiel = await profielVan(user.id);
  if (profiel.cv_bestand) await verwijderCv(profiel.cv_bestand);
  await admin.from("profiles").update({ cv_bestand: null, cv_bestandsnaam: null }).eq("id", user.id);
  return ok();
});
