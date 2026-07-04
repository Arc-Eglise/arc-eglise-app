"use client";

const DISCOVER = [
  {
    icon: "📺",
    title: "Sermons & Replays",
    text: "Retrouvez tous nos messages en vidéo, audio et transcription dès le lundi.",
    cta: "Voir les sermons",
    href: "#sermons",
  },
  {
    icon: "👨‍👩‍👧‍👦",
    title: "Rejoindre la famille",
    text: "Intégrez notre communauté de 250 membres issus de 32 nations différentes.",
    cta: "Je veux rejoindre",
    href: "#contact",
  },
  {
    icon: "📅",
    title: "Événements & Cultes",
    text: "Consultez notre agenda, réservez vos places pour nos soirées spéciales.",
    cta: "Voir l'agenda",
    href: "#evenements",
  },
  {
    icon: "💛",
    title: "Soutenir l'Église",
    text: "Participez à l'œuvre de Dieu via TWINT, carte bancaire ou PostFinance.",
    cta: "Faire un don",
    href: "#dons",
  },
];

export default function FeaturesStrip() {
  return (
    <section id="features" className="max-w-8xl mx-auto px-5 md:px-8" style={{ paddingBottom: 30 }}>
      {/* Label */}
      <div className="flex items-center gap-3.5 mb-7">
        <span style={{ fontSize: 12, letterSpacing: ".2em", textTransform: "uppercase", color: "#C9A227", fontWeight: 700 }}>
          Découvrir
        </span>
        <span style={{ flex: 1, height: 1, background: "rgba(30,36,100,.12)" }} />
      </div>

      {/* Cards grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 18 }} className="arc-cards4">
        {DISCOVER.map((d) => (
          <a
            key={d.title}
            href={d.href}
            style={{
              textDecoration: "none",
              background: "#fff",
              border: "1px solid rgba(30,36,100,.12)",
              borderRadius: 18,
              padding: 26,
              display: "flex",
              flexDirection: "column",
              minHeight: 184,
              boxShadow: "0 4px 20px rgba(20,23,56,.04)",
              transition: "box-shadow .2s, transform .2s",
            }}
            className="arc-discover-card"
          >
            <span style={{ fontSize: 26, marginBottom: "auto" }}>{d.icon}</span>
            <span className="font-serif" style={{ fontSize: 22, fontWeight: 600, color: "#1e2464", marginTop: 18 }}>{d.title}</span>
            <span style={{ fontSize: 13.5, color: "#6b6f86", lineHeight: 1.55, marginTop: 7 }}>{d.text}</span>
            <span style={{ fontSize: 13.5, color: "#C9A227", fontWeight: 700, marginTop: 14 }}>{d.cta} →</span>
          </a>
        ))}
      </div>

      <style>{`
        .arc-discover-card { transition: box-shadow .2s, transform .2s; }
        .arc-discover-card:hover { box-shadow: 0 12px 36px rgba(20,23,56,.1); transform: translateY(-3px); }
        @media (max-width: 900px) {
          .arc-cards4 { grid-template-columns: repeat(2,1fr) !important; }
        }
        @media (max-width: 540px) {
          .arc-cards4 { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </section>
  );
}
