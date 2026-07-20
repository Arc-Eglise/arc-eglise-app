import Image          from "next/image";
import { createClient } from "@/lib/supabase/server";
import { DONS_ENABLED } from "@/lib/features";
import Icon from "@/components/ui/Icon";

const NAV = [
  { label: "Accueil",     href: "#accueil" },
  { label: "À propos",   href: "#apropos" },
  { label: "Sermons",    href: "#sermons" },
  { label: "Événements", href: "#evenements" },
  { label: "Équipe",     href: "#equipe" },
  ...(DONS_ENABLED ? [{ label: "Donner", href: "#dons" }] : []),
  { label: "Contact",    href: "#contact" },
];

const COMMUNITY = [
  { label: "Espace Membres",    href: "/espace-membres" },
  { label: "Groupes",           href: "/espace-membres" },
  { label: "Prière",            href: "/espace-membres" },
  { label: "Bible",             href: "/espace-membres" },
  { label: "Événements privés", href: "/espace-membres" },
];

const SOCIAL_DEFS = [
  { key: "social_facebook",  label: "Facebook",  color: "#1877F2" },
  { key: "social_instagram", label: "Instagram", color: "#E1306C" },
  { key: "social_youtube",   label: "YouTube",   color: "#FF0000" },
  { key: "social_whatsapp",  label: "WhatsApp",  color: "#25D366" },
  { key: "social_zoom",      label: "Zoom",      color: "#2D8CFF" },
];

const SOCIAL_ICONS: Record<string, React.JSX.Element> = {
  social_facebook: (
    <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20" aria-hidden="true">
      <path d="M24 12.073c0-6.627-5.373-12-12-12S0 5.446 0 12.073c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953h-1.514c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
    </svg>
  ),
  social_instagram: (
    <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20" aria-hidden="true">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
    </svg>
  ),
  social_youtube: (
    <svg viewBox="0 0 24 24" fill="currentColor" width="22" height="22" aria-hidden="true">
      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
    </svg>
  ),
  social_whatsapp: (
    <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20" aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/>
    </svg>
  ),
  social_zoom: (
    <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20" aria-hidden="true">
      <path d="M24 12c0 6.627-5.373 12-12 12S0 18.627 0 12 5.373 0 12 0s12 5.373 12 12zm-6.857-4.571H7.714A1.714 1.714 0 0 0 6 9.143v5.714A1.714 1.714 0 0 0 7.714 16.57h9.429A1.714 1.714 0 0 0 18.857 14.857V9.143A1.714 1.714 0 0 0 17.143 7.43zM22.286 9.6l-3.429 2.057v.686l3.429 2.057A.429.429 0 0 0 23 14v-4a.429.429 0 0 0-.714-.4z"/>
    </svg>
  ),
};

export default async function Footer() {
  const supabase = createClient();
  const year = new Date().getFullYear();

  // Vérifier si l'utilisateur est un membre validé (pour afficher les liens espace-membres)
  let isMembre = false;
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: prof } = await supabase
        .from("profiles").select("role, validated").eq("id", user.id).single();
      isMembre =
        prof?.role === "admin" ||
        prof?.role === "pasteur" ||
        (prof?.role === "membre" && prof?.validated === true);
    }
  } catch { /* pas d'impact si l'auth échoue */ }

  const s: Record<string, string> = {};
  try {
    const { data } = await supabase
      .from("site_settings")
      .select("key, value")
      .in("key", [
        "social_facebook", "social_instagram", "social_youtube", "social_whatsapp", "social_zoom",
        "social_custom_links",
        "contact_address", "contact_email",
        "culte_1_label", "culte_2_label", "culte_3_label",
      ]);
    for (const row of data ?? []) s[row.key] = row.value;
  } catch { /* silencieux */ }

  const SOCIALS = SOCIAL_DEFS
    .map((d) => ({ key: d.key, label: d.label, href: s[d.key] ?? "", color: d.color }))
    .filter((soc) => soc.href.trim() !== "");

  let customLinks: { label: string; url: string }[] = [];
  try { customLinks = JSON.parse(s.social_custom_links ?? "[]"); } catch { /* ignore */ }
  const customLinksVisible = customLinks.filter(l => l.url?.trim());

  const address  = s.contact_address ?? "Av. Charles-Naine 39\n2300 La Chaux-de-Fonds";
  const email    = s.contact_email   ?? "contact@arc-eglise.ch";
  const horaires = [
    s.culte_1_label ?? "Dimanche 09h30 — Culte principal",
    s.culte_2_label ?? "Dimanche 17h00 — Culte du soir",
    s.culte_3_label ?? "Mercredi 19h00 — Prière",
  ].join("\n");

  const [line1, line2]   = address.split("\n");
  const horaireLines     = horaires.split("\n");

  return (
    <footer style={{ background: "var(--navy-900)", color: "#fff", padding: "72px 32px 36px" }}>
      <div style={{ maxWidth: 1240, margin: "0 auto" }}>

        {/* Top grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1.4fr 1fr 1fr 1.2fr",
            gap: 48,
            paddingBottom: 48,
            borderBottom: "1px solid rgba(255,255,255,.12)",
          }}
          className="arc-footer-grid"
        >
          {/* Brand */}
          <div>
            <div style={{ marginBottom: 18 }}>
              <div style={{ background: "rgba(255,255,255,.95)", borderRadius: 10, padding: "6px 10px", display: "inline-flex" }}>
                <Image
                  src="/images/logo-arc.jpeg"
                  alt="ARC — Ambassade du Royaume de Christ"
                  width={110} height={68}
                  style={{ objectFit: "contain" }}
                />
              </div>
            </div>
            <p style={{ color: "rgba(255,255,255,.6)", fontSize: 14, lineHeight: 1.7, maxWidth: 300 }}>
              Une communauté évangélique vivante à La Chaux-de-Fonds, Suisse.
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 20 }}>
              {SOCIALS.map((soc) => (
                <a
                  key={soc.key}
                  href={soc.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={soc.label}
                  title={soc.label}
                  className="arc-footer-social"
                  style={{
                    textDecoration: "none",
                    width: 44, height: 44, borderRadius: 12,
                    background: "rgba(255,255,255,.1)",
                    display: "grid", placeItems: "center",
                    color: soc.color,
                  }}
                >
                  {SOCIAL_ICONS[soc.key]}
                </a>
              ))}
              {customLinksVisible.map((cl, i) => (
                <a
                  key={i}
                  href={cl.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={cl.label}
                  className="arc-footer-social"
                  style={{
                    textDecoration: "none",
                    height: 44, padding: "0 12px", borderRadius: 12,
                    background: "rgba(255,255,255,.1)",
                    display: "inline-flex", alignItems: "center",
                    color: "rgba(255,255,255,.85)", fontSize: 12, fontWeight: 600,
                    whiteSpace: "nowrap",
                  }}
                >
                  {cl.label}
                </a>
              ))}
            </div>
          </div>

          {/* Navigation */}
          <div>
            <div style={{ fontSize: 12, letterSpacing: ".14em", textTransform: "uppercase", color: "#E6C763", fontWeight: 700, marginBottom: 18 }}>
              Navigation
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
              {NAV.map((n) => (
                <a
                  key={n.label}
                  href={n.href}
                  className="arc-footer-link"
                  style={{ textDecoration: "none", color: "rgba(255,255,255,.7)", fontSize: 14 }}
                >
                  {n.label}
                </a>
              ))}
            </div>
          </div>

          {/* Communauté — visible uniquement aux membres */}
          {isMembre ? (
            <div>
              <div style={{ fontSize: 12, letterSpacing: ".14em", textTransform: "uppercase", color: "#E6C763", fontWeight: 700, marginBottom: 18 }}>
                Communauté
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
                {COMMUNITY.map((c) => (
                  <a
                    key={c.label}
                    href={c.href}
                    className="arc-footer-link"
                    style={{ textDecoration: "none", color: "rgba(255,255,255,.7)", fontSize: 14 }}
                  >
                    {c.label}
                  </a>
                ))}
              </div>
            </div>
          ) : (
            <div>
              <div style={{ fontSize: 12, letterSpacing: ".14em", textTransform: "uppercase", color: "#E6C763", fontWeight: 700, marginBottom: 18 }}>
                Communauté
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
                <a href="#contact" className="arc-footer-link" style={{ textDecoration: "none", color: "rgba(255,255,255,.7)", fontSize: 14 }}>
                  Nous rejoindre
                </a>
                <a href="#apropos" className="arc-footer-link" style={{ textDecoration: "none", color: "rgba(255,255,255,.7)", fontSize: 14 }}>
                  Qui sommes-nous
                </a>
                <a href="#evenements" className="arc-footer-link" style={{ textDecoration: "none", color: "rgba(255,255,255,.7)", fontSize: 14 }}>
                  Événements
                </a>
                <a href="/inscription" className="arc-footer-link" style={{ textDecoration: "none", color: "rgba(255,255,255,.7)", fontSize: 14 }}>
                  Devenir membre
                </a>
              </div>
            </div>
          )}

          {/* Contact */}
          <div>
            <div style={{ fontSize: 12, letterSpacing: ".14em", textTransform: "uppercase", color: "#E6C763", fontWeight: 700, marginBottom: 18 }}>
              Contact
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 11, color: "rgba(255,255,255,.7)", fontSize: 14, lineHeight: 1.5 }}>
              <span style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                <Icon name="nous-trouver" size={16} style={{ flexShrink: 0, marginTop: 1, opacity: 0.7 }} />
                <span>{line1}{line2 ? <><br />{line2}</> : null}</span>
              </span>
              <span style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <Icon name="mail" size={16} style={{ flexShrink: 0, opacity: 0.7 }} />
                {email}
              </span>
              {horaireLines.map((h, i) => (
                <span key={i} style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <Icon name="agenda" size={16} style={{ flexShrink: 0, opacity: 0.7 }} />
                  {h}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div style={{ paddingTop: 28, display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 14, fontSize: 13, color: "rgba(255,255,255,.5)" }}>
          <span>© {year} ARC — Ambassade du Royaume de Christ · La Chaux-de-Fonds, Suisse</span>
          <span style={{ display: "flex", gap: 20 }}>
            {["Mentions légales", "Confidentialité", "nLPD"].map((l) => (
              <a key={l} href="#contact" className="arc-footer-link" style={{ color: "rgba(255,255,255,.5)", textDecoration: "none" }}>
                {l}
              </a>
            ))}
          </span>
        </div>
      </div>

      <style>{`
        @media (max-width: 900px) {
          .arc-footer-grid { grid-template-columns: 1fr 1fr !important; }
        }
        @media (max-width: 540px) {
          .arc-footer-grid { grid-template-columns: 1fr !important; }
        }
        .arc-footer-social:hover { opacity: .8; }
      `}</style>
    </footer>
  );
}
