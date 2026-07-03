"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function NouveauMotDePassePage() {
  const router  = useRouter();
  const supabase = createClient();

  const [password, setPassword] = useState("");
  const [confirm,  setConfirm]  = useState("");
  const [loading,  setLoading]  = useState(false);
  const [done,     setDone]     = useState(false);
  const [error,    setError]    = useState<string | null>(null);
  const [showPwd,  setShowPwd]  = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("Le mot de passe doit contenir au moins 8 caractères.");
      return;
    }
    if (password !== confirm) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }

    setLoading(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });

    if (updateError) {
      setError("Impossible de modifier le mot de passe. Le lien est peut-être expiré.");
      setLoading(false);
    } else {
      setDone(true);
      setTimeout(() => router.push("/espace-membres"), 2000);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-arc-bg px-4">
      <div className="w-full max-w-[420px]">

        <Link href="/" className="flex mb-10">
          <Image src="/images/logo-arc.jpeg" alt="ARC — Ambassade du Royaume de Christ" width={130} height={80} style={{ objectFit: "contain" }} />
        </Link>

        {done ? (
          <div className="text-center">
            <div className="text-5xl mb-4">✅</div>
            <h1 className="font-serif text-3xl font-bold text-arc-navy mb-3">Mot de passe modifié !</h1>
            <p className="text-sm text-arc-text2">Redirection vers votre espace membre…</p>
          </div>
        ) : (
          <>
            <h1 className="font-serif text-[32px] font-bold text-arc-navy mb-1">Nouveau mot de passe</h1>
            <p className="text-sm text-arc-text2 mb-8">
              Choisissez un mot de passe sécurisé d'au moins 8 caractères.
            </p>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-5 text-sm text-arc-red">
                ⚠️ {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-[0.8px] text-arc-blue mb-1.5">
                  Nouveau mot de passe
                </label>
                <div className="relative">
                  <input
                    type={showPwd ? "text" : "password"}
                    required
                    minLength={8}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="8 caractères minimum"
                    className="w-full px-4 py-3.5 pr-20 rounded-xl border-[1.5px] border-arc-border bg-white text-sm focus:border-arc-navy transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwd((v) => !v)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-arc-text2 text-xs font-semibold"
                  >
                    {showPwd ? "Masquer" : "Voir"}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-[0.8px] text-arc-blue mb-1.5">
                  Confirmer le mot de passe
                </label>
                <input
                  type={showPwd ? "text" : "password"}
                  required
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="Répétez le mot de passe"
                  className="w-full px-4 py-3.5 rounded-xl border-[1.5px] border-arc-border bg-white text-sm focus:border-arc-navy transition-colors"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 rounded-xl bg-arc-navy text-white text-sm font-bold hover:bg-arc-navy2 disabled:opacity-60 transition-colors mt-1"
              >
                {loading ? "Modification…" : "Enregistrer le nouveau mot de passe"}
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
