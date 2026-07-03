import Image from "next/image";
import { createClient }  from "@/lib/supabase/server";
import type { TeamMember } from "@/lib/supabase/types";

export default async function TeamSection() {
  const supabase = createClient();

  const { data: members } = await supabase
    .from("team_members")
    .select("*")
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .limit(8);

  return (
    <section id="equipe" style={{ background: "linear-gradient(180deg,#fff,#FAF7F0)", padding: "96px 0" }}>
      <div style={{ maxWidth: 1240, margin: "0 auto", padding: "0 32px" }}>

        {/* Header */}
        <div style={{ textAlign: "center", maxWidth: 660, margin: "0 auto 52px" }}>
          <div style={{ fontSize: 12, letterSpacing: ".2em", textTransform: "uppercase", color: "#C9A227", fontWeight: 700, marginBottom: 14 }}>
            Notre équipe
          </div>
          <h2 className="font-serif" style={{ fontWeight: 600, fontSize: "clamp(34px,4vw,52px)", lineHeight: 1.07, color: "#1e2464", marginBottom: 16 }}>
            Des bergers au service{" "}
            <span style={{ fontStyle: "italic", color: "#C9A227" }}>de la communauté</span>
          </h2>
          <p style={{ fontSize: 16, color: "#6b6f86", lineHeight: 1.7 }}>
            Notre équipe pastorale est dédiée à vous accompagner dans votre parcours spirituel avec amour et excellence.
          </p>
        </div>

        {members && members.length > 0 ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 22 }} className="arc-cards4">
            {members.map((m: TeamMember) => (
              <div
                key={m.id}
                className="arc-team-card"
                style={{
                  background: "#fff",
                  border: "1px solid rgba(30,36,100,.12)",
                  borderRadius: 20,
                  overflow: "hidden",
                  textAlign: "center",
                  cursor: "pointer",
                }}
              >
                <div style={{ height: 220, background: "linear-gradient(150deg,#2b327f,#141738)", position: "relative" }}>
                  {m.avatar_url ? (
                    <Image src={m.avatar_url} alt={m.name} fill sizes="(max-width:900px) 50vw, 25vw" style={{ objectFit: "cover" }} />
                  ) : (
                    <>
                      <div style={{ position: "absolute", inset: 0, backgroundImage: "repeating-linear-gradient(135deg,rgba(255,255,255,.05) 0 2px,transparent 2px 20px)" }} />
                      <div style={{ position: "absolute", left: 0, right: 0, bottom: 10, fontFamily: "monospace", fontSize: 10, color: "rgba(255,255,255,.5)" }}>
                        [ Portrait ]
                      </div>
                    </>
                  )}
                </div>
                <div style={{ padding: 20 }}>
                  <div className="font-serif" style={{ fontSize: 21, fontWeight: 600, color: "#1e2464" }}>{m.name}</div>
                  <div style={{ fontSize: 12.5, color: "#C9A227", fontWeight: 700, letterSpacing: ".04em", textTransform: "uppercase", marginTop: 4 }}>
                    {m.role_label}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* Placeholder cards */
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 22 }} className="arc-cards4">
            {[
              { name: "Pedro Obova", role: "Pasteur principal" },
              { name: "Équipe pastorale", role: "Bergers" },
              { name: "Louange & Gospel", role: "Ministère" },
              { name: "Accueil & Familles", role: "Ministère" },
            ].map((m) => (
              <div
                key={m.name}
                style={{ background: "#fff", border: "1px solid rgba(30,36,100,.12)", borderRadius: 20, overflow: "hidden", textAlign: "center" }}
              >
                <div style={{ height: 220, background: "linear-gradient(150deg,#2b327f,#141738)", position: "relative" }}>
                  <div style={{ position: "absolute", inset: 0, backgroundImage: "repeating-linear-gradient(135deg,rgba(255,255,255,.05) 0 2px,transparent 2px 20px)" }} />
                  <div style={{ position: "absolute", left: 0, right: 0, bottom: 10, fontFamily: "monospace", fontSize: 10, color: "rgba(255,255,255,.5)" }}>[ Portrait ]</div>
                </div>
                <div style={{ padding: 20 }}>
                  <div className="font-serif" style={{ fontSize: 21, fontWeight: 600, color: "#1e2464" }}>{m.name}</div>
                  <div style={{ fontSize: 12.5, color: "#C9A227", fontWeight: 700, letterSpacing: ".04em", textTransform: "uppercase", marginTop: 4 }}>{m.role}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <style>{`
        .arc-team-card { transition: box-shadow .2s, transform .2s; }
        .arc-team-card:hover { box-shadow: 0 16px 40px rgba(20,23,56,.14); transform: translateY(-4px); }
        @media (max-width: 900px) {
          .arc-cards4 { grid-template-columns: repeat(2,1fr) !important; }
        }
        @media (max-width: 480px) {
          .arc-cards4 { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </section>
  );
}
