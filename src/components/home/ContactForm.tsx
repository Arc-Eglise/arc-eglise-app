"use client";

import { useState } from "react";

const SUBJECTS = [
  "Je souhaite visiter l'église",
  "Question sur un événement",
  "Demande de prière",
  "Information générale",
  "Autre",
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

export default function ContactForm() {
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

  if (sent) {
    return (
      <div style={{ padding: "64px 32px", textAlign: "center" }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🙏</div>
        <h3 className="font-serif" style={{ fontSize: 28, fontWeight: 600, color: "#1e2464", marginBottom: 8 }}>
          Message envoyé !
        </h3>
        <p style={{ color: "#6b6f86", fontSize: 15 }}>Nous vous répondrons dans les 48h. Que Dieu vous bénisse.</p>
      </div>
    );
  }

  return (
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
  );
}
