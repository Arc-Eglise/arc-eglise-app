import { createClient } from "@/lib/supabase/server";
import ContactForm from "./ContactForm";
import Icon from "@/components/ui/Icon";
import { ExternalLink } from "lucide-react";

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

const SOCIAL_META: Record<string, { color: string; icon: React.JSX.Element }> = {
  social_facebook: {
    color: "#1877F2",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" width="22" height="22" aria-hidden="true">
        <path d="M24 12.073c0-6.627-5.373-12-12-12S0 5.446 0 12.073c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953h-1.514c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
      </svg>
    ),
  },
  social_instagram: {
    color: "#E1306C",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" width="22" height="22" aria-hidden="true">
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
      </svg>
    ),
  },
  social_youtube: {
    color: "#FF0000",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24" aria-hidden="true">
        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
      </svg>
    ),
  },
  social_whatsapp: {
    color: "#25D366",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" width="22" height="22" aria-hidden="true">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/>
      </svg>
    ),
  },
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
    { key: "social_facebook",  label: "Facebook",  href: s.social_facebook },
    { key: "social_instagram", label: "Instagram", href: s.social_instagram },
    { key: "social_youtube",   label: "YouTube",   href: s.social_youtube },
    { key: "social_whatsapp",  label: "WhatsApp",  href: s.social_whatsapp },
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
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
              }}
            >
              <ExternalLink size={11} />
              Ouvrir dans Maps
            </a>
          </div>

          {/* Socials */}
          {SOCIALS.length > 0 && (
            <div style={{ display: "flex", gap: 10 }}>
              {SOCIALS.map((soc) => {
                const meta = SOCIAL_META[soc.key] ?? { color: "#1e2464", icon: null };
                return (
                  <a
                    key={soc.label}
                    href={soc.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={soc.label}
                    title={soc.label}
                    style={{
                      textDecoration: "none",
                      width: 46, height: 46,
                      borderRadius: 12,
                      background: "#fff",
                      border: "1px solid rgba(30,36,100,.12)",
                      display: "grid", placeItems: "center",
                      color: meta.color,
                      transition: "transform .15s",
                    }}
                    className="arc-social-btn"
                  >
                    {meta.icon}
                  </a>
                );
              })}
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
        .arc-social-btn:hover { transform: translateY(-2px); }
      `}</style>
    </section>
  );
}
