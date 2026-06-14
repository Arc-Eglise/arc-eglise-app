"use client";

import { useState } from "react";
import type { Sermon } from "@/lib/supabase/types";

const FILTERS = ["Tout", "Série", "Évangélisation", "Prière", "Famille"];
const GRADIENT = ["from-arc-navy to-arc-blue", "from-[#2d3a8e] to-arc-navy", "from-arc-navy2 to-[#2d3a8e]"];

export default function SermonsClient({ sermons }: { sermons: Sermon[] }) {
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
      <div className="flex flex-wrap gap-1.5 mb-8">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setActiveFilter(f)}
            className={`px-4 py-2 rounded-full text-xs font-semibold border-[1.5px] cursor-pointer select-none transition-all duration-200 ${
              activeFilter === f
                ? "border-arc-navy bg-arc-blueBg text-arc-navy"
                : "border-arc-border bg-white text-arc-text2 hover:border-arc-navy hover:bg-arc-blueBg hover:text-arc-navy"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {featured ? (
        <>
          {/* Featured */}
          <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-8 mb-10 items-center">
            <a
              href={featured.youtube_id ? `https://youtu.be/${featured.youtube_id}` : undefined}
              target={featured.youtube_id ? "_blank" : undefined}
              rel="noopener noreferrer"
              className="rounded-[20px] aspect-video flex items-center justify-center relative overflow-hidden cursor-pointer group"
              style={{ background: "linear-gradient(145deg,#1e2464,#161b4e)" }}
            >
              {featured.youtube_id ? (
                <img
                  src={`https://img.youtube.com/vi/${featured.youtube_id}/hqdefault.jpg`}
                  alt={featured.title}
                  className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:opacity-80 transition-opacity"
                />
              ) : (
                <div className="absolute font-serif text-[80px] font-bold text-white/[0.04] select-none">ARC</div>
              )}
              <div className="relative z-10 w-[72px] h-[72px] rounded-full bg-white/15 border-2 border-white/40 flex items-center justify-center text-2xl text-white group-hover:bg-white/25 group-hover:scale-105 transition-all duration-300">
                ▶
              </div>
              <div className="absolute top-3.5 left-3.5 flex items-center gap-1.5 bg-arc-red text-white text-[9px] font-bold px-2.5 py-1 rounded-full tracking-widest">
                <span className="w-[5px] h-[5px] bg-white rounded-full" /> REPLAY
              </div>
            </a>

            <div className="flex flex-col gap-2">
              <div className="text-[9px] font-bold tracking-[2px] uppercase text-arc-blue">
                {featured.series ?? "Sermon du dimanche"}
              </div>
              <h3 className="font-serif text-[26px] font-bold text-arc-navy leading-[1.25]">{featured.title}</h3>
              <div className="text-[13px] text-arc-text3">
                {new Date(featured.date).toLocaleDateString("fr-CH", { day: "numeric", month: "long", year: "numeric" })}
                {" · "}{featured.pastor}
                {featured.reference ? ` · ${featured.reference}` : ""}
              </div>
              {featured.excerpt && (
                <p className="text-sm text-arc-text2 leading-[1.8] mt-1">{featured.excerpt}</p>
              )}
              <div className="flex gap-2 mt-3 flex-wrap">
                {featured.youtube_id && (
                  <a
                    href={`https://youtu.be/${featured.youtube_id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 rounded-lg text-xs font-semibold bg-arc-navy text-white hover:bg-arc-navy2 transition-colors"
                  >
                    ▶ Regarder
                  </a>
                )}
                <button className="px-4 py-2 rounded-lg text-xs font-semibold border border-arc-border text-arc-text2 hover:border-arc-blue hover:text-arc-navy transition-colors">
                  📤 Partager
                </button>
              </div>
            </div>
          </div>

          {/* Grille */}
          {rest.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-5">
              {rest.map((s: Sermon, i: number) => (
                <a
                  key={s.id}
                  href={s.youtube_id ? `https://youtu.be/${s.youtube_id}` : undefined}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="cursor-pointer rounded-[14px] overflow-hidden bg-white border border-arc-border hover:border-arc-bluePale hover:-translate-y-1 hover:shadow-arc transition-all duration-300 block"
                >
                  <div className={`h-[120px] relative flex items-center justify-center bg-gradient-to-br ${GRADIENT[i % GRADIENT.length]}`}>
                    {s.youtube_id ? (
                      <img
                        src={`https://img.youtube.com/vi/${s.youtube_id}/mqdefault.jpg`}
                        alt={s.title}
                        className="absolute inset-0 w-full h-full object-cover opacity-70"
                      />
                    ) : (
                      <span className="font-serif text-sm italic text-white/40 px-3 text-center">{s.reference}</span>
                    )}
                    <div className="absolute inset-0 flex items-center justify-center bg-arc-navy/40 opacity-0 hover:opacity-100 transition-opacity text-white text-2xl z-10">▶</div>
                  </div>
                  <div className="p-3.5">
                    <div className="text-[9px] font-bold text-arc-blue uppercase tracking-widest mb-1">
                      {new Date(s.date).toLocaleDateString("fr-CH", { day: "numeric", month: "short", year: "numeric" })}
                    </div>
                    <div className="font-serif text-base font-semibold text-arc-navy leading-[1.35] mb-1">{s.title}</div>
                    <div className="text-[11px] text-arc-text3">{s.pastor}</div>
                  </div>
                </a>
              ))}
            </div>
          )}
        </>
      ) : (
        <div className="text-center py-16 text-arc-text3 text-sm">
          {activeFilter === "Tout"
            ? "Les sermons seront bientôt disponibles."
            : `Aucun sermon trouvé pour "${activeFilter}".`}
        </div>
      )}
    </>
  );
}
