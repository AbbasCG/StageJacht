import { metGebruiker, ok, fout, profielVan } from "@/lib/api";
import { db } from "@/lib/db";
import { verstuur, bericht } from "@/lib/gmail";
import { schoonTekst } from "@/lib/ai";
import { leesCv } from "@/lib/storage";
import { geldigEmail, geldigId, kopTekst, bestandsnaam, BIJLAGE_TYPES, echtBestand, teVaak } from "@/lib/beveilig";

export const maxDuration = 60;

const vandaag = () => new Date().toISOString().slice(0, 10);

export const POST = metGebruiker(async (req, { user }) => {
  // Je Gmail is jouw naam: zo kan het niet misbruikt worden om te spammen
  if (teVaak("mail-uur:" + user.id, 15, 3600e3) || teVaak("mail-dag:" + user.id, 40, 86400e3)) return fout("Je hebt veel mails verstuurd. Probeer het later opnieuw.", 429);
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") return fout("Ongeldig verzoek.");
  const { soort, bedrijfId, vacatureId, naar, cvMee, bijlage, gecontroleerd } = body;
  if ((bedrijfId && !geldigId(bedrijfId)) || (vacatureId && typeof vacatureId !== "string")) return fout("Ongeldig verzoek.");
  const tekst = schoonTekst(typeof body.tekst === "string" ? body.tekst : "").slice(0, 20000);
  const onderwerp = kopTekst(schoonTekst(typeof body.onderwerp === "string" ? body.onderwerp : ""), 200);
  if (gecontroleerd !== true) return fout("Vink eerst aan dat je de mail hebt gecontroleerd.");
  if (!tekst || !tekst.trim()) return fout("Je mail is leeg.");
  if (/\[[^\]]+\]/.test(tekst)) return fout("Vul eerst alles tussen [vierkante haken] in.");

  const admin = db();
  const profiel = await profielVan(user.id);
  if (!profiel.gmail_verbonden) return fout("Verbind eerst je Gmail.", 409, { code: "not_connected" });

  let bedrijf = null, vacature = null;
  if (bedrijfId) ({ data: bedrijf } = await admin.from("bedrijven").select("*").eq("id", bedrijfId).eq("user_id", user.id).maybeSingle());
  if (vacatureId) ({ data: vacature } = await admin.from("vacatures").select("*").eq("id", vacatureId).eq("user_id", user.id).maybeSingle());
  if (!bedrijf && !vacature) return fout("Bedrijf niet gevonden.", 404);

  // Bijlagen: het eigen cv uit opslag, plus eventueel één extra bestand (max 2,5 MB;
  // verzoeken kunnen niet te groot zijn en base64 maakt bestanden ~33% groter)
  const attachments = [];
  if (cvMee && profiel.cv_bestand) {
    let cvData;
    try { cvData = await leesCv(profiel.cv_bestand); } catch { return fout("Je cv kon niet geladen worden. Upload hem opnieuw."); }
    attachments.push({
      filename: bestandsnaam(profiel.cv_bestandsnaam || "cv.pdf"),
      mimeType: profiel.cv_bestand.endsWith(".docx")
        ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        : "application/pdf",
      data: cvData,
    });
  }
  if (bijlage?.data) {
    if (typeof bijlage.data !== "string" || bijlage.data.length > 3.5 * 1024 * 1024) return fout("Je extra bijlage is te groot (max 2,5 MB).");
    const data = Buffer.from(bijlage.data, "base64");
    if (data.length > 2.5 * 1024 * 1024) return fout("Je extra bijlage is te groot (max 2,5 MB).");
    // Alleen pdf, Word of een foto, en het bestand moet echt zo'n bestand zijn
    const type = BIJLAGE_TYPES[bijlage.type] ? bijlage.type : null;
    if (!type || !echtBestand(data, type)) return fout("Als extra bijlage kun je een pdf, Word-bestand of foto (png/jpg) meesturen.");
    attachments.push({ filename: bestandsnaam(bijlage.naam), mimeType: type, data });
  }

  if (soort === "reply") {
    if (!bedrijf?.reactie_msgid) return fout("Er is geen mail om op te antwoorden.");
    const orig = await bericht(user.id, bedrijf.reactie_msgid);
    const subject = /^re:/i.test(orig.subject || "") ? orig.subject : `Re: ${orig.subject || "stage"}`;
    await verstuur(user.id, { to: orig.from, subject, body: tekst, attachments, replyTo: orig });
    await admin.from("bedrijven").update({
      notes: `${bedrijf.notes ? bedrijf.notes + "\n" : ""}${vandaag()}: antwoord gestuurd op hun mail.`,
      datum: vandaag(),
      updated_at: new Date().toISOString(),
    }).eq("id", bedrijf.id).eq("user_id", user.id);
    return ok();
  }

  if (!geldigEmail(naar)) return fout("Vul een geldig e-mailadres in (één adres).");
  if (!onderwerp) return fout("Vul een onderwerp in.");
  await verstuur(user.id, { to: naar.trim(), subject: onderwerp.trim(), body: tekst, attachments });

  if (vacature) {
    await admin.from("bedrijven").insert({
      user_id: user.id,
      naam: vacature.bedrijf,
      plaats: vacature.plaats,
      link: vacature.link,
      contact: vacature.contact,
      email: naar.trim(),
      tel: vacature.tel,
      status: "wait",
      datum: vandaag(),
      notes: `${vacature.functie ? "Vacature: " + vacature.functie + "\n" : ""}${vandaag()}: sollicitatiemail gestuurd.`,
    });
    await admin.from("vacatures").update({ toegevoegd: true }).eq("id", vacature.id).eq("user_id", user.id);
  } else {
    await admin.from("bedrijven").update({
      status: "wait",
      email: naar.trim(),
      datum: vandaag(),
      notes: `${bedrijf.notes ? bedrijf.notes + "\n" : ""}${vandaag()}: mail gestuurd.`,
      updated_at: new Date().toISOString(),
    }).eq("id", bedrijf.id).eq("user_id", user.id);
  }
  return ok();
});
