"use client";

/**
 * Panneau de droite réutilisable (Communauté · Prochain culte · Accès rapide)
 * pour les sous-pages de l'espace membre qui ne l'ont pas nativement.
 * Reproduit le panneau `em-rp` de l'accueil, positionné en fixe à droite.
 * Masqué sous 1280px (comme l'original masqué sous 1200px).
 */

import { useEffect, useState } from "react";

interface Props {
  membresValides: number;
  visiteurs: number;
  totalUsers: number;
  prayerCount?: number;
}

const QUICK = [
  { ico: "🗒️", lbl: "Notes & Tâches", href: "/espace-membres/notes-taches" },
  { ico: "✅", lbl: "Mes tâches", href: "/espace-membres/notes-taches?tab=taches" },
  { ico: "🙏", lbl: "Mur de prière", href: "/espace-membres/priere" },
  { ico: "✉", lbl: "Nouveau message", href: "/espace-membres/messagerie" },
  { ico: "▶", lbl: "Streaming en direct", href: "/espace-membres/streaming" },
  { ico: "📅", lbl: "Voir l'agenda", href: "/espace-membres/agenda" },
];

function nextSundayCountdown() {
  const now = new Date();
  const target = new Date(now);
  const daysToSun = (7 - now.getDay()) % 7;
  target.setDate(now.getDate() + daysToSun);
  target.setHours(9, 30, 0, 0);
  if (target.getTime() <= now.getTime()) target.setDate(target.getDate() + 7);
  const diff = target.getTime() - now.getTime();
  const d = Math.floor(diff / 86400000);
  const h = Math.floor((diff % 86400000) / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  return { text: `${d}j ${h}h ${m}m ${s}s`, dateLabel: target.toLocaleDateString("fr-CH", { day: "numeric", month: "short" }) };
}

export default function MemberRightPanel({ membresValides, visiteurs, totalUsers, prayerCount = 0 }: Props) {
  // Placeholder stable au SSR (évite tout mismatch d'hydratation), calcul au montage.
  const [cd, setCd] = useState<{ text: string; dateLabel: string }>({ text: "—", dateLabel: "" });
  useEffect(() => {
    setCd(nextSundayCountdown());
    const id = setInterval(() => setCd(nextSundayCountdown()), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <aside className="hidden min-[1280px]:flex flex-col fixed right-0 top-0 h-screen w-[264px] bg-white border-l border-[#e6e9f4] overflow-y-auto z-30">
      {/* Communauté */}
      <div className="em-rp-sec">
        <div className="em-rp-title">Communauté</div>
        {[
          { lbl: "Membres validés", num: membresValides, color: "#276749" },
          { lbl: "Visiteurs inscrits", num: visiteurs, color: "#c05621" },
          { lbl: "Total utilisateurs", num: totalUsers, color: "#1e2464" },
        ].map(s => (
          <div key={s.lbl} className="flex items-center justify-between py-[7px]" style={{ borderBottom: "1px solid rgba(30,36,100,.06)" }}>
            <span style={{ fontSize: 12, color: "#5c6280" }}>{s.lbl}</span>
            <span style={{ fontSize: 14, fontWeight: 700, color: s.color }}>{s.num}</span>
          </div>
        ))}
        <div style={{ marginTop: 10, fontSize: 11, color: "#8b91b0" }}>
          {prayerCount > 0
            ? <><span className="em-dot-green" style={{ display: "inline-block", marginRight: 5, verticalAlign: "middle" }} />{prayerCount} prière{prayerCount > 1 ? "s" : ""} active{prayerCount > 1 ? "s" : ""}</>
            : "Aucune prière active"}
        </div>
      </div>

      {/* Prochain culte */}
      <div className="em-rp-sec">
        <div className="em-rp-title">Prochain culte</div>
        <div style={{ fontSize: 12, color: "#5c6280", marginBottom: 6 }}>Dimanche {cd.dateLabel} · 9h30</div>
        <div style={{ fontFamily: '"Playfair Display","Source Serif 4",Georgia,serif', fontSize: 18, fontWeight: 700, color: "#1e2464", lineHeight: 1.2 }}>{cd.text}</div>
        <div style={{ fontSize: 11, color: "#8b91b0", marginTop: 4 }}>📍 La Chaux-de-Fonds</div>
      </div>

      {/* Accès rapide */}
      <div className="em-rp-sec">
        <div className="em-rp-title">Accès rapide</div>
        {QUICK.map(q => (
          <a key={q.lbl} href={q.href} className="em-qa" style={{ textDecoration: "none" }}>
            <span className="em-qa-ico">{q.ico}</span> {q.lbl}
          </a>
        ))}
      </div>
    </aside>
  );
}
