"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

function ConnexionFormInner() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const supabase     = createClient();

  const [email,      setEmail]      = useState("");
  const [password,   setPassword]   = useState("");
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState<string | null>(null);
  const [showPwd,    setShowPwd]    = useState(false);
  const [resterConnecte, setResterConnecte] = useState(true);

  const urlError   = searchParams.get("error");
  const urlMessage = searchParams.get("message");

  useEffect(() => {
    if (urlError === "auth_callback_error") setError("Lien de confirmation invalide ou expiré.");
  }, [urlError]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) router.replace("/espace-membres");
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError(
        error.message.includes("Invalid login")
          ? "Email ou mot de passe incorrect."
          : error.message.includes("Email not confirmed")
          ? "Confirme ton email avant de te connecter."
          : "Une erreur est survenue. Réessaie."
      );
      setLoading(false);
    } else {
      if (!resterConnecte) {
        sessionStorage.setItem("arc_session_only", "1");
        localStorage.removeItem("arc_persist");
      } else {
        localStorage.setItem("arc_persist", "1");
        sessionStorage.removeItem("arc_session_only");
      }
      router.push("/espace-membres");
      router.refresh();
    }
  };

  const handleGoogle = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${location.origin}/auth/callback` },
    });
  };

  return (
    <div className="flex items-center justify-center p-6 md:p-12 bg-arc-bg">
      <div className="w-full max-w-[440px]">

        {/* Mobile logo */}
        <Link href="/" className="flex lg:hidden mb-8">
          <Image
            src="/images/logo-arc.jpeg"
            alt="ARC — Ambassade du Royaume de Christ"
            width={120} height={74}
            style={{ objectFit: "contain" }}
          />
        </Link>

        <h1 className="font-serif text-[32px] font-bold text-arc-navy mb-1">
          Bon retour 👋
        </h1>
        <p className="text-sm text-arc-text2 mb-8">
          Connecte-toi à ton espace membre ARC
        </p>

        {urlMessage === "check_email" && (
          <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 mb-5 text-sm text-arc-green font-medium">
            ✅ Inscription réussie ! Vérifie ton email pour confirmer ton compte.
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-5 text-sm text-arc-red">
            ⚠️ {error}
          </div>
        )}

        <button
          onClick={handleGoogle}
          className="w-full flex items-center justify-center gap-3 py-3.5 rounded-xl border-[1.5px] border-arc-border bg-white text-sm font-semibold text-arc-text shadow-sm hover:border-arc-blue hover:bg-arc-blueBg transition-all duration-200 mb-5"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
          </svg>
          Continuer avec Google
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div className="flex-1 h-px bg-arc-border" />
          <span className="text-xs text-arc-text3 font-medium">ou par email</span>
          <div className="flex-1 h-px bg-arc-border" />
        </div>

        <form onSubmit={handleLogin} className="flex flex-col gap-4">
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
              className="w-full px-4 py-3.5 rounded-xl border-[1.5px] border-arc-border bg-white text-sm font-sans text-arc-text outline-none focus:border-arc-navy focus:bg-white transition-colors"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-[10px] font-bold uppercase tracking-[0.8px] text-arc-blue">
                Mot de passe
              </label>
              <Link
                href="/mot-de-passe-oublie"
                className="text-[11px] text-arc-blue hover:text-arc-navy transition-colors"
              >
                Mot de passe oublié ?
              </Link>
            </div>
            <div className="relative">
              <input
                type={showPwd ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-3.5 pr-12 rounded-xl border-[1.5px] border-arc-border bg-white text-sm font-sans text-arc-text outline-none focus:border-arc-navy transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPwd((v) => !v)}
                aria-label={showPwd ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-arc-text3 hover:text-arc-navy transition-colors"
              >
                {showPwd ? (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.22A10.48 10.48 0 001.93 12C3.23 16.34 7.24 19.5 12 19.5c.99 0 1.95-.14 2.86-.39M6.23 6.23A10.45 10.45 0 0112 4.5c4.76 0 8.77 3.16 10.07 7.5a10.52 10.52 0 01-4.29 5.27M6.23 6.23L3 3m3.23 3.23l3.65 3.65m7.89 7.89L21 21m-3.23-3.23l-3.65-3.65m0 0a3 3 0 10-4.24-4.24m4.24 4.24L9.88 9.88" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.04 12.32a1 1 0 010-.64C3.42 7.51 7.36 4.5 12 4.5c4.64 0 8.58 3.01 9.96 7.18a1 1 0 010 .64C20.58 16.49 16.64 19.5 12 19.5c-4.64 0-8.58-3.01-9.96-7.18z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          <label className="flex items-center gap-2.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={resterConnecte}
              onChange={(e) => setResterConnecte(e.target.checked)}
              className="w-4 h-4 accent-arc-navy rounded"
            />
            <span className="text-sm text-arc-text2">Rester connecté</span>
          </label>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 rounded-xl bg-arc-navy text-white text-sm font-bold hover:bg-arc-navy2 hover:-translate-y-0.5 hover:shadow-arc disabled:opacity-60 disabled:cursor-not-allowed disabled:translate-y-0 transition-all duration-300 mt-1"
          >
            {loading ? "Connexion…" : "Se connecter →"}
          </button>
        </form>

        <p className="text-center text-sm text-arc-text2 mt-6">
          Pas encore de compte ?{" "}
          <Link href="/inscription" className="text-arc-navy font-bold hover:text-arc-blue transition-colors">
            Rejoindre l&apos;ARC
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function ConnexionForm() {
  return (
    <Suspense fallback={null}>
      <ConnexionFormInner />
    </Suspense>
  );
}
