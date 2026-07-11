import { createClient } from "@/lib/supabase/server";
import type { ArcEvent } from "@/lib/supabase/types";
import Icon, { type IconName } from "@/components/ui/Icon";

const CULTE_DEFAULTS: { iconName: IconName; label: string }[] = [
  { iconName: "lieu-de-culte", label: "Dimanche 09h30 — Culte principal" },
  { iconName: "priere-bible",  label: "Dimanche 17h00 — Culte du soir" },
  { iconName: "priere-bible",  label: "Mercredi 19h00 — Prière & Parole" },
];

export default async function EventsSection() {
  const supabase = createClient();

  const [{ data: events }, { data: settingsRows }] = await Promise.all([
    supabase
      .from("events")
      .select(`*, registrations_count:event_registrations(count)`)
      .eq("is_published", true)
      .eq("is_public", true)
      .gte("date", new Date().toISOString().split("T")[0])
      .order("date", { ascending: true })
      .limit(3),
    supabase
      .from("site_settings")
      .select("key, value")
      .in("key", ["culte_1_label", "culte_2_label", "culte_3_label"]),
  ]);

  const s: Record<string, string> = {};
  for (const row of settingsRows ?? []) s[row.key] = row.value;

  const CULTES = CULTE_DEFAULTS.map((c, i) => {
    const raw = s[`culte_${i + 1}_label`] ?? c.label;
    const [dayPart, namePart] = raw.split(" — ");
    return {
      iconName: c.iconName,
      day:  dayPart?.trim() ?? raw,
      name: namePart?.trim() ?? "",
      time: dayPart?.match(/\d{2}h\d{2}/)?.[0] ?? "",
    };
  });

  type EventWithCount = ArcEvent & { registrations_count: { count: number }[] };
  const featured  = events?.[0] as EventWithCount | undefined;
  const upcoming  = (events?.slice(1) ?? []) as EventWithCount[];

  return (
    <section id="evenements" style={{ maxWidth: 1240, margin: "0 auto", padding: "96px 32px" }}>
      {/* Header */}
      <div style={{ textAlign: "center", maxWidth: 620, margin: "0 auto 48px" }}>
        <div style={{ fontSize: 12, letterSpacing: ".2em", textTransform: "uppercase", color: "#C9A227", fontWeight: 700, marginBottom: 14 }}>
          Agenda
        </div>
        <h2 className="font-serif" style={{ fontWeight: 600, fontSize: "clamp(34px,4vw,52px)", lineHeight: 1.05, color: "#1e2464", marginBottom: 16 }}>
          Événements & Cultes
        </h2>
        <p style={{ fontSize: 16, color: "#6b6f86", lineHeight: 1.7 }}>
          Rejoignez-nous pour nos célébrations, formations et événements spéciaux tout au long de l'année.
        </p>
      </div>

      {/* Grid: featured (left) + cultes (right) */}
      <div style={{ display: "grid", gridTemplateColumns: "1.15fr .85fr", gap: 24, alignItems: "start" }} className="arc-two">

        {/* Featured event */}
        {featured ? (
          <div style={{ background: "#1e2464", color: "#fff", borderRadius: 22, overflow: "hidden", boxShadow: "0 24px 56px rgba(20,23,56,.28)" }}>
            <div style={{ position: "relative", height: 220, background: "linear-gradient(150deg,#3a4196,#1e2464)" }}>
              <div style={{ position: "absolute", inset: 0, backgroundImage: "repeating-linear-gradient(135deg,rgba(255,255,255,.05) 0 2px,transparent 2px 22px)" }} />
              <div style={{ position: "absolute", top: 18, left: 18, background: "#C9A227", color: "#141738", fontWeight: 700, fontSize: 12, padding: "6px 13px", borderRadius: 999 }}>
                À LA UNE {featured.price_chf > 0 ? `· CHF ${featured.price_chf}` : "· Gratuit"}
              </div>
              <div style={{ position: "absolute", bottom: 16, left: 18, fontFamily: "monospace", fontSize: 11, color: "rgba(255,255,255,.5)" }}>
                [ Photo — {featured.title} ]
              </div>
            </div>
            <div style={{ padding: 28 }}>
              <div style={{ display: "flex", gap: 18, marginBottom: 14 }}>
                <div style={{ textAlign: "center", background: "rgba(255,255,255,.1)", borderRadius: 12, padding: "10px 16px" }}>
                  <div className="font-serif" style={{ fontSize: 30, fontWeight: 700, lineHeight: 1 }}>
                    {new Date(featured.date + "T12:00:00").getDate()}
                  </div>
                  <div style={{ fontSize: 11, letterSpacing: ".1em", textTransform: "uppercase" }}>
                    {new Date(featured.date + "T12:00:00").toLocaleDateString("fr-CH", { month: "short" })}
                  </div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", justifyContent: "center" }}>
                  <h3 className="font-serif" style={{ fontSize: 28, fontWeight: 600 }}>{featured.title}</h3>
                  <div style={{ fontSize: 13.5, color: "rgba(255,255,255,.65)", marginTop: 3 }}>
                    {featured.time_start?.slice(0, 5)}{featured.time_end ? ` — ${featured.time_end.slice(0, 5)}` : ""} · {featured.location}
                  </div>
                </div>
              </div>
              {featured.description && (
                <p style={{ fontSize: 14.5, color: "rgba(255,255,255,.7)", lineHeight: 1.6, marginBottom: 18 }}>{featured.description}</p>
              )}
              <a
                href="#contact"
                style={{
                  textDecoration: "none",
                  display: "inline-block",
                  background: "#C9A227", color: "#141738",
                  padding: "14px 28px", borderRadius: 999,
                  fontWeight: 700, fontSize: 14.5,
                }}
              >
                Réserver ma place
              </a>
            </div>
          </div>
        ) : (
          /* Aucun événement publié */
          <div style={{ background: "#1e2464", color: "#fff", borderRadius: 22, overflow: "hidden", boxShadow: "0 24px 56px rgba(20,23,56,.28)", minHeight: 260, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ textAlign: "center", padding: 40 }}>
              <Icon name="agenda" variant="line" size={52} style={{ marginBottom: 16, opacity: 0.5 }} />
              <div style={{ fontSize: 15, color: "rgba(255,255,255,.6)", lineHeight: 1.6 }}>
                Aucun événement à venir pour le moment.<br />
                Revenez bientôt ou contactez-nous.
              </div>
            </div>
          </div>
        )}

        {/* Cultes schedule */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div className="font-serif" style={{ fontSize: 24, fontWeight: 600, color: "#1e2464", marginBottom: 2, display: "flex", alignItems: "center", gap: 10 }}>
            <Icon name="agenda" size={24} />
            Prochains cultes
          </div>
          {CULTES.map((c) => (
            <div
              key={c.day}
              style={{
                display: "flex", alignItems: "center", gap: 16,
                background: "#fff", border: "1px solid rgba(30,36,100,.12)",
                borderRadius: 14, padding: 18,
              }}
            >
              <div style={{ width: 54, height: 54, borderRadius: 12, display: "grid", placeItems: "center", flexShrink: 0 }}>
                <Icon name={c.iconName} variant="tile" size={54} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, color: "#1e2464", fontSize: 15 }}>{c.day}</div>
                <div style={{ fontSize: 13, color: "#6b6f86" }}>{c.name}</div>
              </div>
              <div className="font-serif" style={{ fontSize: 20, fontWeight: 600, color: "#C9A227" }}>{c.time}</div>
            </div>
          ))}
          <a
            href="#contact"
            style={{ textDecoration: "none", color: "#1e2464", fontWeight: 600, fontSize: 14, marginTop: 4, alignSelf: "flex-start" }}
            className="arc-link"
          >
            Voir tous les horaires →
          </a>

          {/* Additional upcoming events */}
          {upcoming.length > 0 && (
            <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ fontSize: 12, letterSpacing: ".12em", textTransform: "uppercase", color: "#6b6f86", fontWeight: 700 }}>
                Prochainement
              </div>
              {upcoming.map((ev) => (
                <div
                  key={ev.id}
                  style={{
                    display: "flex", alignItems: "center", gap: 14,
                    background: "#fff", border: "1px solid rgba(30,36,100,.12)",
                    borderRadius: 12, padding: "13px 16px",
                  }}
                >
                  <div style={{ textAlign: "center", minWidth: 42 }}>
                    <div className="font-serif" style={{ fontSize: 20, fontWeight: 700, color: "#1e2464", lineHeight: 1 }}>
                      {new Date(ev.date + "T12:00:00").getDate()}
                    </div>
                    <div style={{ fontSize: 10, letterSpacing: ".08em", textTransform: "uppercase", color: "#6b6f86" }}>
                      {new Date(ev.date + "T12:00:00").toLocaleDateString("fr-CH", { month: "short" })}
                    </div>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, color: "#1e2464", fontSize: 14, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {ev.title}
                    </div>
                    <div style={{ fontSize: 12, color: "#6b6f86" }}>
                      {ev.time_start?.slice(0, 5)} · {ev.location}
                    </div>
                  </div>
                  {ev.price_chf > 0 && (
                    <div style={{ fontSize: 12, fontWeight: 700, color: "#C9A227", flexShrink: 0 }}>
                      CHF {ev.price_chf}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <style>{`
        @media (max-width: 820px) {
          .arc-two { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </section>
  );
}
