"use client";
import { useEffect } from "react";

// Registreert de service worker zodat Stagejacht als app op het beginscherm kan.
export default function PwaRegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);
  return null;
}
