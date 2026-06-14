"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useUser } from "@/hooks/useUser";

const NAV_LINKS = [
  { label: "Accueil",    href: "#accueil" },
  { label: "À propos",   href: "#apropos" },
  { label: "Sermons",    href: "#sermons" },
  { label: "Événements", href: "#evenements" },
  { label: "Équipe",     href: "#equipe" },
  { label: "Donner",     href: "#dons" },
  { label: "Contact",    href: "#contact" },
];

const ROLE_BADGE: Record<string, { label: string; cls: string }> = {
  admin:    { label: "👑 Admin",    cls: "bg-red-100 border-red-300 text-red-700" },
  pasteur:  { label: "✝️ Pasteur",  cls: "bg-purple-100 border-purple-300 text-purple-700" },
  membre:   { label: "✅ Membre",   cls: "bg-green-100 border-green-300 text-green-700" },
  visiteur: { label: "⏳ Visiteur", cls: "bg-amber-100 border-amber-300 text-amber-700" },
};

export default function Header() {
  const [scrolled,       setScrolled]       = useState(false);
  const [menuOpen,       setMenuOpen]       = useState(false);
  const [bannerVisible,  setBannerVisible]  = useState(true);
  const [userMenuOpen,   setUserMenuOpen]   = useState(false);
  const { user, profile, loading, signOut, displayName } = useUser();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Fermer le menu utilisateur au clic extérieur
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

  const role   = profile?.role ?? "visiteur";
  const badge  = ROLE_BADGE[role];

  return (
    <>
      {/* ── Countdown banner ── */}
      {bannerVisible && (
        <div className="bg-arc-red flex items-center justify-center gap-4 px-6 py-[10px] cursor-pointer relative z-50 hover:bg-red-700 transition-colors">
          <div className="flex items-center gap-2.5 text-white text-xs font-bold">
            <span className="w-[7px] h-[7px] bg-white rounded-full animate-blink" />
            <span>PROCHAIN CULTE DIRECT :</span>
            <span className="bg-white/20 rounded-[6px] px-2 py-[3px] font-black tracking-widest text-white text-xs min-w-[36px] text-center">Dim</span>
            <span className="text-white/70">09h30 →</span>
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); setBannerVisible(false); }}
            className="absolute right-4 text-white/60 hover:text-white text-lg px-2 py-1 transition-colors"
            aria-label="Fermer"
          >×</button>
        </div>
      )}

      {/* ── Nav ── */}
      <nav className={`sticky top-0 z-40 transition-all duration-300 ${scrolled ? "shadow-arc" : ""}`}>
        <div
          className="border-b border-arc-border"
          style={{ background: "rgba(255,255,255,0.96)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)" }}
        >
          <div className="max-w-8xl mx-auto px-5 md:px-10 h-[72px] flex items-center gap-6">

            {/* Logo */}
            <button onClick={() => scrollTo("accueil")} className="flex items-center gap-[11px] flex-shrink-0" aria-label="ARC — Accueil">
              <div className="w-[42px] h-[42px] rounded-xl bg-gradient-to-br from-arc-navy to-arc-blue flex items-center justify-center">
                <span className="font-serif text-base font-bold text-white tracking-widest">ARC</span>
              </div>
              <div>
                <div className="font-serif text-xl font-bold text-arc-navy tracking-[3px]">ARC</div>
                <div className="text-[8px] text-arc-blue tracking-[1.5px] uppercase font-medium">Ambassade du Royaume</div>
              </div>
            </button>

            {/* Desktop menu */}
            <ul className="hidden md:flex flex-1 items-center justify-center gap-1 list-none">
              {NAV_LINKS.map((link) => (
                <li key={link.href}>
                  <button
                    onClick={() => scrollTo(link.href)}
                    className="text-[13px] font-medium text-arc-text2 px-[14px] py-2 rounded-lg hover:text-arc-navy hover:bg-arc-blueBg transition-all duration-200"
                  >
                    {link.label}
                  </button>
                </li>
              ))}
              {user && (
                <li>
                  <Link
                    href="/espace-membres"
                    className="text-[13px] font-semibold text-arc-green px-[14px] py-2 rounded-lg hover:bg-green-50 transition-all duration-200"
                  >
                    ＋ Mon espace
                  </Link>
                </li>
              )}
            </ul>

            {/* CTAs */}
            <div className="hidden md:flex items-center gap-2.5 flex-shrink-0">
              <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-full px-3.5 py-[6px] text-xs font-semibold text-arc-green cursor-default">
                <span className="w-[7px] h-[7px] bg-arc-green rounded-full animate-blink" />
                18 en ligne
              </div>

              {!loading && !user && (
                <>
                  <Link
                    href="/connexion"
                    className="text-[13px] font-semibold px-5 py-[9px] rounded-[9px] border-[1.5px] border-arc-navy/25 text-arc-navy hover:bg-arc-blueBg hover:border-arc-navy transition-all duration-200"
                  >
                    Se connecter
                  </Link>
                  <Link
                    href="/inscription"
                    className="text-[13px] font-semibold px-5 py-[9px] rounded-[9px] bg-arc-navy text-white hover:bg-arc-navy2 hover:-translate-y-px shadow-sm transition-all duration-200"
                  >
                    Rejoindre →
                  </Link>
                </>
              )}

              {!loading && user && (
                <div className="relative" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => setUserMenuOpen((v) => !v)}
                    className={`flex items-center gap-2 px-3.5 py-[7px] rounded-[9px] border text-xs font-bold transition-all duration-200 ${badge.cls}`}
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
                        🏠 Mon espace membres
                      </Link>
                      {role === "admin" && (
                        <Link href="/admin" className="flex items-center gap-2.5 px-4 py-3 text-sm text-arc-text2 hover:bg-arc-bg hover:text-arc-navy transition-colors">
                          ⚙️ Administration
                        </Link>
                      )}
                      <button
                        onClick={signOut}
                        className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-arc-red hover:bg-red-50 transition-colors border-t border-arc-border"
                      >
                        🚪 Se déconnecter
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Hamburger */}
            <button
              className="md:hidden flex flex-col gap-[5px] p-2 ml-auto"
              onClick={() => setMenuOpen((v) => !v)}
              aria-label={menuOpen ? "Fermer" : "Menu"}
            >
              <span className={`w-[22px] h-[2px] bg-arc-navy rounded-sm transition-all duration-300 ${menuOpen ? "rotate-45 translate-y-[7px]" : ""}`} />
              <span className={`w-[22px] h-[2px] bg-arc-navy rounded-sm transition-all duration-300 ${menuOpen ? "opacity-0" : ""}`} />
              <span className={`w-[22px] h-[2px] bg-arc-navy rounded-sm transition-all duration-300 ${menuOpen ? "-rotate-45 -translate-y-[7px]" : ""}`} />
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="md:hidden absolute top-full left-0 right-0 bg-white border-b border-arc-border shadow-arc px-6 py-4 z-30">
            {NAV_LINKS.map((link) => (
              <button key={link.href} onClick={() => scrollTo(link.href)} className="block w-full text-left py-3 px-1 text-[15px] font-medium text-arc-text2 border-b border-arc-border last:border-b-0 hover:text-arc-navy transition-colors">
                {link.label}
              </button>
            ))}
            <div className="pt-4 flex flex-col gap-2">
              {user ? (
                <>
                  <Link href="/espace-membres" className="w-full py-3 rounded-[9px] bg-arc-green text-white text-[14px] font-semibold text-center hover:opacity-90 transition-opacity">
                    🏠 Mon espace membres
                  </Link>
                  <button onClick={signOut} className="w-full py-3 rounded-[9px] border border-arc-red text-arc-red text-[14px] font-semibold hover:bg-red-50 transition-colors">
                    Déconnexion
                  </button>
                </>
              ) : (
                <>
                  <Link href="/connexion" className="w-full py-3 rounded-[9px] border-[1.5px] border-arc-navy/25 text-arc-navy text-[14px] font-semibold text-center hover:bg-arc-blueBg transition-colors">
                    Se connecter
                  </Link>
                  <Link href="/inscription" className="w-full py-3 rounded-[9px] bg-arc-navy text-white text-[14px] font-semibold text-center hover:bg-arc-navy2 transition-colors">
                    Rejoindre →
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </nav>
    </>
  );
}
