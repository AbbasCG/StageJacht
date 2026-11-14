"use client";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function Login() {
  const [bezig, setBezig] = useState(false);
  const [fout, setFout] = useState("");
  const [akkoord, setAkkoord] = useState(false);
  const [mail, setMail] = useState("");
  const DEV = process.env.NEXT_PUBLIC_DEV_LOGIN === "1";

  useEffect(() => {
    const f = new URLSearchParams(window.location.search).get("fout");
    if (f === "google-niet-ingesteld") setFout("Google-inloggen is nog niet ingesteld. Zet GOOGLE_CLIENT_ID en GOOGLE_CLIENT_SECRET in .env.local, of gebruik de testlogin hieronder.");
    else if (f) setFout("Inloggen lukte niet. Probeer het opnieuw.");
  }, []);

  async function devLogin(e) {
    e.preventDefault();
    if (!akkoord) { setFout("Ga eerst akkoord met de voorwaarden en de privacyverklaring."); return; }
    const r = await fetch("/auth/dev", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email: mail }) });
    const j = await r.json().catch(() => ({}));
    if (j.ok) window.location.href = "/app"; else setFout(j.fout || "Testlogin lukte niet.");
  }

  async function login() {
    if (!akkoord) { setFout("Ga eerst akkoord met de voorwaarden en de privacyverklaring."); return; }
    setBezig(true); setFout("");
    window.location.href = "/auth/google";
  }

  return (
    <main className="login">
      <aside className="login-merk" aria-hidden="true">
        <img src="/logo.svg" alt="" width="64" height="64" style={{ borderRadius: 14 }} />
        <h2>Houd je stagezoektocht bij op één plek</h2>
        <ul>
          <li>Zie in één blik wie nog moet antwoorden</li>
          <li>Mails die bij jou passen, door jou gecontroleerd</li>
          <li>Advies bij elke reactie van een bedrijf</li>
        </ul>
      </aside>
      <div className="login-form">
      <div className="login-card">
        <Link href="/" style={{ color: "var(--ink)", textDecoration: "none", display: "flex", alignItems: "center", gap: 10, fontFamily: "var(--f-display)", fontWeight: 800, fontSize: "1.3rem" }}>
          <img src="/logo.svg" alt="" width="36" height="36" style={{ borderRadius: 9 }} />Stagejacht
        </Link>
        <h1>Inloggen of account maken</h1>
        <p className="sub">Log in met je Google-account. Bestaat je account nog niet, dan maken we hem meteen aan.</p>
        <label className="check" style={{ textAlign: "left" }}>
          <input type="checkbox" checked={akkoord} onChange={(e) => setAkkoord(e.target.checked)} />
          <span>Ik ga akkoord met de <Link href="/voorwaarden">voorwaarden</Link> en de <Link href="/privacy">privacyverklaring</Link>. Ben ik jonger dan 16, dan heb ik toestemming van mijn ouder.</span>
        </label>
        <button className="google-btn" type="button" onClick={login} disabled={bezig}>
          <svg viewBox="0 0 48 48" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>
          {bezig ? "Bezig…" : "Inloggen met Google"}
        </button>
        {DEV && (
          <form onSubmit={devLogin} className="box" style={{ gap: 8 }}>
            <b>Testlogin (alleen lokaal)</b>
            <input type="email" required placeholder="jij@example.com" value={mail} onChange={(e) => setMail(e.target.value)} />
            <button className="btn ghost small" type="submit">Inloggen zonder Google</button>
          </form>
        )}
        {fout && <p className="pin-err" role="alert">{fout}</p>}
        <p className="note">Je Gmail koppelen doe je later apart. Dat is nodig om mails te versturen en reacties te checken.</p>
      </div>
      </div>
    </main>
  );
}
