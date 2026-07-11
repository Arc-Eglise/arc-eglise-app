"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { Home, Settings, LogOut } from "lucide-react";
import { useUser } from "@/hooks/useUser";
import { DONS_ENABLED } from "@/lib/features";

const NAV_LINKS_BASE = [
  { label: "Accueil",       href: "#accueil" },
  { label: "À propos",      href: "#apropos" },
  { label: "Sermons",       href: "#sermons" },
  { label: "Événements",    href: "#evenements" },
  { label: "Équipe",        href: "#equipe" },
  { label: "Témoignages",   href: "#temoignages" },
  { label: "Donner",        href: "#dons",   donOnly: true },
  { label: "Contact",       href: "#contact" },
];
const NAV_LINKS = NAV_LINKS_BASE.filter((l) => !l.donOnly || DONS_ENABLED);

const ROLE_BADGE: Record<string, { label: string; cls: string }> = {
  admin:    { label: "Admin",    cls: "bg-red-100 border-red-300 text-red-700" },
  pasteur:  { label: "Pasteur",  cls: "bg-purple-100 border-purple-300 text-purple-700" },
  membre:   { label: "Membre",   cls: "bg-green-100 border-green-300 text-green-700" },
  visiteur: { label: "Visiteur", cls: "bg-amber-100 border-amber-300 text-amber-700" },
};

export default function Header() {
  const [scrolled,     setScrolled]     = useState(false);
  const [menuOpen,     setMenuOpen]     = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const { user, profile, loading, signOut, displayName } = useUser();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!userMenuOpen) return;
    const close = () => setUserMenuOpen(false);
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, [userMenuOpen]);

  const scrollTo = (id: string) => {
    setMenuOpen(false);
    const el = document.getElementById(id.replace("#", ""));
    if (el) el.scrollIntoView({ behavior: "smooth" });
  };

  const role  = profile?.role ?? "visiteur";
  const badge = ROLE_BADGE[role];

  return (
    <header
      className={`sticky top-0 z-40 transition-all duration-300 ${scrolled ? "shadow-arc" : ""}`}
      style={{
        background: "rgba(250,247,240,.92)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        borderBottom: "1px solid rgba(30,36,100,.12)",
      }}
    >
      <nav className="max-w-8xl mx-auto px-5 md:px-8 h-[74px] flex items-center justify-between gap-6">

        {/* Logo */}
        <button onClick={() => scrollTo("accueil")} className="flex items-center gap-3 flex-shrink-0" aria-label="ARC — Accueil">
          <Image
            src="/images/logo-arc.jpeg"
            alt="ARC"
            width={78} height={48}
            style={{ objectFit: "contain", borderRadius: 6 }}
            priority
          />
          <span style={{ display: "flex", flexDirection: "column", lineHeight: 1.1 }}>
            <span className="font-serif font-semibold text-arc-navy" style={{ fontSize: 17, letterSpacing: ".01em", whiteSpace: "nowrap" }}>
              Ambassade du Royaume de Christ
            </span>
            <span style={{ fontSize: 10, letterSpacing: ".22em", textTransform: "uppercase", color: "#6b6f86" }}>
              La Chaux-de-Fonds
            </span>
          </span>
        </button>

        {/* Desktop nav */}
        <ul className="hidden md:flex flex-1 items-center justify-center gap-7 list-none">
          {NAV_LINKS.map((link) => (
            <li key={link.href}>
              <button
                onClick={() => scrollTo(link.href)}
                className="arc-link text-[14.5px] font-medium text-arc-ink hover:text-arc-navy transition-colors"
              >
                {link.label}
              </button>
            </li>
          ))}
          {user && (
            <li>
              <Link href="/espace-membres" className="arc-link text-[14.5px] font-semibold text-arc-green hover:text-green-700 transition-colors">
                + Mon espace
              </Link>
            </li>
          )}
        </ul>

        {/* Right CTAs */}
        <div className="hidden md:flex items-center gap-4 flex-shrink-0">
          {!loading && !user && (
            <>
              <Link
                href="/connexion"
                className="text-[14px] font-semibold text-arc-navy hover:text-arc-navy2 transition-colors"
              >
                Se connecter
              </Link>
              <Link
                href="/inscription"
                className="text-[14px] font-semibold text-white transition-all hover:-translate-y-px"
                style={{
                  background: "#1e2464",
                  padding: "11px 22px",
                  borderRadius: 999,
                  boxShadow: "0 8px 22px rgba(30,36,100,.28)",
                }}
              >
                Rejoindre →
              </Link>
            </>
          )}

          {!loading && user && (
            <>
              {DONS_ENABLED && (
                <Link
                  href="#dons"
                  className="text-[14px] font-semibold text-white"
                  style={{
                    background: "#1e2464",
                    padding: "11px 22px",
                    borderRadius: 999,
                    boxShadow: "0 8px 22px rgba(30,36,100,.28)",
                  }}
                  onClick={(e) => { e.preventDefault(); scrollTo("dons"); }}
                >
                  Donner
                </Link>
              )}
              <div className="relative" onClick={(e) => e.stopPropagation()}>
                <button
                  onClick={() => setUserMenuOpen((v) => !v)}
                  className={`flex items-center gap-2 px-3.5 py-[7px] rounded-full border text-xs font-bold transition-all duration-200 ${badge.cls}`}
                >
                  <span>{badge.label}</span>
                  <span className="opacity-60 text-[9px]">{displayName?.split(" ")[0]}</span>
                  <span className="opacity-50 text-[9px]">▼</span>
                </button>

                {userMenuOpen && (
                  <div className="absolute right-0 top-full mt-1.5 bg-white border border-arc-border rounded-xl shadow-arc min-w-[200px] overflow-hidden z-50">
                    <div className="px-4 py-3 border-b border-arc-border">
                      <div className="text-sm font-bold text-arc-navy">{displayName}</div>
                      <div className="text-[11px] text-arc-text3">{profile?.email}</div>
                    </div>
                    <Link href="/espace-membres" className="flex items-center gap-2.5 px-4 py-3 text-sm text-arc-text2 hover:bg-arc-bg hover:text-arc-navy transition-colors">
                      <Home size={14} />
                      Mon espace membres
                    </Link>
                    {role === "admin" && (
                      <Link href="/admin" className="flex items-center gap-2.5 px-4 py-3 text-sm text-arc-text2 hover:bg-arc-bg hover:text-arc-navy transition-colors">
                        <Settings size={14} />
                        Administration
                      </Link>
                    )}
                    <button
                      onClick={signOut}
                      className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-arc-red hover:bg-red-50 transition-colors border-t border-arc-border"
                    >
                      <LogOut size={14} />
                      Se déconnecter
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Hamburger */}
        <button
          className="md:hidden flex flex-col gap-[5px] p-2 ml-auto border rounded-[10px]"
          style={{ borderColor: "rgba(30,36,100,.12)", width: 42, height: 42, alignItems: "center", justifyContent: "center" }}
          onClick={() => setMenuOpen((v) => !v)}
          aria-label={menuOpen ? "Fermer" : "Menu"}
        >
          <span className={`block w-[18px] h-[1.5px] bg-arc-ink transition-all duration-300 ${menuOpen ? "rotate-45 translate-y-[6px]" : ""}`} />
          <span className={`block w-[18px] h-[1.5px] bg-arc-ink transition-all duration-300 ${menuOpen ? "opacity-0" : ""}`} />
          <span className={`block w-[18px] h-[1.5px] bg-arc-ink transition-all duration-300 ${menuOpen ? "-rotate-45 -translate-y-[6px]" : ""}`} />
        </button>
      </nav>

      {/* Mobile menu */}
      {menuOpen && (
        <div
          className="md:hidden px-8 py-2 pb-5 border-t"
          style={{ borderColor: "rgba(30,36,100,.12)", background: "rgba(250,247,240,.98)" }}
        >
          {NAV_LINKS.map((link) => (
            <button
              key={link.href}
              onClick={() => scrollTo(link.href)}
              className="block w-full text-left py-3 px-1 text-[16px] font-medium text-arc-ink border-b last:border-b-0 hover:text-arc-navy transition-colors"
              style={{ borderColor: "rgba(30,36,100,.12)" }}
            >
              {link.label}
            </button>
          ))}
          <div className="pt-4 flex flex-col gap-2">
            {user ? (
              <>
                <Link href="/espace-membres" className="w-full py-3 rounded-full bg-arc-navy text-white text-[14px] font-semibold text-center" style={{ boxShadow: "0 8px 22px rgba(30,36,100,.28)" }}>
                  Mon espace membres
                </Link>
                <button onClick={signOut} className="w-full py-3 rounded-full border border-arc-red text-arc-red text-[14px] font-semibold hover:bg-red-50 transition-colors">
                  Déconnexion
                </button>
              </>
            ) : (
              <>
                <Link href="/connexion" className="w-full py-3 rounded-full border-[1.5px] border-arc-navy/25 text-arc-navy text-[14px] font-semibold text-center hover:bg-arc-blueBg transition-colors">
                  Se connecter
                </Link>
                <Link href="/inscription" className="w-full py-3 rounded-full bg-arc-navy text-white text-[14px] font-semibold text-center" style={{ boxShadow: "0 8px 22px rgba(30,36,100,.28)" }}>
                  Rejoindre →
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
