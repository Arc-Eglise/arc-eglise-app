"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { translate, DICTIONARIES, type Locale } from "./dictionary";

const STORAGE_KEY = "arc_ui_locale";

type Ctx = { locale: Locale; setLocale: (l: Locale) => void; t: (key: string) => string };
const I18nContext = createContext<Ctx>({ locale: "fr", setLocale: () => {}, t: (k) => k });

function readInitial(): Locale {
  if (typeof window === "undefined") return "fr";
  const v = window.localStorage.getItem(STORAGE_KEY);
  return v && v in DICTIONARIES ? (v as Locale) : "fr";
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("fr");

  // Applique la préférence stockée après hydratation (évite un mismatch SSR).
  useEffect(() => { setLocaleState(readInitial()); }, []);

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    try { window.localStorage.setItem(STORAGE_KEY, l); } catch { /* ignore */ }
    if (typeof document !== "undefined") document.documentElement.lang = l;
  }, []);

  const t = useCallback((key: string) => translate(locale, key), [locale]);

  return <I18nContext.Provider value={{ locale, setLocale, t }}>{children}</I18nContext.Provider>;
}

export function useI18n() { return useContext(I18nContext); }

/** Écrit la préférence de langue dans localStorage (pour appliquer instantanément
 *  au prochain chargement, en complément de la persistance serveur). */
export function persistLocale(l: Locale) {
  try { window.localStorage.setItem(STORAGE_KEY, l); } catch { /* ignore */ }
}
