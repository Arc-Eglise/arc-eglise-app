"use client";

export default function HeroSection() {
  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section
      id="accueil"
      className="hero-full relative flex items-center overflow-hidden"
      style={{ background: "#0f123a" }}
    >
      {/* Backgrounds */}
      <div
        className="absolute inset-0"
        style={{
          background: "linear-gradient(135deg,#0a0d2e 0%,#1e2464 40%,#2d3a8e 80%,#0f123a 100%)",
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: "radial-gradient(circle,rgba(136,153,204,.08) 1px,transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />
      <div
        className="absolute pointer-events-none"
        style={{
          top: -200, right: -200, width: 700, height: 700,
          background: "radial-gradient(circle,rgba(136,153,204,.12) 0%,transparent 60%)",
        }}
      />
      <div
        className="absolute pointer-events-none"
        style={{
          bottom: -200, left: -100, width: 500, height: 500,
          background: "radial-gradient(circle,rgba(212,168,67,.06) 0%,transparent 60%)",
        }}
      />

      {/* Content */}
      <div className="max-w-8xl mx-auto px-5 md:px-10 pt-24 pb-20 relative z-10 w-full grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-20 items-center">

        {/* Left */}
        <div>
          <div className="inline-flex items-center gap-2.5 bg-arc-blue/15 border border-arc-blue/25 rounded-full px-[18px] py-[7px] text-[10px] font-bold tracking-[2.5px] uppercase text-arc-bluePale mb-7">
            ✦ La Chaux-de-Fonds · Suisse · Depuis 2018
          </div>
          <h1 className="font-serif text-[42px] md:text-[62px] font-bold text-white leading-[1.08] mb-6">
            Construisons<br />
            des <span className="italic text-arc-blue">générations</span><br />
            qui transforment
          </h1>
          <p className="text-[17px] font-light text-white/65 leading-[1.85] mb-10 max-w-[480px]">
            Une communauté évangélique vivante, fondée sur la Parole de Dieu, ouverte à toutes les nations. Venez tels que vous êtes.
          </p>
          <div className="flex gap-3.5 flex-wrap mb-11">
            <button
              onClick={() => scrollTo("sermons")}
              className="inline-flex items-center gap-2 px-7 py-3.5 rounded-[11px] text-sm font-bold bg-white text-arc-navy hover:bg-arc-blueBg hover:-translate-y-0.5 hover:shadow-arc-dark transition-all duration-300"
            >
              📺 Voir le dernier sermon
            </button>
            <button
              onClick={() => scrollTo("contact")}
              className="inline-flex items-center gap-2 px-7 py-3.5 rounded-[11px] text-sm font-bold bg-transparent text-white border-[1.5px] border-white/40 hover:bg-white/10 hover:border-white transition-all duration-300"
            >
              Rejoindre la famille →
            </button>
          </div>

          {/* Stats */}
          <div className="flex gap-9 pt-9 border-t border-white/10">
            {[
              { v: "250", l: "Membres" },
              { v: "32",  l: "Nations" },
              { v: "6",   l: "Ans d'histoire" },
              { v: "600+", l: "Touchés" },
            ].map((s) => (
              <div key={s.l}>
                <div className="font-serif text-[34px] font-bold text-white">{s.v}</div>
                <div className="text-[10px] text-white/50 uppercase tracking-widest mt-0.5">{s.l}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Right — cards */}
        <div className="flex flex-col gap-3.5">

          {/* Live card */}
          <div className="bg-white/[0.06] border border-white/10 border-l-[3px] border-l-arc-red rounded-[18px] p-[22px] backdrop-blur-sm hover:bg-white/10 hover:border-white/20 hover:-translate-y-0.5 transition-all duration-300 cursor-pointer">
            <div className="flex items-center gap-2.5 mb-3">
              <span className="bg-arc-red text-white text-[9px] font-bold px-2 py-[3px] rounded-full tracking-widest flex items-center gap-[5px]">
                <span className="w-[5px] h-[5px] bg-white rounded-full animate-blink" />
                EN DIRECT
              </span>
              <span className="text-[11px] text-white/50">247 spectateurs</span>
              <span className="ml-auto text-lg">📺</span>
            </div>
            <div className="text-base font-bold text-white mb-1">L'amour désintéressé</div>
            <div className="text-xs text-white/50 mb-3.5">1 Corinthiens 13 · Past. Pedro Obova</div>
            <div className="grid grid-cols-3 gap-2">
              {[["247", "Live"], ["1.4k", "Vues"], ["32", "Nations"]].map(([v, l]) => (
                <div key={l} className="text-center bg-white/[0.06] rounded-lg py-2.5">
                  <div className="font-serif text-[18px] font-bold text-white">{v}</div>
                  <div className="text-[8px] text-white/40 uppercase tracking-widest">{l}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Event card */}
          <div className="bg-white/[0.06] border border-white/10 border-l-[3px] border-l-arc-gold rounded-[18px] p-[22px] backdrop-blur-sm hover:bg-white/10 hover:-translate-y-0.5 transition-all duration-300 cursor-pointer">
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-[9px] font-bold tracking-[2px] uppercase text-arc-gold">🎶 Prochain événement</span>
              <span className="bg-arc-gold/20 text-arc-gold text-[10px] font-bold px-2.5 py-0.5 rounded-full">CHF 25</span>
            </div>
            <div className="text-[17px] font-bold text-white mb-1">Soirée Gospel & Dîner</div>
            <div className="text-xs text-white/50 mb-3">Sam 27 juin · 18h00 · 22/60 places</div>
            <div className="h-[3px] bg-white/10 rounded-sm overflow-hidden mb-3">
              <div className="h-full w-[37%] bg-arc-gold rounded-sm" />
            </div>
            <button
              onClick={() => scrollTo("evenements")}
              className="inline-flex items-center gap-2 px-[18px] py-2 rounded-[9px] text-xs font-bold bg-arc-gold text-white hover:bg-[#c49035] hover:-translate-y-0.5 transition-all duration-300"
            >
              🎟 Réserver ma place
            </button>
          </div>

          {/* Schedule card */}
          <div className="bg-white/[0.06] border border-white/10 border-l-[3px] border-l-arc-blue rounded-[18px] p-[22px] backdrop-blur-sm hover:bg-white/10 hover:-translate-y-0.5 transition-all duration-300">
            <div className="text-[9px] font-bold tracking-[2px] uppercase text-arc-blue mb-3">📅 Prochains cultes</div>
            <div className="flex flex-col gap-2">
              {[
                ["Dimanche 09h30", "Culte principal"],
                ["Dimanche 17h00", "Culte du soir"],
                ["Mercredi 19h00", "Prière & Parole"],
              ].map(([time, label]) => (
                <div key={time} className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-white/80">{time}</span>
                  <span className="text-[11px] text-white/40">{label}</span>
                </div>
              ))}
            </div>
            <button
              onClick={() => scrollTo("evenements")}
              className="mt-3.5 text-xs font-bold px-[18px] py-2 rounded-[9px] bg-transparent text-white border-[1.5px] border-white/40 hover:bg-white/10 hover:border-white transition-all duration-300"
            >
              Voir tous les horaires
            </button>
          </div>
        </div>
      </div>

      {/* Scroll indicator */}
      <div
        className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1.5 cursor-pointer opacity-50 hover:opacity-100 transition-opacity"
        onClick={() => scrollTo("features")}
      >
        <div className="text-[9px] text-white tracking-[2px] uppercase">Découvrir</div>
        <div className="w-px h-10 bg-white/30" />
      </div>
    </section>
  );
}
