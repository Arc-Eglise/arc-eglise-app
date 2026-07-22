import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import Icon, { type IconName } from "@/components/ui/Icon";

const VALEUR_DEFAULTS = [
  { icon: "la-parole" as IconName,         titre: "La Parole",  texte: "La Bible est notre autorité absolue et notre guide quotidien." },
  { icon: "priere-bible" as IconName,      titre: "La Prière",  texte: "Nous sommes une maison de prière et d'intercession." },
  { icon: "amour" as IconName,             titre: "L'Amour",    texte: "Nous nous aimons comme Christ nous a aimés, sans conditions." },
  { icon: "rejoindre-famille" as IconName, titre: "La Mission", texte: "Nous allons vers toutes les nations pour proclamer l'Évangile." },
];

const SETTINGS_DEFAULTS: Record<string, string> = {
  histoire_titre:    "Une église enracinée",
  histoire_titre_em: "dans la Parole",
  histoire_p1:       "Fondée en 2018 par le Pasteur Pedro Obova, l'Ambassade du Royaume de Christ est une communauté évangélique multiraciale et dynamique établie au cœur de La Chaux-de-Fonds.",
  histoire_p2:       "Nous croyons en une foi authentique, pratique et transformatrice. Notre vision est de voir chaque personne rencontrer Dieu, être équipée et impacter sa génération pour l'Évangile.",
  histoire_citation: "« Construisons des générations de disciples qui influencent positivement leur environnement. »",
};

export default async function AboutSection() {
  const supabase = createClient();

  const [settingsRes, churchRes] = await Promise.all([
    supabase
      .from("site_settings")
      .select("key, value")
      .in("key", [
        "histoire_titre", "histoire_titre_em",
        "histoire_p1", "histoire_p2", "histoire_citation",
        "about_photo_url", "about_photo_caption",
        "valeur_1_icon", "valeur_1_titre", "valeur_1_texte",
        "valeur_2_icon", "valeur_2_titre", "valeur_2_texte",
        "valeur_3_icon", "valeur_3_titre", "valeur_3_texte",
        "valeur_4_icon", "valeur_4_titre", "valeur_4_texte",
      ]),
    supabase
      .from("church_info")
      .select("founded_year, city")
      .single(),
  ]);

  const s: Record<string, string> = { ...SETTINGS_DEFAULTS };
  for (const row of settingsRes.data ?? []) s[row.key] = row.value;

  const photoUrl     = s.about_photo_url     ?? null;
  const photoCaption = s.about_photo_caption ?? "Photo — Pasteur Pedro Obova & l'équipe";

  const foundedYear = churchRes.data?.founded_year ?? 2018;
  const city        = churchRes.data?.city ?? "La Chaux-de-Fonds";

  const valeurs = [1, 2, 3, 4].map((n, i) => ({
    icon:  (s[`valeur_${n}_icon`]  as IconName | undefined) ?? VALEUR_DEFAULTS[i].icon,
    titre: s[`valeur_${n}_titre`]  ?? VALEUR_DEFAULTS[i].titre,
    texte: s[`valeur_${n}_texte`]  ?? VALEUR_DEFAULTS[i].texte,
  }));

  return (
    <section id="apropos" style={{ maxWidth: 1240, margin: "0 auto", padding: "90px 32px" }}>
      <div style={{ display: "grid", gridTemplateColumns: ".9fr 1.1fr", gap: 64, alignItems: "center" }} className="arc-two">

        {/* Visual */}
        <div style={{ position: "relative" }}>
          <div
            style={{
              borderRadius: 24, overflow: "hidden", height: 480,
              background: "linear-gradient(150deg,var(--navy-700),var(--navy-900))",
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

          {/* Chip — données venant de church_info */}
          <div
            style={{
              position: "absolute", left: -16, top: -16,
              background: "#fff", border: "1px solid rgba(30,36,100,.12)",
              borderRadius: 14, padding: "11px 16px",
              fontSize: 12.5, fontWeight: 600, color: "var(--navy)",
              boxShadow: "0 12px 30px rgba(20,23,56,.14)",
            }}
          >
            Fondée en {foundedYear} · {city}
          </div>
        </div>

        {/* Text */}
        <div>
          <div style={{ fontSize: 12, letterSpacing: ".2em", textTransform: "uppercase", color: "#C9A227", fontWeight: 700, marginBottom: 18 }}>
            Notre histoire
          </div>
          <h2
            className="font-serif"
            style={{ fontWeight: 600, fontSize: "clamp(34px,4vw,52px)", lineHeight: 1.08, color: "var(--navy)", marginBottom: 24 }}
          >
            {s.histoire_titre}{" "}
            <span style={{ fontStyle: "italic", color: "#C9A227" }}>{s.histoire_titre_em}</span>
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
              color: "var(--navy)",
            }}
            className="font-serif"
          >
            {s.histoire_citation}
          </blockquote>

          {/* Cartes valeurs depuis site_settings */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 30 }}>
            {valeurs.map((v) => (
              <div
                key={v.titre}
                style={{
                  background: "#fff",
                  border: "1px solid rgba(30,36,100,.12)",
                  borderRadius: 14,
                  padding: 18,
                }}
              >
                <Icon name={v.icon} variant="tile" size={44} style={{ marginBottom: 10, display: "block" }} />
                <div className="font-serif" style={{ fontSize: 19, fontWeight: 600, color: "#1e2464" }}>{v.titre}</div>
                <div style={{ fontSize: 13, color: "#6b6f86", lineHeight: 1.5, marginTop: 4 }}>{v.texte}</div>
              </div>
            ))}
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
            <a
              href="#equipe"
              style={{
                textDecoration: "none",
                background: "var(--navy)",
                color: "#fff",
                padding: "14px 26px",
                borderRadius: 999,
                fontWeight: 600,
                fontSize: 14.5,
              }}
            >
              Rencontrer l&apos;équipe →
            </a>
            <a
              href="#contact"
              style={{
                textDecoration: "none",
                border: "1px solid var(--navy)",
                color: "var(--navy)",
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
