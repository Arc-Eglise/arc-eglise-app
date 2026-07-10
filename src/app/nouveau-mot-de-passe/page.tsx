"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";

function RuleItem({ ok, text }: { ok: boolean; text: string }) {
  return (
    <li className={`flex items-center gap-1.5 text-xs transition-colors ${ok ? "text-green-600" : "text-arc-text2"}`}>
      <span className="font-bold">{ok ? "✓" : "○"}</span> {text}
    </li>
  );
}

export default function NouveauMotDePassePage() {
  const [password,   setPassword]   = useState("");
  const [confirm,    setConfirm]    = useState("");
  const [showPwd,    setShowPwd]    = useState(false);
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState<string | null>(null);
  const [success,    setSuccess]    = useState(false);
  const [hasSession, setHasSession] = useState<boolean | null>(null);

  // Vérifier qu'une session est active (issue du lien de reset via /auth/callback)
  useEffect(() => {
    createClient()
      .auth.getUser()
      .then(({ data }) => setHasSession(!!data.user))
      .catch(() => setHasSession(false));
  }, []);

  // Règles de complexité affichées en temps réel
  const rules = {
    length:    password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    digit:     /\d/.test(password),
  };
  const policyOk = rules.length && rules.uppercase && rules.digit;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!policyOk) {
      setError("Le mot de passe ne respecte pas les règles de complexité.");
      return;
    }
    if (password !== confirm) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }

    setLoading(true);
    try {
      const res  = await fetch("/api/auth/reset-password", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ password }),
      });
      const json = await res.json() as { success?: true; error?: string };

      if (!res.ok || json.error) {
        setError(json.error ?? "Une erreur est survenue. Réessaie.");
        return;
      }

      // Déconnecter la session de recovery (le lien est maintenant consommé)
      await createClient().auth.signOut();
      setSuccess(true);
    } catch {
      setError("Impossible de contacter le serveur. Réessaie.");
    } finally {
      setLoading(false);
    }
  };

  // ── Chargement ───────────────────────────────────────────────────────
  if (hasSession === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-arc-bg">
        <p className="text-sm text-arc-text2 animate-pulse">Chargement…</p>
      </div>
    );
  }

  // ── Session invalide / lien expiré ───────────────────────────────────
  if (!hasSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-arc-bg px-4">
        <div className="w-full max-w-[420px] text-center">
          <Link href="/" className="flex justify-center mb-10">
            <Image src="/images/logo-arc.jpeg" alt="ARC" width={130} height={80} style={{ objectFit: "contain" }} />
          </Link>
          <div className="text-5xl mb-4">⛔</div>
          <h1 className="font-serif text-2xl font-bold text-arc-navy mb-3">Lien invalide ou expiré</h1>
          <p className="text-sm text-arc-text2 mb-6">
            Ce lien de réinitialisation n'est plus valide. Il est à usage unique et expire après{" "}
            <strong>1 heure</strong>.
          </p>
          <Link
            href="/mot-de-passe-oublie"
            className="inline-block py-3 px-8 rounded-xl bg-arc-navy text-white text-sm font-bold hover:bg-arc-navy2 transition-colors"
          >
            Demander un nouveau lien
          </Link>
        </div>
      </div>
    );
  }

  // ── Succès ───────────────────────────────────────────────────────────
  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-arc-bg px-4">
        <div className="w-full max-w-[420px] text-center">
          <Link href="/" className="flex justify-center mb-10">
            <Image src="/images/logo-arc.jpeg" alt="ARC" width={130} height={80} style={{ objectFit: "contain" }} />
          </Link>
          <div className="text-5xl mb-4">✅</div>
          <h1 className="font-serif text-3xl font-bold text-arc-navy mb-3">Mot de passe mis à jour !</h1>
          <p className="text-sm text-arc-text2 mb-6">
            Ton mot de passe a été modifié avec succès. Connecte-toi avec ton nouveau mot de passe.
          </p>
          <Link
            href="/connexion"
            className="inline-block py-3.5 px-8 rounded-xl bg-arc-navy text-white text-sm font-bold hover:bg-arc-navy2 transition-colors"
          >
            Se connecter →
          </Link>
        </div>
      </div>
    );
  }

  // ── Formulaire ───────────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex items-center justify-center bg-arc-bg px-4">
      <div className="w-full max-w-[420px]">

        <Link href="/" className="flex mb-10">
          <Image src="/images/logo-arc.jpeg" alt="ARC — Ambassade du Royaume de Christ" width={130} height={80} style={{ objectFit: "contain" }} />
        </Link>

        <h1 className="font-serif text-[32px] font-bold text-arc-navy mb-1">Réinitialiser votre mot de passe</h1>
        <p className="text-sm text-arc-text2 mb-8">
          Choisis un nouveau mot de passe sécurisé pour ton compte ARC.
        </p>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-5 text-sm text-arc-red">
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">

          {/* Nouveau mot de passe */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-[0.8px] text-arc-blue mb-1.5">
              Nouveau mot de passe
            </label>
            <div className="relative">
              <input
                type={showPwd ? "text" : "password"}
                required
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(null); }}
                placeholder="••••••••"
                className="w-full px-4 py-3.5 pr-11 rounded-xl border-[1.5px] border-arc-border bg-white text-sm outline-none focus:border-arc-navy transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPwd((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-arc-text2 hover:text-arc-navy text-xs font-semibold transition-colors"
                aria-label={showPwd ? "Masquer" : "Afficher"}
              >
                {showPwd ? "Masquer" : "Voir"}
              </button>
            </div>

            {/* Indicateur de règles en temps réel */}
            {password.length > 0 && (
              <ul className="mt-2 space-y-1 pl-1">
                <RuleItem ok={rules.length}    text="8 caractères minimum" />
                <RuleItem ok={rules.uppercase} text="1 lettre majuscule" />
                <RuleItem ok={rules.digit}     text="1 chiffre" />
              </ul>
            )}
          </div>

          {/* Confirmation */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-[0.8px] text-arc-blue mb-1.5">
              Confirmer le mot de passe
            </label>
            <input
              type={showPwd ? "text" : "password"}
              required
              value={confirm}
              onChange={(e) => { setConfirm(e.target.value); setError(null); }}
              placeholder="••••••••"
              className={`w-full px-4 py-3.5 rounded-xl border-[1.5px] bg-white text-sm outline-none transition-colors
                ${confirm && confirm !== password
                  ? "border-red-400 focus:border-red-500"
                  : confirm && confirm === password
                  ? "border-green-400 focus:border-green-500"
                  : "border-arc-border focus:border-arc-navy"
                }`}
            />
            {confirm && confirm !== password && (
              <p className="mt-1 text-xs text-red-500">Les mots de passe ne correspondent pas.</p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading || !policyOk || password !== confirm}
            className="w-full py-4 rounded-xl bg-arc-navy text-white text-sm font-bold hover:bg-arc-navy2 disabled:opacity-60 transition-colors mt-1"
          >
            {loading ? "Enregistrement…" : "Enregistrer le nouveau mot de passe"}
          </button>
        </form>

        <p className="text-center text-sm text-arc-text2 mt-6">
          <Link href="/connexion" className="text-arc-navy font-bold hover:text-arc-blue transition-colors">
            ← Retour à la connexion
          </Link>
        </p>
      </div>
    </div>
  );
}
