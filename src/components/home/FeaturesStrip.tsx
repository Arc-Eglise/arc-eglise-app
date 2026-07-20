import { createClient } from "@/lib/supabase/server";
import { DONS_ENABLED } from "@/lib/features";
import Icon from "@/components/ui/Icon";

const ALL_CARDS = [
  { icon: "sermons-replay" as const,      title: "Sermons & Replays",      cta: "Voir les sermons",  href: "#sermons",    key: "decouvrir_1_text", fallback: "Retrouvez tous nos messages en vidéo, audio et transcription dès le lundi.", isDons: false },
  { icon: "rejoindre-famille" as const,   title: "Rejoindre la famille",   cta: "Je veux rejoindre", href: "#contact",    key: "decouvrir_2_text", fallback: "Rejoignez notre communauté évangélique ouverte à tous, issus de toutes les nations.", isDons: false },
  { icon: "agenda" as const,              title: "Événements & Cultes",    cta: "Voir l'agenda",     href: "#evenements", key: "decouvrir_3_text", fallback: "Consultez notre agenda, réservez vos places pour nos soirées spéciales.", isDons: false },
  { icon: "dons-paiements" as const,      title: "Soutenir l'Église",      cta: "Faire un don",      href: "#dons",       key: "decouvrir_4_text", fallback: "Participez à l'œuvre de Dieu via TWINT, carte bancaire ou PostFinance.", isDons: true },
];
const STATIC_CARDS = ALL_CARDS.filter((c) => !c.isDons || DONS_ENABLED);

export default async function FeaturesStrip() {
  const supabase = createClient();
  const keys = STATIC_CARDS.map((c) => c.key);
  const { data } = await supabase.from("site_settings").select("key, value").in("key", keys);
  const s: Record<string, string> = {};
  for (const row of data ?? []) s[row.key] = row.value;

  const DISCOVER = STATIC_CARDS.map((c) => ({ ...c, text: s[c.key] ?? c.fallback }));

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
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${DISCOVER.length},1fr)`, gap: 18 }} className="arc-cards4">
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
            <Icon name={d.icon} variant="tile" size={52} style={{ marginBottom: "auto", flexShrink: 0 }} />
            <span className="font-serif" style={{ fontSize: 22, fontWeight: 600, color: "var(--navy)", marginTop: 18 }}>{d.title}</span>
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
