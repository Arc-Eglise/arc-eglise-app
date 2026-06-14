"use client";

import { useState } from "react";

const INFOS = [
  {
    icon: "📍",
    title: "Adresse",
    text: "Av. Charles-Naine 39\n2300 La Chaux-de-Fonds, Suisse",
  },
  {
    icon: "✉️",
    title: "Email",
    text: "contact@arc-eglise.ch",
  },
  {
    icon: "🕐",
    title: "Horaires des cultes",
    text: "Dimanche 09h30 & 17h00\nMercredi 19h00 — Prière & Parole",
  },
];

const SUBJECTS = [
  "Je souhaite visiter l'église",
  "Question sur un événement",
  "Demande de prière",
  "Information générale",
  "Autre",
];

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
    <section id="contact" className="py-24 bg-white">
      <div className="max-w-8xl mx-auto px-5 md:px-10">

        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 text-[9px] font-bold tracking-[3px] uppercase text-arc-blue mb-4">
            <span className="w-5 h-px bg-arc-blue" />
            Nous trouver
            <span className="w-5 h-px bg-arc-blue" />
          </div>
          <h2 className="font-serif text-[38px] md:text-[44px] font-bold text-arc-navy leading-[1.15] mb-4">
            Venez nous rendre visite
          </h2>
          <p className="text-base text-arc-text2 leading-relaxed max-w-[560px] mx-auto">
            Nous vous accueillons avec joie. N'hésitez pas à nous contacter pour toute question.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">

          {/* Left — infos + map + socials */}
          <div>
            <div className="flex flex-col gap-[22px] mb-[22px]">
              {INFOS.map((info) => (
                <div key={info.title} className="flex gap-4 items-start">
                  <div className="w-[50px] h-[50px] rounded-[14px] bg-arc-blueBg flex items-center justify-center text-[22px] flex-shrink-0">
                    {info.icon}
                  </div>
                  <div>
                    <div className="text-[15px] font-bold text-arc-navy mb-1">{info.title}</div>
                    <div className="text-sm text-arc-text2 leading-[1.7] whitespace-pre-line">{info.text}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Map */}
            <a
              href="https://maps.google.com/?q=Av+Charles-Naine+39+La+Chaux-de-Fonds"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center h-[220px] rounded-[20px] bg-arc-bg border border-arc-border hover:border-arc-bluePale transition-colors cursor-pointer group"
            >
              <div className="text-center">
                <div className="text-4xl mb-2">🗺️</div>
                <div className="text-sm font-semibold text-arc-navy group-hover:text-arc-blue transition-colors">
                  Voir sur Google Maps →
                </div>
                <div className="text-xs text-arc-text3 mt-1">Av. Charles-Naine 39, La Chaux-de-Fonds</div>
              </div>
            </a>

            {/* Socials */}
            <div className="flex gap-2.5 mt-[22px]">
              {[
                { icon: "📘", label: "Facebook",  href: "https://www.facebook.com/ARCEgliseCDF" },
                { icon: "📸", label: "Instagram", href: "https://www.instagram.com/arc.eglise" },
                { icon: "▶️", label: "YouTube",   href: "https://www.youtube.com/@ARCEglise" },
                { icon: "📱", label: "WhatsApp",  href: "https://wa.me/41000000000" },
              ].map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={s.label}
                  className="w-11 h-11 rounded-xl bg-arc-bg border border-arc-border flex items-center justify-center text-lg hover:bg-arc-blueBg hover:-translate-y-0.5 transition-all duration-200"
                >
                  {s.icon}
                </a>
              ))}
            </div>
          </div>

          {/* Right — form */}
          <div>
            {sent ? (
              <div className="h-full flex flex-col items-center justify-center text-center py-16">
                <div className="text-5xl mb-4">🙏</div>
                <h3 className="font-serif text-2xl font-bold text-arc-navy mb-2">Message envoyé !</h3>
                <p className="text-arc-text2">Nous vous répondrons dans les 48h. Que Dieu vous bénisse.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-arc-red">
                    ⚠️ {error}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-[0.8px] text-arc-blue mb-1.5">
                      Prénom *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Marie"
                      value={form.first_name}
                      onChange={set("first_name")}
                      className="w-full px-4 py-3 rounded-[10px] border-[1.5px] border-arc-border bg-arc-bg text-sm font-sans text-arc-text outline-none focus:border-arc-navy focus:bg-white transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-[0.8px] text-arc-blue mb-1.5">
                      Nom *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Dupont"
                      value={form.last_name}
                      onChange={set("last_name")}
                      className="w-full px-4 py-3 rounded-[10px] border-[1.5px] border-arc-border bg-arc-bg text-sm font-sans text-arc-text outline-none focus:border-arc-navy focus:bg-white transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-[0.8px] text-arc-blue mb-1.5">
                    Email *
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="marie@exemple.ch"
                    value={form.email}
                    onChange={set("email")}
                    className="w-full px-4 py-3 rounded-[10px] border-[1.5px] border-arc-border bg-arc-bg text-sm font-sans text-arc-text outline-none focus:border-arc-navy focus:bg-white transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-[0.8px] text-arc-blue mb-1.5">
                    Sujet
                  </label>
                  <select
                    value={form.subject}
                    onChange={set("subject")}
                    className="w-full px-4 py-3 rounded-[10px] border-[1.5px] border-arc-border bg-arc-bg text-sm font-sans text-arc-text outline-none focus:border-arc-navy focus:bg-white transition-colors appearance-none"
                  >
                    {SUBJECTS.map((s) => <option key={s}>{s}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-[0.8px] text-arc-blue mb-1.5">
                    Message *
                  </label>
                  <textarea
                    required
                    rows={5}
                    placeholder="Votre message…"
                    value={form.message}
                    onChange={set("message")}
                    className="w-full px-4 py-3 rounded-[10px] border-[1.5px] border-arc-border bg-arc-bg text-sm font-sans text-arc-text outline-none focus:border-arc-navy focus:bg-white transition-colors resize-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={sending}
                  className="w-full py-4 rounded-[11px] bg-arc-navy text-white text-sm font-bold hover:bg-arc-navy2 hover:-translate-y-0.5 hover:shadow-arc transition-all duration-300 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {sending ? "Envoi en cours…" : "Envoyer le message ✉️"}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
