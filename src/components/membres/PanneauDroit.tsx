"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type OnlineMember = {
  userId: string;
  name: string;
  initiale: string;
};

type Evt = {
  id: string;
  title: string;
  date: string;
  time_start: string | null;
};

const QUICK_LINKS = [
  { href: "/espace-membres/priere",      icon: "🙏", label: "Mur de prière" },
  { href: "/espace-membres/agenda",      icon: "📅", label: "Agenda" },
  { href: "/espace-membres/ai-biblique", icon: "✦",  label: "ARC Église AI" },
  { href: "/espace-membres/profil",      icon: "👤", label: "Mon profil" },
];

export default function PanneauDroit({
  userId,
  userName,
  events,
}: {
  userId: string;
  userName: string;
  events: Evt[];
}) {
  const [online, setOnline] = useState<OnlineMember[]>([]);
  const supabase = createClient();

  useEffect(() => {
    const initiale = userName.charAt(0).toUpperCase();
    const ch = supabase
      .channel("em-presence", { config: { presence: { key: userId } } })
      .on("presence", { event: "sync" }, () => {
        const state = ch.presenceState<{ name: string; initiale: string }>();
        setOnline(
          Object.entries(state).map(([uid, arr]) => ({
            userId: uid,
            name: arr[0].name,
            initiale: arr[0].initiale,
          }))
        );
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await ch.track({ name: userName, initiale });
        }
      });

    return () => { supabase.removeChannel(ch); };
  }, [userId, userName]); // eslint-disable-line react-hooks/exhaustive-deps

  const upcoming = events.slice(0, 3);

  return (
    <aside
      className="em-panneau-droit"
      style={{
        width: 220, flexShrink: 0,
        borderLeft: "1.5px solid rgba(30,36,100,.1)",
        display: "flex", flexDirection: "column",
        background: "#f8f9ff", overflowY: "auto",
      }}
    >
      {/* Membres en ligne */}
      <section style={{ padding: "16px 14px 12px" }}>
        <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".1em", color: "#8890aa", marginBottom: 10 }}>
          En ligne — {online.length}
        </div>
        {online.length === 0 ? (
          <span style={{ fontSize: 12, color: "#8890aa" }}>Aucun membre actif</span>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
            {online.map(m => (
              <div key={m.userId} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ position: "relative", flexShrink: 0 }}>
                  <div style={{
                    width: 27, height: 27, borderRadius: "50%",
                    background: "linear-gradient(135deg,#1E2464,#8899CC)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    color: "#fff", fontSize: 11, fontWeight: 700,
                  }}>{m.initiale}</div>
                  <span style={{
                    position: "absolute", bottom: 0, right: 0,
                    width: 7, height: 7, borderRadius: "50%",
                    background: "#22c55e", border: "1.5px solid #f8f9ff",
                  }} />
                </div>
                <span style={{
                  fontSize: 12, color: "#2d3580", fontWeight: 500,
                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                }}>
                  {m.userId === userId ? `${m.name} (vous)` : m.name}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      <div style={{ height: 1, background: "rgba(30,36,100,.08)", margin: "0 14px" }} />

      {/* Prochains événements */}
      <section style={{ padding: "14px 14px 12px" }}>
        <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".1em", color: "#8890aa", marginBottom: 10 }}>
          Prochains événements
        </div>
        {upcoming.length === 0 ? (
          <span style={{ fontSize: 12, color: "#8890aa" }}>Aucun événement</span>
        ) : (
          <>
            {upcoming.map(ev => {
              const d = new Date(ev.date + "T00:00:00");
              return (
                <a key={ev.id} href="/espace-membres/agenda" style={{ display: "block", marginBottom: 10, textDecoration: "none" }}>
                  <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                    <div style={{
                      flexShrink: 0, background: "#1E2464", color: "#fff",
                      borderRadius: 7, padding: "3px 6px", textAlign: "center", minWidth: 32,
                    }}>
                      <div style={{ fontSize: 13, fontWeight: 700, lineHeight: 1 }}>{d.getDate()}</div>
                      <div style={{ fontSize: 8, textTransform: "uppercase", letterSpacing: ".04em" }}>
                        {d.toLocaleDateString("fr-CH", { month: "short" })}
                      </div>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: "#1a1d3a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {ev.title}
                      </div>
                      {ev.time_start && (
                        <div style={{ fontSize: 11, color: "#8890aa" }}>
                          {ev.time_start.slice(0, 5)}
                        </div>
                      )}
                    </div>
                  </div>
                </a>
              );
            })}
            <a href="/espace-membres/agenda" style={{ fontSize: 11, color: "#8899cc", textDecoration: "none", display: "block" }}>
              Voir l'agenda →
            </a>
          </>
        )}
      </section>

      <div style={{ height: 1, background: "rgba(30,36,100,.08)", margin: "0 14px" }} />

      {/* Accès rapide */}
      <section style={{ padding: "14px 14px 18px" }}>
        <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".1em", color: "#8890aa", marginBottom: 8 }}>
          Accès rapide
        </div>
        {QUICK_LINKS.map(item => (
          <a
            key={item.href}
            href={item.href}
            style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "6px 8px", borderRadius: 8, marginBottom: 1,
              textDecoration: "none", color: "#2d3580", fontSize: 12,
              transition: "background .15s",
            }}
            onMouseEnter={e => (e.currentTarget.style.background = "rgba(30,36,100,.07)")}
            onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
          >
            <span style={{ fontSize: 14, width: 18, textAlign: "center" }}>{item.icon}</span>
            {item.label}
          </a>
        ))}
      </section>
    </aside>
  );
}
