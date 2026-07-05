import { createClient } from "@/lib/supabase/server";

interface Testimonial {
  id:          string;
  author_name: string;
  author_role: string | null;
  content:     string;
  avatar_url:  string | null;
  sort_order:  number;
}

const FALLBACK: Testimonial[] = [
  { id: "1", author_name: "Miriam K.",       author_role: "Membre depuis 2021",      sort_order: 1, avatar_url: null,
    content: "Depuis que j'ai rejoint l'ARC, ma vie a été transformée. L'enseignement de la Parole est profond et vivant. Je me sens vraiment chez moi dans cette famille spirituelle." },
  { id: "2", author_name: "Jean-Claude M.",  author_role: "Visiteur devenu membre",  sort_order: 2, avatar_url: null,
    content: "J'hésitais à entrer dans une église. Mais l'accueil chaleureux et l'authenticité des membres m'ont touché. Aujourd'hui, ma foi est plus forte que jamais." },
  { id: "3", author_name: "Esther N.",       author_role: "Membre depuis 2023",      sort_order: 3, avatar_url: null,
    content: "Le ministère de louange à l'ARC m'a aidée à retrouver la joie. Chaque culte est un moment de rencontre authentique avec Dieu. Je recommande cette communauté." },
];

export default async function TestimonialsSection() {
  const supabase = createClient();
  const { data } = await supabase
    .from("testimonials")
    .select("id, author_name, author_role, content, avatar_url, sort_order")
    .eq("is_published", true)
    .order("sort_order", { ascending: true })
    .limit(6);

  const items: Testimonial[] = (data && data.length > 0) ? data : FALLBACK;

  return (
    <section id="temoignages" style={{ background: "#F8F6FF", padding: "96px 0" }}>
      <div style={{ maxWidth: 1240, margin: "0 auto", padding: "0 32px" }}>

        {/* Header */}
        <div style={{ textAlign: "center", maxWidth: 640, margin: "0 auto 52px" }}>
          <div style={{ fontSize: 12, letterSpacing: ".2em", textTransform: "uppercase", color: "#C9A227", fontWeight: 700, marginBottom: 14 }}>
            Témoignages
          </div>
          <h2 className="font-serif" style={{ fontWeight: 600, fontSize: "clamp(34px,4vw,52px)", lineHeight: 1.07, color: "#1e2464", marginBottom: 16 }}>
            Ce que dit{" "}
            <span style={{ fontStyle: "italic", color: "#C9A227" }}>notre communauté</span>
          </h2>
          <p style={{ fontSize: 16, color: "#6b6f86", lineHeight: 1.7 }}>
            Des vies transformées par la grâce de Dieu. Voici quelques témoignages de membres de la famille ARC.
          </p>
        </div>

        {/* Cards */}
        <div className="arc-temoignages-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 24 }}>
          {items.map((t) => (
            <div
              key={t.id}
              className="arc-temoignage-card"
              style={{
                background: "#fff",
                border: "1px solid rgba(30,36,100,.10)",
                borderRadius: 20,
                padding: "32px 28px 28px",
                display: "flex",
                flexDirection: "column",
                gap: 20,
                position: "relative",
              }}
            >
              {/* Quote mark */}
              <div style={{
                position: "absolute", top: 18, right: 24,
                fontSize: 72, lineHeight: 1, fontFamily: "Georgia, serif",
                color: "rgba(30,36,100,.07)", fontWeight: 700, userSelect: "none",
              }}>
                &ldquo;
              </div>

              {/* Content */}
              <p style={{ fontSize: 15.5, color: "#374151", lineHeight: 1.75, flex: 1, margin: 0 }}>
                {t.content}
              </p>

              {/* Author */}
              <div style={{ display: "flex", alignItems: "center", gap: 12, paddingTop: 16, borderTop: "1px solid rgba(30,36,100,.08)" }}>
                {t.avatar_url ? (
                  <img
                    src={t.avatar_url}
                    alt={t.author_name}
                    style={{ width: 40, height: 40, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }}
                  />
                ) : (
                  <div style={{
                    width: 40, height: 40, borderRadius: "50%", flexShrink: 0,
                    background: "linear-gradient(135deg,#1e2464,#2b327f)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    color: "#fff", fontWeight: 700, fontSize: 14,
                  }}>
                    {t.author_name.charAt(0)}
                  </div>
                )}
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14, color: "#1e2464" }}>{t.author_name}</div>
                  {t.author_role && (
                    <div style={{ fontSize: 12, color: "#9CA3AF" }}>{t.author_role}</div>
                  )}
                </div>
                <div style={{ marginLeft: "auto" }}>
                  {"★★★★★".split("").map((s, i) => (
                    <span key={i} style={{ color: "#C9A227", fontSize: 13 }}>{s}</span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        .arc-temoignage-card { transition: box-shadow .2s, transform .2s; }
        .arc-temoignage-card:hover { box-shadow: 0 16px 40px rgba(20,23,56,.12); transform: translateY(-3px); }
        @media (max-width: 900px) {
          .arc-temoignages-grid { grid-template-columns: repeat(2,1fr) !important; }
        }
        @media (max-width: 560px) {
          .arc-temoignages-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </section>
  );
}
