"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

// Vaste knop onderin op de telefoon; verschijnt pas na de hero, zodat er niet twee knoppen tegelijk in beeld staan
export default function MobielCta() {
  const [zichtbaar, setZichtbaar] = useState(false);
  useEffect(() => {
    const hero = document.querySelector(".hero2");
    const slot = document.querySelector(".slot");
    if (!hero || typeof IntersectionObserver === "undefined") return;
    const zicht = new Map();
    const obs = new IntersectionObserver((items) => {
      items.forEach((i) => zicht.set(i.target, i.isIntersecting));
      setZichtbaar(!zicht.get(hero) && !zicht.get(slot));
    });
    obs.observe(hero);
    if (slot) obs.observe(slot);
    return () => obs.disconnect();
  }, []);
  return (
    <div className={"mobiel-cta" + (zichtbaar ? " aan" : "")} aria-hidden={!zichtbaar}>
      <Link href="/login" className="btn gold" tabIndex={zichtbaar ? 0 : -1}>Gratis beginnen</Link>
    </div>
  );
}
