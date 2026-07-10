"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";

const STEPS = ["Identité", "Compte", "Confirmation"];

export default function InscriptionPage() {
  const supabase = createClient();

  const [step,    setStep]    = useState(0);
  const [success, setSuccess] = useState(false);
  const [form, setForm] = useState({
    first_name: "",
    last_name:  "",
    country:    "",
    email:      "",
    password:   "",
    confirm:    "",
  });
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);
  const [showPwd, setShowPwd] = useState(false);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const nextStep = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (step === 0) {
      if (!form.first_name || !form.last_name) {
        setError("Prénom et nom sont obligatoires.");
        return;
      }
    }
    if (step === 1) {
      if (!form.email) { setError("Email obligatoire."); return; }
      if (form.password.length < 8) { setError("Le mot de passe doit contenir au moins 8 caractères."); return; }
      if (form.password !== form.confirm) { setError("Les mots de passe ne correspondent pas."); return; }
    }
    setStep((s) => s + 1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signUp({
      email:    form.email,
      password: form.password,
      options: {
        data: {
          first_name: form.first_name,
          last_name:  form.last_name,
          country:    form.country,
        },
        emailRedirectTo: `${location.origin}/auth/callback`,
      },
    });

    if (error) {
      console.error("[INSCRIPTION] Supabase signUp error:", error.message, error);
      const msg = error.message ?? "";
      setError(
        msg.includes("already registered") || msg.includes("already been registered") || msg.includes("User already registered")
          ? "Cet email est déjà utilisé. Connecte-toi ou utilise un autre email."
          : msg.includes("rate limit") || msg.includes("over_email_send_rate_limit")
          ? "Trop de tentatives d'inscription. Réessaie dans une heure."
          : msg.includes("only request this once every 60 seconds")
          ? "Attends 60 secondes avant de réessayer."
          : msg.includes("Database error") || msg.includes("database error")
          ? `Erreur base de données lors de la création. Contacte le support.`
          : msg.includes("signup") && msg.includes("disabled")
          ? "Les inscriptions sont temporairement désactivées. Contacte le support."
          : msg.includes("invalid") && msg.includes("email")
          ? "Adresse email invalide."
          : msg.includes("Password") || msg.includes("password")
          ? "Le mot de passe ne respecte pas les critères requis."
          : `Erreur lors de l'inscription : ${msg}`
      );
      setLoading(false);
    } else {
      setSuccess(true);
    }
  };

  /* ── Panneau gauche (partagé) ── */
  const leftPanel = (
    <div
      className="hidden lg:flex flex-col justify-between p-12 relative overflow-hidden"
      style={{ background: "linear-gradient(135deg,#0a0d2e 0%,#1e2464 50%,#0f123a 100%)" }}
    >
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: "radial-gradient(circle,rgba(136,153,204,.07) 1px,transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />
      <Link href="/" className="relative z-10">
        <div style={{ background: "rgba(255,255,255,.95)", borderRadius: 12, padding: "8px 14px", display: "inline-flex" }}>
          <Image
            src="/images/logo-arc.jpeg"
            alt="ARC — Ambassade du Royaume de Christ"
            width={140} height={86}
            style={{ objectFit: "contain" }}
            priority
          />
        </div>
      </Link>

      <div className="relative z-10">
        <h2 className="font-serif text-[28px] font-bold text-white mb-2">Rejoins la famille ARC</h2>
        <p className="text-sm text-white/60 mb-8">Une communauté de 250 membres issus de 32 nations.</p>
        <div className="flex flex-col gap-4">
          {[
            { icon: "✍️", title: "Tu remplis le formulaire", desc: "Prénom, nom, email, mot de passe." },
            { icon: "📧", title: "Confirme ton email",       desc: "Un lien de confirmation t'est envoyé." },
            { icon: "✅", title: "Un responsable valide",      desc: "Ton compte Visiteur devient Membre." },
            { icon: "🎉", title: "Bienvenue dans l'ARC !",  desc: "Accès complet à l'espace membres." },
          ].map((j, i) => (
            <div key={i} className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-full bg-arc-navy flex items-center justify-center text-base flex-shrink-0">
                {j.icon}
              </div>
              <div>
                <div className="text-sm font-bold text-white">{j.title}</div>
                <div className="text-[11px] text-white/50">{j.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="relative z-10 text-[11px] text-white/30">
        Données hébergées en Europe · Conformité nLPD Suisse
      </div>
    </div>
  );

  /* ── État succès ── */
  if (success) {
    return (
      <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2">
        {leftPanel}
        <div className="flex items-center justify-center p-6 md:p-12 bg-arc-bg">
          <div className="w-full max-w-[440px] text-center">
            {/* Mobile logo */}
            <Link href="/" className="flex lg:hidden justify-center mb-8">
              <Image src="/images/logo-arc.jpeg" alt="ARC — Ambassade du Royaume de Christ" width={120} height={74} style={{ objectFit: "contain" }} />
            </Link>

            <div className="w-20 h-20 rounded-full bg-green-50 border-4 border-green-200 flex items-center justify-center text-4xl mx-auto mb-6">
              📧
            </div>
            <h1 className="font-serif text-[28px] font-bold text-arc-navy mb-3">
              Vérifie ton email !
            </h1>
            <p className="text-sm text-arc-text2 leading-relaxed mb-2">
              Un lien de confirmation a été envoyé à
            </p>
            <p className="text-sm font-bold text-arc-navy mb-6">{form.email}</p>

            <div className="bg-arc-blueBg border border-arc-bluePale rounded-2xl p-5 text-left mb-6">
              <div className="text-[11px] font-bold uppercase tracking-wider text-arc-blue mb-3">
                Prochaines étapes
              </div>
              {[
                { icon: "1️⃣", text: "Ouvre l'email envoyé par ARC" },
                { icon: "2️⃣", text: "Clique sur « Confirmer mon adresse »" },
                { icon: "3️⃣", text: "Tu seras redirigé vers ton espace membres" },
                { icon: "4️⃣", text: "Un responsable validera ton compte dès que possible." },
              ].map((s, i) => (
                <div key={i} className="flex items-start gap-2.5 mb-2 last:mb-0">
                  <span className="text-sm">{s.icon}</span>
                  <span className="text-sm text-arc-text2">{s.text}</span>
                </div>
              ))}
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-6 text-xs text-amber-700">
              ⏱ L&apos;email peut prendre quelques minutes. Vérifie aussi tes spams.
            </div>

            <div className="flex flex-col gap-3">
              <Link
                href="/connexion"
                className="w-full py-3.5 rounded-xl bg-arc-navy text-white text-sm font-bold hover:bg-arc-navy2 transition-colors text-center"
              >
                Se connecter →
              </Link>
              <Link
                href="/"
                className="w-full py-3.5 rounded-xl border-[1.5px] border-arc-border text-arc-text2 text-sm font-bold hover:bg-arc-bg transition-colors text-center"
              >
                ← Retour à l&apos;accueil
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2">
      {leftPanel}

      {/* RIGHT — form */}
      <div className="flex items-center justify-center p-6 md:p-12 bg-arc-bg">
        <div className="w-full max-w-[440px]">

          {/* Mobile logo */}
          <Link href="/" className="flex lg:hidden items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-arc-navy to-arc-blue flex items-center justify-center">
              <span className="font-serif text-sm font-bold text-white">ARC</span>
            </div>
            <div className="font-serif text-lg font-bold text-arc-navy tracking-[3px]">ARC</div>
          </Link>

          <h1 className="font-serif text-[32px] font-bold text-arc-navy mb-1">
            Créer un compte
          </h1>
          <p className="text-sm text-arc-text2 mb-6">
            Tu rejoins comme <span className="font-bold text-arc-navy">Visiteur</span> — un responsable validera ton accès.
          </p>

          {/* Step bar */}
          <div className="flex mb-8">
            {STEPS.map((s, i) => (
              <div
                key={s}
                className={`flex-1 text-center text-[11px] font-semibold pb-2.5 border-b-[2.5px] transition-all duration-300 ${
                  i === step
                    ? "text-arc-navy border-arc-navy"
                    : i < step
                    ? "text-arc-green border-arc-green"
                    : "text-arc-text3 border-arc-border"
                }`}
              >
                {i < step ? "✓ " : ""}{s}
              </div>
            ))}
          </div>

          {/* Erreur */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-5 text-sm text-arc-red">
              ⚠️ {error}
            </div>
          )}

          {/* Step 0 — Identité */}
          {step === 0 && (
            <form onSubmit={nextStep} className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-[0.8px] text-arc-blue mb-1.5">Prénom *</label>
                  <input
                    type="text" required value={form.first_name} onChange={set("first_name")}
                    placeholder="Marie"
                    className="w-full px-4 py-3.5 rounded-xl border-[1.5px] border-arc-border bg-white text-sm outline-none focus:border-arc-navy transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-[0.8px] text-arc-blue mb-1.5">Nom *</label>
                  <input
                    type="text" required value={form.last_name} onChange={set("last_name")}
                    placeholder="Dupont"
                    className="w-full px-4 py-3.5 rounded-xl border-[1.5px] border-arc-border bg-white text-sm outline-none focus:border-arc-navy transition-colors"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-[0.8px] text-arc-blue mb-1.5">Pays d&apos;origine</label>
                <input
                  type="text" value={form.country} onChange={set("country")}
                  placeholder="Suisse, Congo, France…"
                  className="w-full px-4 py-3.5 rounded-xl border-[1.5px] border-arc-border bg-white text-sm outline-none focus:border-arc-navy transition-colors"
                />
              </div>
              <button type="submit" className="w-full py-4 rounded-xl bg-arc-navy text-white text-sm font-bold hover:bg-arc-navy2 transition-colors mt-1">
                Suivant →
              </button>
            </form>
          )}

          {/* Step 1 — Compte */}
          {step === 1 && (
            <form onSubmit={nextStep} className="flex flex-col gap-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-[0.8px] text-arc-blue mb-1.5">Email *</label>
                <input
                  type="email" required value={form.email} onChange={set("email")}
                  placeholder="marie@exemple.ch"
                  className="w-full px-4 py-3.5 rounded-xl border-[1.5px] border-arc-border bg-white text-sm outline-none focus:border-arc-navy transition-colors"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-[0.8px] text-arc-blue mb-1.5">Mot de passe * (min. 8 caractères)</label>
                <div className="relative">
                  <input
                    type={showPwd ? "text" : "password"} required value={form.password} onChange={set("password")}
                    placeholder="••••••••"
                    className="w-full px-4 py-3.5 pr-12 rounded-xl border-[1.5px] border-arc-border bg-white text-sm outline-none focus:border-arc-navy transition-colors"
                  />
                  <button type="button" onClick={() => setShowPwd(v => !v)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-arc-text3">
                    {showPwd ? "🙈" : "👁️"}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-[0.8px] text-arc-blue mb-1.5">Confirmer le mot de passe *</label>
                <input
                  type={showPwd ? "text" : "password"} required value={form.confirm} onChange={set("confirm")}
                  placeholder="••••••••"
                  className="w-full px-4 py-3.5 rounded-xl border-[1.5px] border-arc-border bg-white text-sm outline-none focus:border-arc-navy transition-colors"
                />
              </div>
              <div className="flex gap-3 mt-1">
                <button type="button" onClick={() => setStep(0)} className="flex-1 py-4 rounded-xl border-[1.5px] border-arc-border text-arc-text2 text-sm font-bold hover:bg-arc-bg transition-colors">
                  ← Retour
                </button>
                <button type="submit" className="flex-1 py-4 rounded-xl bg-arc-navy text-white text-sm font-bold hover:bg-arc-navy2 transition-colors">
                  Suivant →
                </button>
              </div>
            </form>
          )}

          {/* Step 2 — Confirmation */}
          {step === 2 && (
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="bg-arc-blueBg border border-arc-bluePale rounded-xl p-5 text-sm text-arc-text2 leading-relaxed">
                <div className="font-bold text-arc-navy mb-2">Récapitulatif</div>
                <div>👤 {form.first_name} {form.last_name}</div>
                {form.country && <div>🌍 {form.country}</div>}
                <div>✉️ {form.email}</div>
                <div className="mt-2 text-[11px] text-arc-text3">
                  Ton compte sera créé en tant que <strong>Visiteur</strong>. Un responsable devra valider ton accès à l&apos;espace membres.
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <input type="checkbox" required id="cgu" className="mt-0.5 accent-arc-navy" />
                <label htmlFor="cgu" className="text-xs text-arc-text2 leading-relaxed cursor-pointer">
                  J&apos;accepte les{" "}
                  <span className="text-arc-navy font-semibold underline cursor-pointer">conditions d&apos;utilisation</span>
                  {" "}et la{" "}
                  <span className="text-arc-navy font-semibold underline cursor-pointer">politique de confidentialité</span>
                  {" "}(nLPD Suisse).
                </label>
              </div>

              <div className="flex gap-3 mt-1">
                <button type="button" onClick={() => setStep(1)} className="flex-1 py-4 rounded-xl border-[1.5px] border-arc-border text-arc-text2 text-sm font-bold hover:bg-arc-bg transition-colors">
                  ← Retour
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-4 rounded-xl bg-arc-navy text-white text-sm font-bold hover:bg-arc-navy2 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? "Inscription…" : "🎉 Créer mon compte"}
                </button>
              </div>
            </form>
          )}

          <p className="text-center text-sm text-arc-text2 mt-6">
            Déjà un compte ?{" "}
            <Link href="/connexion" className="text-arc-navy font-bold hover:text-arc-blue transition-colors">
              Se connecter
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
