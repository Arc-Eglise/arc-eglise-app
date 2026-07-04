import Image from "next/image";

const SOCIALS = [
  { icon: "📘", label: "Facebook",  href: "https://www.facebook.com/ARCEgliseCDF" },
  { icon: "📸", label: "Instagram", href: "https://www.instagram.com/arc.eglise" },
  { icon: "▶️", label: "YouTube",   href: "https://www.youtube.com/@ARCEglise" },
  { icon: "📱", label: "WhatsApp",  href: "https://wa.me/41000000000" },
];

const NAV = [
  { label: "Accueil",     href: "#accueil" },
  { label: "À propos",   href: "#apropos" },
  { label: "Sermons",    href: "#sermons" },
  { label: "Événements", href: "#evenements" },
  { label: "Équipe",     href: "#equipe" },
  { label: "Donner",     href: "#dons" },
  { label: "Contact",    href: "#contact" },
];

const COMMUNITY = [
  { label: "Espace Membres",    href: "/espace-membres" },
  { label: "Groupes",           href: "/espace-membres" },
  { label: "Prière",            href: "/espace-membres" },
  { label: "Bible",             href: "/espace-membres" },
  { label: "Événements privés", href: "/espace-membres" },
];

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer style={{ background: "#141738", color: "#fff", padding: "72px 32px 36px" }}>
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
            <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
              {SOCIALS.map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={s.label}
                  className="arc-footer-social"
                  style={{
                    textDecoration: "none",
                    width: 40, height: 40, borderRadius: 10,
                    background: "rgba(255,255,255,.08)",
                    display: "grid", placeItems: "center",
                    fontSize: 16,
                  }}
                >
                  {s.icon}
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

          {/* Communauté */}
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

          {/* Contact */}
          <div>
            <div style={{ fontSize: 12, letterSpacing: ".14em", textTransform: "uppercase", color: "#E6C763", fontWeight: 700, marginBottom: 18 }}>
              Contact
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 11, color: "rgba(255,255,255,.7)", fontSize: 14, lineHeight: 1.5 }}>
              <span>📍 Av. Charles-Naine 39<br />2300 La Chaux-de-Fonds</span>
              <span>📧 contact@arc-eglise.ch</span>
              <span>🗓 Dim 09h30 & 17h00</span>
              <span>🗓 Mer 19h00 — Prière</span>
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
      `}</style>
    </footer>
  );
}
