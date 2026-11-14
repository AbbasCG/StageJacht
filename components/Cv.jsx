"use client";
import { useEffect, useRef, useState } from "react";
import { api, linesOf } from "@/lib/ui";

const LEEG = { profiel: "", opleidingen: [], werk: [], vaardigheden: "", talen: "", hobbys: "" };

function cvInfo(cv) {
  const L = [];
  (cv.opleidingen || []).forEach((o) => (o.opleiding || o.school) && L.push(`- Opleiding: ${[o.opleiding, o.school, o.periode].filter(Boolean).join(", ")}`));
  (cv.werk || []).forEach((w) => (w.functie || w.bedrijf) && L.push(`- Werk: ${[w.functie, w.bedrijf, w.periode].filter(Boolean).join(", ")}${w.taken ? " (" + w.taken + ")" : ""}`));
  if (linesOf(cv.vaardigheden).length) L.push(`- Vaardigheden: ${linesOf(cv.vaardigheden).join(", ")}`);
  if (linesOf(cv.talen).length) L.push(`- Talen: ${linesOf(cv.talen).join(", ")}`);
  if (cv.hobbys) L.push(`- Hobby's: ${cv.hobbys}`);
  if (cv.profiel) L.push(`- Profiel: ${cv.profiel}`);
  return L.join("\n");
}

export default function Cv({ dbc, user, profile, toast, loadProfile, loadUsage, go }) {
  const [cv, setCv] = useState({ ...LEEG, ...(profile?.cv || {}) });
  const [advies, setAdvies] = useState(profile?.cv_advies || null);
  const [opgeslagen, setOpgeslagen] = useState("");
  const [bezig, setBezig] = useState("");
  const [over, setOver] = useState(false);
  const fileRef = useRef(null);

  useEffect(() => { setCv({ ...LEEG, ...(profile?.cv || {}) }); setAdvies(profile?.cv_advies || null); }, [profile?.cv, profile?.cv_advies]);

  const wijzig = (next) => { setCv(next); setOpgeslagen("Niet opgeslagen"); };
  const setVeld = (k) => (e) => wijzig({ ...cv, [k]: e.target.value });
  const setRij = (lijst, i, k) => (e) => { const arr = cv[lijst].map((x) => ({ ...x })); arr[i][k] = e.target.value; wijzig({ ...cv, [lijst]: arr }); };
  const voegToe = (lijst, leeg) => wijzig({ ...cv, [lijst]: [...(cv[lijst] || []), leeg] });
  const haalWeg = (lijst, i) => wijzig({ ...cv, [lijst]: cv[lijst].filter((_, j) => j !== i) });

  async function opslaan(stil) {
    const { error } = await dbc.from("profiles").update({ cv, cvinfo: cvInfo(cv) }).eq("id", user.id);
    if (error) { toast("Opslaan lukte niet"); return false; }
    setOpgeslagen("Opgeslagen"); if (!stil) toast("Cv opgeslagen");
    loadProfile();
    return true;
  }

  async function upload(file, verwerk = true) {
    if (!file) return;
    if (!/\.(pdf|docx)$/i.test(file.name)) { toast("Kies een PDF- of Word-bestand (.pdf of .docx)"); return; }
    if (file.size > 3 * 1024 * 1024) { toast("Je cv is te groot (max 3 MB)"); return; }
    setBezig(verwerk ? "Je cv wordt opgeslagen en gelezen…" : "Je cv wordt opgeslagen…");
    try {
      const form = new FormData();
      form.append("bestand", file);
      const out = await api("/api/cv/upload" + (verwerk ? "" : "?verwerk=0"), form);
      if (out.cv) { setCv({ ...LEEG, ...out.cv }); toast("Je cv staat in de editor. Laat de AI hem nu beoordelen!"); }
      else toast(out.melding || "Cv opgeslagen");
      await loadProfile(); loadUsage();
    } catch (e) { toast(e.message); } finally { setBezig(""); if (fileRef.current) fileRef.current.value = ""; }
  }

  async function verwijderBestand() {
    try { await api("/api/cv/upload", undefined, { method: "DELETE" }); toast("Cv-bestand verwijderd"); loadProfile(); } catch (e) { toast(e.message); }
  }

  async function beoordeel() {
    if (opgeslagen === "Niet opgeslagen" && !(await opslaan(true))) return;
    setBezig("De AI leest je cv…");
    try {
      const out = await api("/api/cv/advies", { soort: "advies" });
      setAdvies(out.advies); loadUsage(); loadProfile();
    } catch (e) { toast(e.message); if (e.code === "limiet") go("profiel"); } finally { setBezig(""); }
  }

  async function verbeterProfiel() {
    if (opgeslagen === "Niet opgeslagen" && !(await opslaan(true))) return;
    setBezig("De AI schrijft een nieuwe profieltekst…");
    try {
      const out = await api("/api/cv/advies", { soort: "profieltekst" });
      wijzig({ ...cv, profiel: out.tekst }); loadUsage();
      toast("Nieuwe profieltekst staat klaar. Lees hem en tik op Opslaan.");
    } catch (e) { toast(e.message); } finally { setBezig(""); }
  }

  async function maakPdf() {
    const { jsPDF } = await import("jspdf");
    const p = profile || {};
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const W = 210, M = 18; let y = 22;
    const blue = [31, 95, 191], ink = [27, 36, 48], grey = [74, 88, 104];
    const ensure = (h) => { if (y + h > 280) { doc.addPage(); y = 20; } };
    doc.setFont("helvetica", "bold"); doc.setFontSize(22); doc.setTextColor(...ink); doc.text(p.naam || "", M, y); y += 7;
    doc.setFont("helvetica", "normal"); doc.setFontSize(10); doc.setTextColor(...grey); doc.text([p.woonplaats, p.telefoon, p.email].filter(Boolean).join("  ·  "), M, y); y += 9;
    const head = (t) => { ensure(14); doc.setFont("helvetica", "bold"); doc.setFontSize(10); doc.setTextColor(...blue); doc.text(t.toUpperCase(), M, y); y += 1.8; doc.setDrawColor(223, 229, 236); doc.line(M, y, W - M, y); y += 5; };
    const para = (t, x = M, w = W - 2 * M) => { doc.setFont("helvetica", "normal"); doc.setFontSize(10.5); doc.setTextColor(...ink); doc.splitTextToSize(t, w).forEach((l) => { ensure(5); doc.text(l, x, y); y += 4.8; }); };
    const entry = (per, titel, sub) => {
      ensure(12); doc.setFontSize(10); doc.setFont("helvetica", "normal"); doc.setTextColor(...grey); doc.text(per || "", M, y);
      doc.setFont("helvetica", "bold"); doc.setTextColor(...ink);
      doc.splitTextToSize(titel || "", W - 2 * M - 34).forEach((l, i) => { if (i) { y += 4.8; ensure(5); } doc.text(l, M + 34, y); });
      y += 4.8; if (sub) para(sub, M + 34, W - 2 * M - 34); y += 2;
    };
    if (cv.profiel) { head("Profiel"); para(cv.profiel); y += 3; }
    const opl = (cv.opleidingen || []).filter((o) => o.opleiding || o.school);
    if (opl.length) { head("Opleiding"); opl.forEach((o) => entry(o.periode, o.opleiding, o.school)); y += 1; }
    const wk = (cv.werk || []).filter((w) => w.functie || w.bedrijf);
    if (wk.length) { head("Werkervaring"); wk.forEach((w) => entry(w.periode, [w.functie, w.bedrijf].filter(Boolean).join(" – "), w.taken)); y += 1; }
    if (linesOf(cv.vaardigheden).length) { head("Vaardigheden"); para(linesOf(cv.vaardigheden).join("  ·  ")); y += 3; }
    if (linesOf(cv.talen).length) { head("Talen"); para(linesOf(cv.talen).join("  ·  ")); y += 3; }
    if (cv.hobbys) { head("Hobby's"); para(cv.hobbys); }
    return doc.output("blob");
  }
  const bestandsnaam = () => "CV " + ((profile?.naam) || "stage").replace(/[^\w\- ]+/g, "").trim() + ".pdf";

  async function download() {
    const blob = await maakPdf();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = bestandsnaam(); document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }
  async function gebruikVoorMails() {
    await opslaan(true);
    const blob = await maakPdf();
    await upload(new File([blob], bestandsnaam(), { type: "application/pdf" }), false);
  }

  const kleur = advies?.cijfer >= 8 ? "var(--s-yes)" : advies?.cijfer >= 6 ? "var(--s-talk)" : "var(--s-no)";
  const p = profile || {};

  return (
    <section className="view">
      <div>
        <h1>Mijn cv</h1>
        <p className="sub">Upload je cv, laat de AI hem beoordelen en pas hem hier aan. Je nieuwe cv kun je downloaden en meesturen met je mails.</p>
      </div>
      {bezig && <div className="loading"><span className="spin" /><span>{bezig}</span></div>}

      <div className="box">
        <h2>1. Je cv</h2>
        {p.cv_bestand ? (
          <div className="cvfile"><span>Cv voor je mails: <b>{p.cv_bestandsnaam}</b></span><button className="btn ghost small" type="button" onClick={verwijderBestand}>Verwijderen</button></div>
        ) : <p className="note">Nog geen cv-bestand. Upload je cv, of vul de editor in en tik op "Gebruik dit cv voor mijn mails".</p>}
        <label className={"drop" + (over ? " over" : "")}
          onDragOver={(e) => { e.preventDefault(); setOver(true); }} onDragEnter={(e) => { e.preventDefault(); setOver(true); }}
          onDragLeave={() => setOver(false)} onDrop={(e) => { e.preventDefault(); setOver(false); upload(e.dataTransfer?.files?.[0]); }}>
          <input ref={fileRef} type="file" accept="application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,.pdf,.docx" onChange={(e) => upload(e.target.files?.[0])} />
          <span className="up"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 15V4" /><path d="m7.5 8.5 4.5-4.5 4.5 4.5" /><path d="M5 14.5v3a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-3" /></svg></span>
          <b>{over ? "Laat los om te uploaden" : "Tik om je cv te kiezen"}</b>
          <span className="note">PDF of Word, max 3 MB. Op de computer kun je het bestand ook hierheen slepen.</span>
          <span className="btn small">Bestand kiezen</span>
        </label>
      </div>

      <div className="box">
        <div className="checkbar"><h2>2. Advies over je cv</h2><button className="btn small" type="button" onClick={beoordeel} disabled={!!bezig}>Laat AI mijn cv beoordelen</button></div>
        {!advies ? <p className="note">Je krijgt een cijfer, wat al goed is en wat beter kan, met voorbeelden die je direct kunt overnemen.</p> : (
          <>
            <div className="score" style={{ "--c": kleur }}><b>{advies.cijfer ?? "?"}</b><span>{advies.oordeel}<br />Beoordeeld op {advies.datum}</span></div>
            {advies.sterk?.length > 0 && <div><h2 style={{ fontSize: "1rem", marginBottom: 6 }}>Wat al goed is</h2><ul className="adv-list">{advies.sterk.map((x, i) => <li key={i} style={{ "--c": "var(--s-yes)" }}>{x}</li>)}</ul></div>}
            {advies.verbeteren?.length > 0 && <div><h2 style={{ fontSize: "1rem", marginBottom: 6 }}>Wat beter kan</h2><ul className="adv-list">{advies.verbeteren.map((x, i) => <li key={i} style={{ "--c": "var(--due)" }}><b>{x.punt}</b>{x.waarom && <span>{x.waarom}</span>}{x.voorbeeld && <em>Voorbeeld: {x.voorbeeld}</em>}</li>)}</ul></div>}
            {advies.ontbreekt?.length > 0 && <div><h2 style={{ fontSize: "1rem", marginBottom: 6 }}>Wat nog ontbreekt</h2><ul className="adv-list">{advies.ontbreekt.map((x, i) => <li key={i} style={{ "--c": "var(--s-no)" }}>{x}</li>)}</ul></div>}
            {advies.profiel_voorstel && (
              <>
                <div className="advice"><b>Voorstel voor je profieltekst</b>{advies.profiel_voorstel}</div>
                <div className="actions"><button className="btn small" type="button" onClick={() => { wijzig({ ...cv, profiel: advies.profiel_voorstel }); toast("Overgenomen. Vergeet niet op Opslaan te tikken."); }}>Neem deze profieltekst over</button></div>
              </>
            )}
          </>
        )}
      </div>

      <div className="cv-grid">
        <form className="box" onSubmit={(e) => { e.preventDefault(); opslaan(false); }}>
          <div className="checkbar"><h2>3. Cv aanpassen</h2><span className="note">{opgeslagen}</span></div>
          <p className="note">Naam, telefoon, e-mail en woonplaats komen uit je profiel.</p>
          <label className="q"><span>Profieltekst <em>(3-4 zinnen over wie je bent en wat je zoekt)</em></span><textarea value={cv.profiel} onChange={setVeld("profiel")} placeholder="Bijv. Gemotiveerde mbo-student die op zoek is naar een stage waar ik veel kan leren over …" /></label>
          <div className="actions"><button className="btn ghost small" type="button" onClick={verbeterProfiel} disabled={!!bezig}>Laat AI mijn profieltekst verbeteren</button></div>

          <div className="q"><span>Opleidingen</span></div>
          <div className="rep">
            {(cv.opleidingen || []).length ? cv.opleidingen.map((o, i) => (
              <div className="rep-item" key={i}>
                <div className="rep-head"><span>Opleiding {i + 1}</span><button className="btn ghost small" type="button" onClick={() => haalWeg("opleidingen", i)}>Verwijderen</button></div>
                <div className="grid2">
                  <label className="q"><span>Periode</span><input value={o.periode || ""} onChange={setRij("opleidingen", i, "periode")} placeholder="2023 – nu" /></label>
                  <label className="q"><span>Opleiding</span><input value={o.opleiding || ""} onChange={setRij("opleidingen", i, "opleiding")} placeholder="Naam opleiding + niveau" /></label>
                  <label className="q"><span>School</span><input value={o.school || ""} onChange={setRij("opleidingen", i, "school")} placeholder="Naam school" /></label>
                </div>
              </div>
            )) : <p className="note">Nog niets toegevoegd.</p>}
          </div>
          <div className="actions"><button className="btn ghost small" type="button" onClick={() => voegToe("opleidingen", { periode: "", opleiding: "", school: "" })}>+ Opleiding toevoegen</button></div>

          <div className="q"><span>Werkervaring en bijbanen</span></div>
          <div className="rep">
            {(cv.werk || []).length ? cv.werk.map((w, i) => (
              <div className="rep-item" key={i}>
                <div className="rep-head"><span>Werk {i + 1}</span><button className="btn ghost small" type="button" onClick={() => haalWeg("werk", i)}>Verwijderen</button></div>
                <div className="grid2">
                  <label className="q"><span>Periode</span><input value={w.periode || ""} onChange={setRij("werk", i, "periode")} placeholder="2024 – nu" /></label>
                  <label className="q"><span>Functie</span><input value={w.functie || ""} onChange={setRij("werk", i, "functie")} placeholder="Bijv. vakkenvuller" /></label>
                  <label className="q"><span>Bedrijf</span><input value={w.bedrijf || ""} onChange={setRij("werk", i, "bedrijf")} placeholder="Naam bedrijf" /></label>
                  <label className="q"><span>Wat deed je?</span><input value={w.taken || ""} onChange={setRij("werk", i, "taken")} placeholder="Bijv. klanten helpen en kassa" /></label>
                </div>
              </div>
            )) : <p className="note">Nog niets toegevoegd.</p>}
          </div>
          <div className="actions"><button className="btn ghost small" type="button" onClick={() => voegToe("werk", { periode: "", functie: "", bedrijf: "", taken: "" })}>+ Werkervaring toevoegen</button></div>

          <label className="q"><span>Vaardigheden <em>(één per regel)</em></span><textarea value={cv.vaardigheden} onChange={setVeld("vaardigheden")} placeholder={"Bijv.\nWindows en Office\nKlantvriendelijk"} /></label>
          <div className="grid2">
            <label className="q"><span>Talen <em>(één per regel)</em></span><textarea style={{ minHeight: 70 }} value={cv.talen} onChange={setVeld("talen")} placeholder={"Nederlands – moedertaal\nEngels – goed"} /></label>
            <label className="q"><span>Hobby's</span><textarea style={{ minHeight: 70 }} value={cv.hobbys} onChange={setVeld("hobbys")} placeholder="Bijv. gamen, voetbal" /></label>
          </div>
          <div className="actions">
            <button className="btn" type="submit">Opslaan</button>
            <button className="btn ghost" type="button" onClick={download}>Download als PDF</button>
            <button className="btn ghost" type="button" onClick={gebruikVoorMails} disabled={!!bezig}>Gebruik dit cv voor mijn mails</button>
          </div>
        </form>

        <div className="cv-preview-wrap">
          <div className="box">
            <h2>Voorbeeld</h2>
            <div className="cv-paper">
              <div><h3>{p.naam || "Je naam"}</h3><div className="contact">{[p.woonplaats, p.telefoon, p.email].filter(Boolean).join(" · ") || "Woonplaats · telefoon · e-mail"}</div></div>
              {cv.profiel && <div><h4>Profiel</h4><p>{cv.profiel}</p></div>}
              {(cv.opleidingen || []).some((o) => o.opleiding || o.school) && <div><h4>Opleiding</h4>{cv.opleidingen.filter((o) => o.opleiding || o.school).map((o, i) => <div className="item" key={i}><span className="per">{o.periode}</span><span><b>{o.opleiding}</b>{o.school}</span></div>)}</div>}
              {(cv.werk || []).some((w) => w.functie || w.bedrijf) && <div><h4>Werkervaring</h4>{cv.werk.filter((w) => w.functie || w.bedrijf).map((w, i) => <div className="item" key={i}><span className="per">{w.periode}</span><span><b>{w.functie}{w.bedrijf ? " – " + w.bedrijf : ""}</b>{w.taken}</span></div>)}</div>}
              {linesOf(cv.vaardigheden).length > 0 && <div><h4>Vaardigheden</h4><p>{linesOf(cv.vaardigheden).join(" · ")}</p></div>}
              {linesOf(cv.talen).length > 0 && <div><h4>Talen</h4><p>{linesOf(cv.talen).join(" · ")}</p></div>}
              {cv.hobbys && <div><h4>Hobby&apos;s</h4><p>{cv.hobbys}</p></div>}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
