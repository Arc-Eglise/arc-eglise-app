"use client";

import { useState } from "react";
import Image from "next/image";
import type { Sermon } from "@/lib/supabase/types";

const FILTERS = ["Tout", "Série", "Évangélisation", "Prière", "Famille"];
const GRADIENT = ["from-arc-navy to-arc-blue", "from-[#2d3a8e] to-arc-navy", "from-arc-navy2 to-[#2d3a8e]"];

export default function SermonsClient({ sermons, dark = false }: { sermons: Sermon[]; dark?: boolean }) {
  const [activeFilter, setActiveFilter] = useState("Tout");

  const filtered =
    activeFilter === "Tout"
      ? sermons
      : activeFilter === "Série"
      ? sermons.filter((s) => s.series != null)
      : sermons.filter((s) =>
          s.series?.toLowerCase().includes(activeFilter.toLowerCase())
        );

  const featured = filtered.find((s) => s.is_featured) ?? filtered[0];
  const rest = filtered.filter((s) => s.id !== featured?.id).slice(0, 3);

  return (
    <>
      {/* Filtres */}
      <div className="flex flex-wrap gap-2.5 mb-8">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setActiveFilter(f)}
            style={{
              padding: "9px 18px",
              borderRadius: 999,
              fontSize: 13.5,
              fontWeight: 600,
              cursor: "pointer",
              border: `1px solid ${activeFilter === f ? "#C9A227" : dark ? "rgba(255,255,255,.16)" : "rgba(30,36,100,.15)"}`,
              background: activeFilter === f ? "#C9A227" : dark ? "rgba(255,255,255,.05)" : "transparent",
              color: activeFilter === f ? "#141738" : dark ? "rgba(255,255,255,.8)" : "#4a5070",
            }}
          >
            {f}
          </button>
        ))}
      </div>

      {featured ? (
        <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr 1fr", gap: 20 }} className="arc-sermon-grid">
          {/* Featured article */}
          <article
            style={{
              background: dark ? "rgba(255,255,255,.04)" : "#fff",
              border: `1px solid ${dark ? "rgba(255,255,255,.1)" : "rgba(30,36,100,.1)"}`,
              borderRadius: 20,
              overflow: "hidden",
            }}
          >
            <a
              href={featured.youtube_id ? `https://youtu.be/${featured.youtube_id}` : undefined}
              target={featured.youtube_id ? "_blank" : undefined}
              rel="noopener noreferrer"
              style={{ position: "relative", display: "block", height: 260, background: "linear-gradient(150deg,#2b327f,#141738)", cursor: "pointer" }}
            >
              {featured.youtube_id && (
                <Image
                  src={`https://img.youtube.com/vi/${featured.youtube_id}/hqdefault.jpg`}
                  alt={featured.title}
                  fill
                  sizes="(max-width:900px) 100vw, 50vw"
                  style={{ objectFit: "cover", opacity: 0.6 }}
                />
              )}
              <div style={{ position: "absolute", inset: 0, backgroundImage: "repeating-linear-gradient(135deg,rgba(255,255,255,.05) 0 2px,transparent 2px 22px)" }} />
              <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center" }}>
                <span style={{ width: 66, height: 66, borderRadius: "50%", background: "rgba(255,255,255,.16)", backdropFilter: "blur(6px)", display: "grid", placeItems: "center", fontSize: 24 }}>▶</span>
              </div>
              <div style={{ position: "absolute", top: 16, left: 16, background: "#C9A227", color: "#141738", fontSize: 11, fontWeight: 700, padding: "5px 12px", borderRadius: 999, letterSpacing: ".05em" }}>
                DERNIER MESSAGE
              </div>
            </a>
            <div style={{ padding: 24 }}>
              <div style={{ fontSize: 12, color: "#E6C763", fontWeight: 600, letterSpacing: ".05em" }}>
                {featured.series ? `SÉRIE · ${featured.series.toUpperCase()}` : "SERMON DU DIMANCHE"}
              </div>
              <h3 className="font-serif" style={{ fontSize: 28, fontWeight: 600, margin: "8px 0 6px", color: dark ? "#fff" : "#1e2464" }}>
                {featured.title}
              </h3>
              <p style={{ fontSize: 14, color: dark ? "rgba(255,255,255,.6)" : "#6b6f86", lineHeight: 1.6 }}>
                {featured.reference ? `${featured.reference} · ` : ""}{featured.pastor}
              </p>
              {featured.youtube_id && (
                <a
                  href={`https://youtu.be/${featured.youtube_id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ display: "inline-flex", alignItems: "center", gap: 8, marginTop: 16, background: "#C9A227", color: "#141738", padding: "10px 20px", borderRadius: 999, fontWeight: 700, fontSize: 13, textDecoration: "none" }}
                >
                  ▶ Regarder
                </a>
              )}
            </div>
          </article>

          {/* Secondary sermons */}
          {rest.slice(0, 2).map((s: Sermon) => (
            <article
              key={s.id}
              style={{
                background: dark ? "rgba(255,255,255,.04)" : "#fff",
                border: `1px solid ${dark ? "rgba(255,255,255,.1)" : "rgba(30,36,100,.1)"}`,
                borderRadius: 20,
                overflow: "hidden",
              }}
            >
              <a
                href={s.youtube_id ? `https://youtu.be/${s.youtube_id}` : undefined}
                target="_blank"
                rel="noopener noreferrer"
                style={{ position: "relative", display: "block", height: 148, background: "linear-gradient(150deg,#2b327f,#141738)", cursor: "pointer" }}
              >
                {s.youtube_id && (
                  <Image
                    src={`https://img.youtube.com/vi/${s.youtube_id}/mqdefault.jpg`}
                    alt={s.title}
                    fill
                    sizes="(max-width:900px) 100vw, 25vw"
                    style={{ objectFit: "cover", opacity: 0.65 }}
                  />
                )}
                <div style={{ position: "absolute", inset: 0, backgroundImage: "repeating-linear-gradient(135deg,rgba(255,255,255,.05) 0 2px,transparent 2px 22px)" }} />
              </a>
              <div style={{ padding: 18 }}>
                <div style={{ fontSize: 11, color: "#E6C763", fontWeight: 600, letterSpacing: ".05em" }}>
                  {s.series?.toUpperCase() ?? "SERMON"}
                </div>
                <h4 className="font-serif" style={{ fontSize: 21, fontWeight: 600, margin: "6px 0 4px", color: dark ? "#fff" : "#1e2464" }}>
                  {s.title}
                </h4>
                <div style={{ fontSize: 12.5, color: dark ? "rgba(255,255,255,.55)" : "#6b6f86" }}>
                  {s.reference ? `${s.reference} · ` : ""}{s.pastor}
                </div>
              </div>
            </article>
          ))}

          {/* Empty slots when fewer than 3 sermons in DB */}
          {rest.length < 2 && Array.from({ length: 2 - rest.length }).map((_, i) => (
            <article
              key={`empty-${i}`}
              style={{
                background: dark ? "rgba(255,255,255,.03)" : "rgba(30,36,100,.03)",
                border: `1.5px dashed ${dark ? "rgba(255,255,255,.1)" : "rgba(30,36,100,.12)"}`,
                borderRadius: 20,
                overflow: "hidden",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                minHeight: 220,
              }}
            >
              <div style={{ textAlign: "center", padding: 24 }}>
                <div style={{ fontSize: 28, marginBottom: 10 }}>📺</div>
                <div style={{ fontSize: 13, color: dark ? "rgba(255,255,255,.35)" : "#8890aa" }}>
                  Prochain message<br />à venir
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div style={{ textAlign: "center", padding: "64px 0", color: dark ? "rgba(255,255,255,.4)" : "#8890aa", fontSize: 14 }}>
          {activeFilter === "Tout"
            ? "Les sermons seront bientôt disponibles."
            : `Aucun sermon trouvé pour "${activeFilter}".`}
        </div>
      )}

      <style>{`
        @media (max-width: 900px) {
          .arc-sermon-grid { grid-template-columns: 1fr 1fr !important; }
          .arc-sermon-grid article:first-child { grid-column: 1 / -1; }
        }
        @media (max-width: 560px) {
          .arc-sermon-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </>
  );
}
