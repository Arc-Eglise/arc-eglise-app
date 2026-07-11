import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import Icon from "@/components/ui/Icon";

const VALUES = [
  { icon: "la-parole" as const,           title: "La Parole",  text: "La Bible est notre autorité absolue et notre guide quotidien." },
  { icon: "priere-bible" as const,        title: "La Prière",  text: "Nous sommes une maison de prière et d'intercession." },
  { icon: "amour" as const,               title: "L'Amour",    text: "Nous nous aimons comme Christ nous a aimés, sans conditions." },
  { icon: "rejoindre-famille" as const,   title: "La Mission", text: "Nous allons vers toutes les nations pour proclamer l'Évangile." },
];

const DEFAULTS = {
  histoire_p1:
    "Fondée en 2018 par le Pasteur Pedro Obova, l'Ambassade du Royaume de Christ est une communauté évangélique multiraciale et dynamique établie au cœur de La Chaux-de-Fonds.",
  histoire_p2:
    "Nous croyons en une foi authentique, pratique et transformatrice. Notre vision est de voir chaque personne rencontrer Dieu, être équipée et impacter sa génération pour l'Évangile.",
  histoire_citation:
    "« Construisons des générations de disciples qui influencent positivement leur environnement. »",
};

export default async function AboutSection() {
  const supabase = createClient();
  const { data } = await supabase
    .from("site_settings")
    .select("key, value")
    .in("key", ["histoire_p1", "histoire_p2", "histoire_citation", "about_photo_url", "about_photo_caption"]);

  const s: Record<string, string> = { ...DEFAULTS };
  for (const row of data ?? []) s[row.key] = row.value;

  const photoUrl     = s.about_photo_url     ?? null;
  const photoCaption = s.about_photo_caption ?? "Photo — Pasteur Pedro Obova & l'équipe";

  return (
    <section id="apropos" style={{ maxWidth: 1240, margin: "0 auto", padding: "90px 32px" }}>
      <div style={{ display: "grid", gridTemplateColumns: ".9fr 1.1fr", gap: 64, alignItems: "center" }} className="arc-two">

        {/* Visual */}
        <div style={{ position: "relative" }}>
          <div
            style={{
              borderRadius: 24, overflow: "hidden", height: 480,
              background: "linear-gradient(150deg,#2b327f,#141738)",
              boxShadow: "0 26px 60px rgba(20,23,56,.28)",
              position: "relative",
            }}
          >
            {photoUrl ? (
              <Image
                src={photoUrl}
                alt={photoCaption}
                fill
                sizes="(max-width:900px) 100vw, 45vw"
                style={{ objectFit: "cover" }}
              />
            ) : (
              <>
                <div style={{ position: "absolute", inset: 0, backgroundImage: "repeating-linear-gradient(135deg,rgba(255,255,255,.04) 0 2px,transparent 2px 22px)" }} />
                <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, padding: 24, fontFamily: "monospace", fontSize: 11, color: "rgba(255,255,255,.5)" }}>
                  [ {photoCaption} ]
                </div>
              </>
            )}
          </div>

          {/* Year chip */}
          <div
            style={{
              position: "absolute", left: -16, top: -16,
              background: "#fff", border: "1px solid rgba(30,36,100,.12)",
              borderRadius: 14, padding: "11px 16px",
              fontSize: 12.5, fontWeight: 600, color: "#1e2464",
              boxShadow: "0 12px 30px rgba(20,23,56,.14)",
            }}
          >
            Fondée en 2018 · La Chaux-de-Fonds
          </div>
        </div>

        {/* Text */}
        <div>
          <div style={{ fontSize: 12, letterSpacing: ".2em", textTransform: "uppercase", color: "#C9A227", fontWeight: 700, marginBottom: 18 }}>
            Notre histoire
          </div>
          <h2
            className="font-serif"
            style={{ fontWeight: 600, fontSize: "clamp(34px,4vw,52px)", lineHeight: 1.08, color: "#1e2464", marginBottom: 24 }}
          >
            Une église enracinée{" "}
            <span style={{ fontStyle: "italic", color: "#C9A227" }}>dans la Parole</span>
          </h2>
          <p style={{ fontSize: 16, lineHeight: 1.75, color: "#6b6f86", marginBottom: 16 }}>
            {s.histoire_p1}
          </p>
          <p style={{ fontSize: 16, lineHeight: 1.75, color: "#6b6f86", marginBottom: 24 }}>
            {s.histoire_p2}
          </p>
          <blockquote
            style={{
              borderLeft: "3px solid #C9A227",
              padding: "6px 0 6px 22px",
              margin: "0 0 30px",
              fontStyle: "italic",
              fontSize: 23,
              lineHeight: 1.4,
              color: "#1e2464",
            }}
            className="font-serif"
          >
            {s.histoire_citation}
          </blockquote>

          {/* Values grid */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 30 }}>
            {VALUES.map((v) => (
              <div
                key={v.title}
                style={{
                  background: "#fff",
                  border: "1px solid rgba(30,36,100,.12)",
                  borderRadius: 14,
                  padding: 18,
                }}
              >
                <Icon name={v.icon} variant="tile" size={44} style={{ marginBottom: 10, display: "block" }} />
                <div className="font-serif" style={{ fontSize: 19, fontWeight: 600, color: "#1e2464" }}>{v.title}</div>
                <div style={{ fontSize: 13, color: "#6b6f86", lineHeight: 1.5, marginTop: 4 }}>{v.text}</div>
              </div>
            ))}
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
            <a
              href="#equipe"
              style={{
                textDecoration: "none",
                background: "#1e2464",
                color: "#fff",
                padding: "14px 26px",
                borderRadius: 999,
                fontWeight: 600,
                fontSize: 14.5,
              }}
            >
              Rencontrer l'équipe →
            </a>
            <a
              href="#contact"
              style={{
                textDecoration: "none",
                border: "1px solid #1e2464",
                color: "#1e2464",
                padding: "14px 26px",
                borderRadius: 999,
                fontWeight: 600,
                fontSize: 14.5,
              }}
            >
              Nous visiter
            </a>
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 900px) {
          .arc-two { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </section>
  );
}
