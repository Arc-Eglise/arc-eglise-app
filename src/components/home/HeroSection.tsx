"use client";

import Link from "next/link";

export default function HeroSection({ subtitle }: { subtitle?: string }) {
  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section
      id="accueil"
      className="relative max-w-8xl mx-auto px-5 md:px-8 arc-hero-grid"
      style={{ padding: "74px 32px 90px", display: "grid", gridTemplateColumns: "1.05fr .95fr", gap: 64, alignItems: "center" }}
    >
      <style>{`
        @media (max-width: 1024px) {
          .arc-hero-grid { grid-template-columns: 1fr !important; padding: 48px 20px 64px !important; }
        }
      `}</style>
      {/* Gold glow blob */}
      <div
        className="absolute pointer-events-none"
        style={{ top: -40, left: -120, width: 420, height: 420, background: "radial-gradient(circle,rgba(201,162,39,.14),transparent 70%)" }}
      />

      {/* Left */}
      <div style={{ position: "relative" }}>
        {/* Badge */}
        <div
          className="inline-flex items-center gap-[9px] mb-7"
          style={{
            padding: "8px 16px",
            border: "1px solid rgba(30,36,100,.12)",
            borderRadius: 999,
            background: "rgba(255,255,255,.6)",
            fontSize: 12.5,
            letterSpacing: ".14em",
            textTransform: "uppercase",
            color: "#1e2464",
            fontWeight: 600,
          }}
        >
          <span style={{ color: "#C9A227" }}>✦</span>
          La Chaux-de-Fonds · Suisse · Depuis 2018
        </div>

        <h1
          className="font-serif mb-7"
          style={{
            fontWeight: 600,
            fontSize: "clamp(44px,5.4vw,76px)",
            lineHeight: 1.04,
            letterSpacing: "-.01em",
            color: "#1e2464",
          }}
        >
          Construisons des générations{" "}
          <span style={{ fontStyle: "italic", color: "#C9A227" }}>qui transforment</span>
        </h1>

        <p className="mb-10" style={{ fontSize: 18, lineHeight: 1.7, color: "#6b6f86", maxWidth: 480 }}>
          {subtitle ?? "Une communauté évangélique vivante, fondée sur la Parole de Dieu, ouverte à toutes les nations. Venez tels que vous êtes."}
        </p>

        <div className="flex flex-wrap gap-3.5 mb-14">
          <button
            onClick={() => scrollTo("sermons")}
            className="inline-flex items-center gap-2.5 font-bold text-[15px] text-arc-navy9 hover:-translate-y-0.5 transition-all"
            style={{
              background: "#C9A227",
              padding: "16px 30px",
              borderRadius: 999,
              boxShadow: "0 14px 30px rgba(201,162,39,.34)",
            }}
          >
            Voir le dernier sermon
          </button>
          <Link
            href="/inscription"
            className="inline-flex items-center gap-2 font-semibold text-[15px] text-arc-navy hover:-translate-y-0.5 transition-all"
            style={{ background: "transparent", padding: "16px 28px", borderRadius: 999, border: "1px solid #1e2464" }}
          >
            Rejoindre la famille →
          </Link>
        </div>

        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8, maxWidth: 520 }}>
          {[
            { v: "250",  l: "Membres" },
            { v: "32",   l: "Nations" },
            { v: "6",    l: "Ans d'histoire" },
            { v: "600+", l: "Touchés" },
          ].map((s) => (
            <div key={s.l} style={{ textAlign: "left" }}>
              <div className="font-serif" style={{ fontSize: 40, fontWeight: 600, color: "#1e2464", lineHeight: 1 }}>{s.v}</div>
              <div style={{ fontSize: 12, letterSpacing: ".08em", textTransform: "uppercase", color: "#6b6f86", marginTop: 5 }}>{s.l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Right — media stack */}
      <div className="hidden lg:block" style={{ position: "relative", height: 560 }}>
        {/* Main dark card */}
        <div
          style={{
            position: "absolute", inset: 0, borderRadius: 24, overflow: "hidden",
            boxShadow: "0 30px 70px rgba(20,23,56,.32)",
            background: "linear-gradient(150deg,#262c6e,#141738)",
          }}
        >
          <div style={{ position: "absolute", inset: 0, backgroundImage: "repeating-linear-gradient(135deg,rgba(255,255,255,.04) 0 2px,transparent 2px 22px)" }} />
          <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, padding: 26, background: "linear-gradient(transparent,rgba(20,23,56,.88))" }}>
            <div style={{ fontFamily: "monospace", fontSize: 11, color: "rgba(255,255,255,.5)", letterSpacing: ".05em" }}>[ Photo — assemblée en culte ]</div>
          </div>
          {/* Live badge */}
          <div
            className="animate-pulse2"
            style={{
              position: "absolute", top: 22, left: 22,
              display: "inline-flex", alignItems: "center", gap: 8,
              background: "rgba(220,38,38,.95)", color: "#fff",
              padding: "7px 14px", borderRadius: 999,
              fontSize: 12, fontWeight: 700, letterSpacing: ".05em",
            }}
          >
            <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#fff" }} />
            EN DIRECT
          </div>
        </div>

        {/* Floating sermon info card */}
        <div
          className="animate-float"
          style={{
            position: "absolute", left: -26, top: 64, width: 230,
            background: "#fff", borderRadius: 18, padding: 18,
            boxShadow: "0 24px 50px rgba(20,23,56,.22)",
            border: "1px solid rgba(30,36,100,.12)",
          }}
        >
          <div style={{ fontSize: 11, letterSpacing: ".12em", textTransform: "uppercase", color: "#C9A227", fontWeight: 700, marginBottom: 8 }}>Sermon du jour</div>
          <div className="font-serif" style={{ fontSize: 22, fontWeight: 600, color: "#1e2464", lineHeight: 1.1 }}>L'amour désintéressé</div>
          <div style={{ fontSize: 12.5, color: "#6b6f86", marginTop: 6 }}>1 Corinthiens 13 · Past. Pedro Obova</div>
          <div style={{ display: "flex", gap: 16, marginTop: 14, paddingTop: 14, borderTop: "1px solid rgba(30,36,100,.12)" }}>
            <div><div style={{ fontWeight: 700, color: "#1e2464", fontSize: 15 }}>—</div><div style={{ fontSize: 11, color: "#6b6f86" }}>Vues</div></div>
            <div><div style={{ fontWeight: 700, color: "#1e2464", fontSize: 15 }}>—</div><div style={{ fontSize: 11, color: "#6b6f86" }}>Nations</div></div>
          </div>
        </div>

        {/* Floating event card (delayed float) */}
        <div
          className="animate-float"
          style={{
            position: "absolute", right: -22, bottom: 34, width: 248,
            background: "#1e2464", color: "#fff", borderRadius: 18, padding: 20,
            boxShadow: "0 24px 50px rgba(20,23,56,.4)",
            animationDelay: ".8s",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <span style={{ fontSize: 11, letterSpacing: ".1em", textTransform: "uppercase", color: "#E6C763", fontWeight: 700 }}>Prochain événement</span>
            <span style={{ background: "#C9A227", color: "#141738", fontWeight: 700, fontSize: 12, padding: "3px 9px", borderRadius: 999 }}>Gratuit</span>
          </div>
          <div className="font-serif" style={{ fontSize: 23, fontWeight: 600, lineHeight: 1.1 }}>Prochain événement</div>
          <div style={{ fontSize: 12.5, color: "rgba(255,255,255,.7)", marginTop: 7 }}>Événements disponibles via la section Agenda</div>
          <button
            onClick={() => scrollTo("evenements")}
            className="block text-center font-bold text-[13.5px] text-arc-navy9 hover:opacity-90 transition-opacity"
            style={{ marginTop: 14, background: "#C9A227", padding: 11, borderRadius: 11, border: "none", cursor: "pointer", width: "100%" }}
          >
            🎟 Réserver ma place
          </button>
        </div>
      </div>

      {/* Scroll indicator */}
      <div
        className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1.5 cursor-pointer opacity-40 hover:opacity-80 transition-opacity hidden lg:flex"
        onClick={() => scrollTo("features")}
      >
        <div style={{ fontSize: 9, color: "#6b6f86", letterSpacing: "2px", textTransform: "uppercase" }}>Découvrir</div>
        <div style={{ width: 1, height: 40, background: "rgba(30,36,100,.25)" }} />
      </div>
    </section>
  );
}
