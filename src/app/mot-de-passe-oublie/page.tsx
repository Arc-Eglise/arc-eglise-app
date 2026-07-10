"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";

export default function MotDePasseOubliePage() {
  const [email,   setEmail]   = useState("");
  const [loading, setLoading] = useState(false);
  const [sent,    setSent]    = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Appel à notre API custom qui envoie via Resend (template brandé ARC)
      await fetch("/api/auth/forgot-password", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ email }),
      });
    } catch {
      // Absorber l'erreur réseau — on affiche toujours le message de succès
      // pour ne pas révéler si l'adresse existe (anti-énumération)
    }

    // Toujours afficher le message envoyé, quelle que soit l'issue
    setSent(true);
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-arc-bg px-4">
      <div className="w-full max-w-[420px]">

        <Link href="/" className="flex mb-10">
          <Image
            src="/images/logo-arc.jpeg"
            alt="ARC — Ambassade du Royaume de Christ"
            width={130}
            height={80}
            style={{ objectFit: "contain" }}
          />
        </Link>

        {sent ? (
          <div className="text-center">
            <div className="text-5xl mb-4">📧</div>
            <h1 className="font-serif text-3xl font-bold text-arc-navy mb-3">
              Email envoyé !
            </h1>
            <p className="text-sm text-arc-text2 mb-6">
              Si un compte est associé à <strong>{email}</strong>, un lien de
              réinitialisation vient d'être envoyé. Le lien est valable{" "}
              <strong>1 heure</strong> et ne peut être utilisé qu'une seule fois.
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
            <h1 className="font-serif text-[32px] font-bold text-arc-navy mb-1">
              Mot de passe oublié ?
            </h1>
            <p className="text-sm text-arc-text2 mb-8">
              Saisis ton email et nous t'enverrons un lien de réinitialisation.
            </p>

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
              <Link
                href="/connexion"
                className="text-arc-navy font-bold hover:text-arc-blue transition-colors"
              >
                ← Retour à la connexion
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
