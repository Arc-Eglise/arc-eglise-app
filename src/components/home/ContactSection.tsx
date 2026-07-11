import { createClient } from "@/lib/supabase/server";
import ContactForm from "./ContactForm";
import Icon from "@/components/ui/Icon";

const DEFAULTS: Record<string, string> = {
  contact_address:  "Av. Charles-Naine 39\n2300 La Chaux-de-Fonds, Suisse",
  contact_email:    "contact@arc-eglise.ch",
  contact_horaires: "Dimanche 09h30 & 17h00\nMercredi 19h00 — Prière & Parole",
  contact_map_url:  "https://maps.google.com/?q=Av+Charles-Naine+39+La+Chaux-de-Fonds",
  social_facebook:  "https://www.facebook.com/ARCEgliseCDF",
  social_instagram: "https://www.instagram.com/arc.eglise",
  social_youtube:   "https://www.youtube.com/@ARCEglise",
  social_whatsapp:  "https://wa.me/41000000000",
};

export default async function ContactSection() {
  const supabase = createClient();

  let s = { ...DEFAULTS };
  try {
    const { data } = await supabase
      .from("site_settings")
      .select("key, value")
      .in("key", Object.keys(DEFAULTS));
    if (data) {
      for (const row of data) s[row.key] = row.value;
    }
  } catch {
    // fallback to defaults
  }

  const INFOS = [
    { icon: "nous-trouver" as const, label: "Adresse",            value: s.contact_address },
    { icon: "mail" as const,         label: "Email",              value: s.contact_email },
    { icon: "agenda" as const,       label: "Horaires des cultes", value: s.contact_horaires },
  ];

  const SOCIALS = [
    { icon: "📘", label: "Facebook",  href: s.social_facebook },
    { icon: "📸", label: "Instagram", href: s.social_instagram },
    { icon: "▶️", label: "YouTube",   href: s.social_youtube },
    { icon: "📱", label: "WhatsApp",  href: s.social_whatsapp },
  ].filter((soc) => soc.href && soc.href.trim() !== "");

  return (
    <section id="contact" style={{ maxWidth: 1240, margin: "0 auto", padding: "96px 32px" }}>
      {/* Header */}
      <div style={{ textAlign: "center", maxWidth: 620, margin: "0 auto 52px" }}>
        <div style={{ fontSize: 12, letterSpacing: ".2em", textTransform: "uppercase", color: "#C9A227", fontWeight: 700, marginBottom: 14 }}>
          Nous trouver
        </div>
        <h2 className="font-serif" style={{ fontWeight: 600, fontSize: "clamp(34px,4vw,52px)", lineHeight: 1.05, color: "#1e2464", marginBottom: 16 }}>
          Venez nous rendre visite
        </h2>
        <p style={{ fontSize: 16, color: "#6b6f86", lineHeight: 1.7 }}>
          Nous vous accueillons avec joie. N&apos;hésitez pas à nous contacter pour toute question.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: ".9fr 1.1fr", gap: 40, alignItems: "start" }} className="arc-two">

        {/* Left — info cards + map + socials */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {INFOS.map((ci) => (
            <div
              key={ci.label}
              style={{
                background: "#fff",
                border: "1px solid rgba(30,36,100,.12)",
                borderRadius: 16,
                padding: 22,
                display: "flex",
                gap: 16,
              }}
            >
              <div style={{ width: 50, height: 50, flexShrink: 0, display: "grid", placeItems: "center" }}>
                <Icon name={ci.icon} variant="tile" size={50} />
              </div>
              <div>
                <div style={{ fontWeight: 700, color: "#1e2464", fontSize: 15, marginBottom: 4 }}>{ci.label}</div>
                <div style={{ fontSize: 14, color: "#6b6f86", lineHeight: 1.6, whiteSpace: "pre-line" }}>{ci.value}</div>
              </div>
            </div>
          ))}

          {/* Map — embed iframe (no API key needed) */}
          <div style={{ borderRadius: 16, overflow: "hidden", border: "1px solid rgba(30,36,100,.12)", position: "relative" }}>
            <iframe
              title="Localisation ARC"
              src={`https://maps.google.com/maps?q=${encodeURIComponent(s.contact_address.replace(/\n/g, ", "))}&output=embed&hl=fr`}
              width="100%"
              height="180"
              style={{ border: 0, display: "block" }}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
            <a
              href={s.contact_map_url}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                position: "absolute",
                bottom: 8,
                right: 8,
                background: "#1e2464",
                color: "#fff",
                fontSize: 11.5,
                fontWeight: 700,
                padding: "5px 11px",
                borderRadius: 8,
                textDecoration: "none",
              }}
            >
              🗺️ Ouvrir dans Maps
            </a>
          </div>

          {/* Socials */}
          {SOCIALS.length > 0 && (
            <div style={{ display: "flex", gap: 10 }}>
              {SOCIALS.map((soc) => (
                <a
                  key={soc.label}
                  href={soc.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={soc.label}
                  style={{
                    textDecoration: "none",
                    width: 46, height: 46,
                    borderRadius: 12,
                    background: "#fff",
                    border: "1px solid rgba(30,36,100,.12)",
                    display: "grid", placeItems: "center",
                    fontSize: 18,
                    transition: "transform .15s",
                  }}
                  className="arc-social-btn"
                >
                  {soc.icon}
                </a>
              ))}
            </div>
          )}
        </div>

        {/* Right — contact form */}
        <ContactForm />
      </div>

      <style>{`
        @media (max-width: 820px) {
          .arc-two { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </section>
  );
}
