"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { dbBrowser } from "@/lib/client-db";
import { effectivePlan, huidigeMaand } from "@/lib/plans";
import Nav from "@/components/Nav";
import Onboarding from "@/components/Onboarding";
import Overzicht from "@/components/Overzicht";
import Bedrijven from "@/components/Bedrijven";
import BedrijfForm from "@/components/BedrijfForm";
import Vacatures from "@/components/Vacatures";
import Cv from "@/components/Cv";
import Profiel from "@/components/Profiel";
import Composer from "@/components/Composer";

const VIEWS = ["overzicht", "bedrijven", "vacatures", "cv", "toevoegen", "profiel"];

export default function Dashboard() {
  const dbc = dbBrowser();
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [bedrijven, setBedrijven] = useState([]);
  const [vacatures, setVacatures] = useState([]);
  const [usage, setUsage] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [view, setView] = useState("overzicht");
  const [editing, setEditing] = useState(null);
  const [groep, setGroep] = useState(null);
  const [composer, setComposer] = useState(null);
  const [toastText, setToastText] = useState("");
  const toastTimer = useRef();

  const toast = useCallback((t) => {
    setToastText(t);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastText(""), 3000);
  }, []);

  const loadProfile = useCallback(async () => {
    const { data } = await dbc.from("profiles").select("*").single();
    setProfile(data);
    return data;
  }, [dbc]);
  const loadBedrijven = useCallback(async () => {
    const { data } = await dbc.from("bedrijven").select("*").order("created_at", { ascending: true });
    setBedrijven(data || []);
  }, [dbc]);
  const loadVacatures = useCallback(async () => {
    const { data } = await dbc.from("vacatures").select("*").eq("verborgen", false).eq("toegevoegd", false).order("gevonden_at", { ascending: false });
    setVacatures(data || []);
  }, [dbc]);
  const loadUsage = useCallback(async () => {
    const { data } = await dbc.from("usage").select("ai_acties").eq("maand", huidigeMaand()).maybeSingle();
    setUsage(data?.ai_acties || 0);
  }, [dbc]);
  const reloadAll = useCallback(() => Promise.all([loadProfile(), loadBedrijven(), loadVacatures(), loadUsage()]), [loadProfile, loadBedrijven, loadVacatures, loadUsage]);

  useEffect(() => {
    (async () => {
      const { data } = await dbc.auth.getUser();
      if (!data.user) { window.location.href = "/login"; return; }
      setUser(data.user);
      await reloadAll();
      setLoaded(true);
      const q = new URLSearchParams(window.location.search);
      const g = q.get("gmail");
      if (g === "ok") toast("Gmail is verbonden");
      if (g === "geen-toegang") toast("Gmail kreeg geen toegang. Probeer het opnieuw en sta alles toe.");
      if (g === "fout") toast("Gmail verbinden lukte niet. Probeer het opnieuw.");
      if (q.get("betaling") === "terug") toast("Bedankt! Je abonnement wordt geactiveerd zodra de betaling binnen is.");
      if (g || q.get("betaling")) window.history.replaceState(null, "", window.location.pathname + window.location.hash);
      if (q.get("betaling")) setTimeout(loadProfile, 4000);
    })();
    // Gegevens verversen als je terugkomt naar de app
    const onFocus = () => { if (document.visibilityState === "visible") reloadAll(); };
    document.addEventListener("visibilitychange", onFocus);
    return () => document.removeEventListener("visibilitychange", onFocus);
  }, [dbc, reloadAll, toast, loadProfile]);

  useEffect(() => {
    const read = () => {
      const v = window.location.hash.slice(1);
      setView(VIEWS.includes(v) ? v : "overzicht");
      window.scrollTo(0, 0);
    };
    read();
    window.addEventListener("hashchange", read);
    return () => window.removeEventListener("hashchange", read);
  }, []);

  const go = (v) => { if (window.location.hash === "#" + v) setView(v); else window.location.hash = v; };
  const plan = effectivePlan(profile);
  const ctx = { groep, setGroep, dbc, user, profile, plan, usage, bedrijven, vacatures, toast, go, reloadAll, loadProfile, loadBedrijven, loadVacatures, loadUsage,
    openComposer: (c) => {
      if (!profile?.gmail_verbonden) { toast("Verbind eerst je Gmail bij Profiel"); go("profiel"); return; }
      setComposer(c);
    },
    edit: (b) => { setEditing(b); go("toevoegen"); },
  };

  if (!loaded) {
    return <main className="wrap"><div className="loading" style={{ justifyContent: "center", paddingTop: 80 }}><span className="spin" /><span>Stagejacht wordt geladen…</span></div></main>;
  }

  if (profile && !profile.onboarding_klaar) {
    return <Onboarding {...ctx} onKlaar={async () => { await loadProfile(); go("overzicht"); }} />;
  }

  const naam = profile?.naam || user?.user_metadata?.full_name || "";

  return (
    <>
      <div className="bar">
        <div className="bar-in">
          <a className="brand-wrap" href="#overzicht" aria-label="Stagejacht, naar het overzicht"><img className="logo" src="/logo.svg" alt="" width="38" height="38" /><div className="brand">Stagejacht<small>{naam ? `Ingelogd als ${naam}` : "Je stage-zoektocht op één plek"}</small></div></a>
          <Nav view={view} aantalBedrijven={bedrijven.length} aantalVacatures={vacatures.length} />
        </div>
      </div>
      <main className="wrap">
        {view === "overzicht" && <Overzicht {...ctx} />}
        {view === "bedrijven" && <Bedrijven {...ctx} />}
        {view === "vacatures" && <Vacatures {...ctx} />}
        {view === "cv" && <Cv {...ctx} />}
        {view === "toevoegen" && <BedrijfForm {...ctx} bedrijf={editing} onKlaar={() => { setEditing(null); go("bedrijven"); }} />}
        {view === "profiel" && <Profiel {...ctx} />}
      </main>
      {composer && <Composer {...ctx} {...composer} onClose={() => setComposer(null)} onSent={() => { setComposer(null); reloadAll(); toast("Verstuurd vanaf je Gmail"); }} />}
      <div className="toast" role="status" hidden={!toastText}>{toastText}</div>
    </>
  );
}
