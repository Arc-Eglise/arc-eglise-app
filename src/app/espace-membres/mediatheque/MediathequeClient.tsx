"use client";

import { useMemo, useState } from "react";

export type Sermon = {
  id: string;
  title: string;
  pastor: string;
  reference: string | null;
  series: string | null;
  excerpt: string | null;
  youtube_id: string | null;
  date: string;
  is_featured: boolean;
};

const thumb = (yt: string | null) => yt ? `https://i.ytimg.com/vi/${yt}/hqdefault.jpg` : null;
const fmtDate = (d: string) => new Date(d + "T00:00:00").toLocaleDateString("fr-CH", { day: "numeric", month: "long", year: "numeric" });

export default function MediathequeClient({ sermons, featured }: { sermons: Sermon[]; featured: Sermon | null }) {
  const [q, setQ] = useState("");
  const [series, setSeries] = useState<string | null>(null);
  const [playing, setPlaying] = useState<Sermon | null>(null);

  const allSeries = useMemo(
    () => Array.from(new Set(sermons.map(s => s.series).filter(Boolean) as string[])).sort(),
    [sermons],
  );

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return sermons.filter(s => {
      if (series && s.series !== series) return false;
      if (!needle) return true;
      return [s.title, s.pastor, s.reference, s.series, s.excerpt]
        .filter(Boolean).some(v => (v as string).toLowerCase().includes(needle));
    });
  }, [sermons, q, series]);

  return (
    <div>
      {/* Vedette */}
      {featured && featured.youtube_id && (
        <button onClick={() => setPlaying(featured)}
          className="w-full text-left mb-8 group rounded-2xl overflow-hidden border border-[#c6c5d4]/50 shadow-[0_4px_20px_rgba(26,35,126,0.08)] bg-white flex flex-col md:flex-row">
          <div className="relative md:w-[45%] aspect-video md:aspect-auto bg-[#000666]/5 overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={thumb(featured.youtube_id)!} alt={featured.title} className="w-full h-full object-cover" />
            <span className="absolute inset-0 flex items-center justify-center">
              <span className="w-16 h-16 rounded-full bg-white/90 flex items-center justify-center text-[#000666] text-3xl group-hover:scale-110 transition-transform shadow-lg">▶</span>
            </span>
            <span className="absolute top-3 left-3 text-[11px] font-bold uppercase tracking-wider bg-[#000666] text-white px-3 py-1 rounded-full">À la une</span>
          </div>
          <div className="p-6 md:p-8 flex-1 flex flex-col justify-center">
            {featured.series && <div className="text-[11px] font-bold uppercase tracking-wider text-[#767683] mb-2">{featured.series}</div>}
            <h2 style={{ fontFamily: '"Playfair Display", serif' }} className="text-[26px] md:text-[32px] leading-tight text-[#000666] font-bold">{featured.title}</h2>
            <div className="text-sm text-[#454652] mt-2">{featured.pastor} · {fmtDate(featured.date)}{featured.reference ? ` · ${featured.reference}` : ""}</div>
            {featured.excerpt && <p className="text-[15px] text-[#454652] mt-3 line-clamp-3">{featured.excerpt}</p>}
          </div>
        </button>
      )}

      {/* Recherche + filtres séries */}
      <div className="flex flex-col gap-3 mb-6">
        <div className="relative max-w-md">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#767683]">🔎</span>
          <input value={q} onChange={e => setQ(e.target.value)}
            placeholder="Rechercher un sermon, un pasteur, une référence…"
            className="w-full rounded-full py-2.5 pl-10 pr-4 text-sm outline-none border border-[#c6c5d4] focus:border-[#000666] bg-white" />
        </div>
        {allSeries.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={() => setSeries(null)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${series === null ? "bg-[#000666] text-white" : "bg-white border border-[#c6c5d4]/60 text-[#000666] hover:bg-[#edeeef]"}`}>
              Toutes les séries
            </button>
            {allSeries.map(s => (
              <button key={s} onClick={() => setSeries(s)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${series === s ? "bg-[#000666] text-white" : "bg-white border border-[#c6c5d4]/60 text-[#000666] hover:bg-[#edeeef]"}`}>
                {s}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Grille */}
      {filtered.length === 0 ? (
        <div className="bg-white border border-[#c6c5d4]/50 rounded-xl p-12 text-center text-[#767683] shadow-sm">
          {sermons.length === 0 ? "Aucun enseignement publié pour le moment." : "Aucun résultat pour cette recherche."}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map(s => (
            <button key={s.id} onClick={() => s.youtube_id && setPlaying(s)} disabled={!s.youtube_id}
              className="text-left bg-white border border-[#c6c5d4]/50 rounded-xl overflow-hidden shadow-sm hover:shadow-[0_8px_24px_rgba(26,35,126,0.12)] transition-shadow group disabled:opacity-70">
              <div className="relative aspect-video bg-[#000666]/5 overflow-hidden">
                {s.youtube_id ? (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={thumb(s.youtube_id)!} alt={s.title} className="w-full h-full object-cover" />
                    <span className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/20">
                      <span className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center text-[#000666] text-xl">▶</span>
                    </span>
                  </>
                ) : (
                  <span className="absolute inset-0 flex items-center justify-center text-[#767683] text-3xl">📖</span>
                )}
              </div>
              <div className="p-4">
                {s.series && <div className="text-[10px] font-bold uppercase tracking-wider text-[#767683] mb-1">{s.series}</div>}
                <h3 style={{ fontFamily: '"Playfair Display", serif' }} className="text-[17px] leading-snug text-[#000666] font-semibold line-clamp-2">{s.title}</h3>
                <div className="text-xs text-[#454652] mt-2">{s.pastor} · {fmtDate(s.date)}</div>
                {s.reference && <div className="text-xs text-[#767683] mt-0.5">{s.reference}</div>}
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Lecteur (lightbox) */}
      {playing && playing.youtube_id && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setPlaying(null)}>
          <div className="absolute inset-0 bg-black/70" />
          <div className="relative w-full max-w-3xl" onClick={e => e.stopPropagation()}>
            <button onClick={() => setPlaying(null)} className="absolute -top-10 right-0 text-white text-2xl hover:opacity-70" aria-label="Fermer">✕</button>
            <div className="aspect-video rounded-xl overflow-hidden shadow-2xl bg-black">
              <iframe
                src={`https://www.youtube.com/embed/${playing.youtube_id}?autoplay=1&rel=0`}
                title={playing.title}
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
            <div className="mt-3 text-white">
              <div style={{ fontFamily: '"Playfair Display", serif' }} className="text-lg font-semibold">{playing.title}</div>
              <div className="text-sm text-white/70">{playing.pastor} · {fmtDate(playing.date)}{playing.reference ? ` · ${playing.reference}` : ""}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
