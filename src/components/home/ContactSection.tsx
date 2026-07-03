"use client";

import { useState } from "react";

const INFOS = [
  { icon: "📍", label: "Adresse",           value: "Av. Charles-Naine 39\n2300 La Chaux-de-Fonds, Suisse" },
  { icon: "✉️", label: "Email",             value: "contact@arc-eglise.ch" },
  { icon: "🕐", label: "Horaires des cultes", value: "Dimanche 09h30 & 17h00\nMercredi 19h00 — Prière & Parole" },
];

const SUBJECTS = [
  "Je souhaite visiter l'église",
  "Question sur un événement",
  "Demande de prière",
  "Information générale",
  "Autre",
];

const SOCIALS = [
  { icon: "📘", label: "Facebook",  href: "https://www.facebook.com/ARCEgliseCDF" },
  { icon: "📸", label: "Instagram", href: "https://www.instagram.com/arc.eglise" },
  { icon: "▶️", label: "YouTube",   href: "https://www.youtube.com/@ARCEglise" },
  { icon: "📱", label: "WhatsApp",  href: "https://wa.me/41000000000" },
];

const INPUT_STYLE = {
  width: "100%",
  padding: "13px 15px",
  border: "1.5px solid rgba(30,36,100,.12)",
  borderRadius: 11,
  fontSize: 14.5,
  color: "#1a1c2e",
  boxSizing: "border-box" as const,
  outline: "none",
  background: "#fff",
};

const LABEL_STYLE = {
  display: "block",
  fontSize: 13,
  fontWeight: 600,
  color: "#1e2464",
  marginBottom: 7,
};

export default function ContactSection() {
  const [sent,    setSent]    = useState(false);
  const [sending, setSending] = useState(false);
  const [error,   setError]   = useState<string | null>(null);
  const [form, setForm] = useState({
    first_name: "",
    last_name:  "",
    email:      "",
    subject:    SUBJECTS[0],
    message:    "",
  });

  const set =
    (k: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    setError(null);
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Erreur serveur");
      }
      setSent(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Impossible d'envoyer. Veuillez réessayer.");
    } finally {
      setSending(false);
    }
  };

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
          Nous vous accueillons avec joie. N'hésitez pas à nous contacter pour toute question.
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
              <div style={{ width: 50, height: 50, borderRadius: 13, background: "rgba(30,36,100,.07)", display: "grid", placeItems: "center", fontSize: 22, flexShrink: 0 }}>
                {ci.icon}
              </div>
              <div>
                <div style={{ fontWeight: 700, color: "#1e2464", fontSize: 15, marginBottom: 4 }}>{ci.label}</div>
                <div style={{ fontSize: 14, color: "#6b6f86", lineHeight: 1.6, whiteSpace: "pre-line" }}>{ci.value}</div>
              </div>
            </div>
          ))}

          {/* Map */}
          <a
            href="https://maps.google.com/?q=Av+Charles-Naine+39+La+Chaux-de-Fonds"
            target="_blank"
            rel="noopener noreferrer"
            style={{ textDecoration: "none", display: "block", borderRadius: 16, overflow: "hidden", border: "1px solid rgba(30,36,100,.12)" }}
          >
            <div style={{ height: 150, background: "linear-gradient(150deg,#2b327f,#141738)", position: "relative" }}>
              <div style={{ position: "absolute", inset: 0, backgroundImage: "repeating-linear-gradient(45deg,rgba(255,255,255,.04) 0 1px,transparent 1px 16px),repeating-linear-gradient(-45deg,rgba(255,255,255,.04) 0 1px,transparent 1px 16px)" }} />
              <div style={{ position: "absolute", left: "50%", top: "50%", transform: "translate(-50%,-50%)", textAlign: "center", color: "#fff" }}>
                <div style={{ fontSize: 26 }}>📍</div>
                <div style={{ fontSize: 12.5, fontWeight: 700, marginTop: 4 }}>🗺️ Voir sur Google Maps →</div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,.6)" }}>Av. Charles-Naine 39, La Chaux-de-Fonds</div>
              </div>
            </div>
          </a>

          {/* Socials */}
          <div style={{ display: "flex", gap: 10 }}>
            {SOCIALS.map((s) => (
              <a
                key={s.label}
                href={s.href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={s.label}
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
                {s.icon}
              </a>
            ))}
          </div>
        </div>

        {/* Right — contact form */}
        <div>
          {sent ? (
            <div style={{ padding: "64px 32px", textAlign: "center" }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>🙏</div>
              <h3 className="font-serif" style={{ fontSize: 28, fontWeight: 600, color: "#1e2464", marginBottom: 8 }}>Message envoyé !</h3>
              <p style={{ color: "#6b6f86", fontSize: 15 }}>Nous vous répondrons dans les 48h. Que Dieu vous bénisse.</p>
            </div>
          ) : (
            <form
              onSubmit={handleSubmit}
              style={{
                background: "#fff",
                border: "1px solid rgba(30,36,100,.12)",
                borderRadius: 22,
                padding: 32,
                boxShadow: "0 18px 44px rgba(20,23,56,.08)",
              }}
            >
              {error && (
                <div style={{ background: "#fff5f5", border: "1px solid #fed7d7", borderRadius: 10, padding: "12px 16px", fontSize: 13, color: "#c53030", marginBottom: 16 }}>
                  ⚠️ {error}
                </div>
              )}

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
                <div>
                  <label style={LABEL_STYLE}>Prénom *</label>
                  <input required type="text" placeholder="Marie" value={form.first_name} onChange={set("first_name")} style={INPUT_STYLE} />
                </div>
                <div>
                  <label style={LABEL_STYLE}>Nom *</label>
                  <input required type="text" placeholder="Dupont" value={form.last_name} onChange={set("last_name")} style={INPUT_STYLE} />
                </div>
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={LABEL_STYLE}>Email *</label>
                <input required type="email" placeholder="marie@exemple.ch" value={form.email} onChange={set("email")} style={INPUT_STYLE} />
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={LABEL_STYLE}>Sujet</label>
                <select value={form.subject} onChange={set("subject")} style={{ ...INPUT_STYLE, appearance: "none" as const }}>
                  {SUBJECTS.map((s) => <option key={s}>{s}</option>)}
                </select>
              </div>

              <div style={{ marginBottom: 20 }}>
                <label style={LABEL_STYLE}>Message *</label>
                <textarea required rows={4} placeholder="Votre message…" value={form.message} onChange={set("message")} style={{ ...INPUT_STYLE, resize: "vertical" }} />
              </div>

              <button
                type="submit"
                disabled={sending}
                style={{
                  width: "100%",
                  padding: 16,
                  border: "none",
                  borderRadius: 13,
                  background: "#1e2464",
                  color: "#fff",
                  fontWeight: 700,
                  fontSize: 15.5,
                  cursor: "pointer",
                  boxShadow: "0 12px 28px rgba(30,36,100,.28)",
                  opacity: sending ? 0.7 : 1,
                  transition: "opacity .15s",
                }}
              >
                {sending ? "Envoi en cours…" : "Envoyer le message ✉️"}
              </button>
            </form>
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
