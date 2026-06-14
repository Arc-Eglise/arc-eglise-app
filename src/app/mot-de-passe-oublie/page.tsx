"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function MotDePasseOubliePage() {
  const supabase = createClient();
  const [email,   setEmail]   = useState("");
  const [loading, setLoading] = useState(false);
  const [sent,    setSent]    = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${location.origin}/auth/callback?next=/nouveau-mot-de-passe`,
    });

    if (error) {
      setError("Une erreur est survenue. Vérifie l'adresse email.");
    } else {
      setSent(true);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-arc-bg px-4">
      <div className="w-full max-w-[420px]">

        <Link href="/" className="flex items-center gap-3 mb-10">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-arc-navy to-arc-blue flex items-center justify-center">
            <span className="font-serif text-sm font-bold text-white">ARC</span>
          </div>
          <div className="font-serif text-lg font-bold text-arc-navy tracking-[3px]">ARC</div>
        </Link>

        {sent ? (
          <div className="text-center">
            <div className="text-5xl mb-4">📧</div>
            <h1 className="font-serif text-3xl font-bold text-arc-navy mb-3">Email envoyé !</h1>
            <p className="text-sm text-arc-text2 mb-6">
              Un lien de réinitialisation a été envoyé à <strong>{email}</strong>.
              Le lien est valable 15 minutes.
            </p>
            <Link
              href="/connexion"
              className="inline-block py-3.5 px-8 rounded-xl bg-arc-navy text-white text-sm font-bold hover:bg-arc-navy2 transition-colors"
            >
              ← Retour à la connexion
            </Link>
          </div>
        ) : (
          <>
            <h1 className="font-serif text-[32px] font-bold text-arc-navy mb-1">Mot de passe oublié ?</h1>
            <p className="text-sm text-arc-text2 mb-8">
              Saisis ton email et nous t'enverrons un lien de réinitialisation.
            </p>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-5 text-sm text-arc-red">
                ⚠️ {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-[0.8px] text-arc-blue mb-1.5">
                  Email
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="toi@exemple.ch"
                  className="w-full px-4 py-3.5 rounded-xl border-[1.5px] border-arc-border bg-white text-sm outline-none focus:border-arc-navy transition-colors"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 rounded-xl bg-arc-navy text-white text-sm font-bold hover:bg-arc-navy2 disabled:opacity-60 transition-colors mt-1"
              >
                {loading ? "Envoi…" : "Envoyer le lien 📧"}
              </button>
            </form>

            <p className="text-center text-sm text-arc-text2 mt-6">
              <Link href="/connexion" className="text-arc-navy font-bold hover:text-arc-blue transition-colors">
                ← Retour à la connexion
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
