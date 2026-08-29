"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
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
    <div className="w-full md:w-[55%] lg:w-1/2 bg-[#f8f9fa] flex items-center justify-center p-6 sm:p-8 md:p-12 lg:p-24 min-h-screen font-inter">
      <div className="w-full max-w-md space-y-8">

        {/* Header */}
        <div>
          <h1 className="font-playfair text-[48px] leading-[56px] tracking-[-0.02em] font-bold text-[#000666] mb-2">
            Bon retour 👋
          </h1>
          <p className="text-[16px] leading-[24px] text-[#454652]">
            Connecte-toi à ton espace membre ARC
          </p>
        </div>

        {urlMessage === "check_email" && (
          <div className="bg-white border border-[#c6c5d4] rounded-lg px-4 py-3 text-sm text-[#2f855a] font-medium shadow-sm">
            ✅ Inscription réussie ! Vérifie ton email pour confirmer ton compte.
          </div>
        )}

        {error && (
          <div className="bg-[#ffdad6] border border-[#ffb4ab] rounded-lg px-4 py-3 text-sm text-[#93000a]">
            ⚠️ {error}
          </div>
        )}

        {/* Social Auth */}
        <div>
          <button
            onClick={handleGoogle}
            className="w-full flex items-center justify-center gap-3 bg-white border border-[#c6c5d4] rounded-lg px-4 py-3 text-[13px] leading-[16px] tracking-[0.05em] font-semibold text-[#191c1d] shadow-sm hover:bg-[#edeeef] transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-[#000666] focus:border-transparent"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
            Continuer avec Google
          </button>
        </div>

        {/* Divider */}
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-[#c6c5d4] opacity-50" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-4 bg-[#f8f9fa] text-sm text-[#767683]">ou par email</span>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleLogin} className="space-y-6">
          {/* Email */}
          <div className="space-y-2">
            <label
              htmlFor="email"
              className="block text-[13px] leading-[16px] font-semibold text-[#000666] uppercase tracking-wider"
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="toi@exemple.ch"
              className="block w-full px-4 py-3 bg-white border border-[#c6c5d4] rounded-lg shadow-sm text-[16px] text-[#191c1d] placeholder-[#454652]/50 focus:outline-none focus:ring-1 focus:ring-[#000666] focus:border-[#000666] transition-colors"
            />
          </div>

          {/* Password */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label
                htmlFor="password"
                className="block text-[13px] leading-[16px] font-semibold text-[#000666] uppercase tracking-wider"
              >
                Mot de passe
              </label>
              <Link
                href="/mot-de-passe-oublie"
                className="text-sm text-[#000666] hover:text-[#1a237e] transition-colors"
              >
                Mot de passe oublié ?
              </Link>
            </div>
            <div className="relative">
              <input
                id="password"
                type={showPwd ? "text" : "password"}
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="block w-full px-4 py-3 pr-11 bg-white border border-[#c6c5d4] rounded-lg shadow-sm text-[16px] text-[#191c1d] placeholder-[#454652]/50 focus:outline-none focus:ring-1 focus:ring-[#000666] focus:border-[#000666] transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPwd((v) => !v)}
                aria-label={showPwd ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#767683] hover:text-[#000666] transition-colors focus:outline-none"
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

          {/* Remember Me */}
          <div className="flex items-center">
            <input
              id="remember-me"
              type="checkbox"
              checked={resterConnecte}
              onChange={(e) => setResterConnecte(e.target.checked)}
              className="h-4 w-4 rounded border-[#c6c5d4] text-[#000666] accent-[#000666] focus:ring-[#000666] bg-white"
            />
            <label htmlFor="remember-me" className="ml-2 block text-[16px] leading-[24px] text-[#454652]">
              Rester connecté
            </label>
          </div>

          {/* Submit */}
          <div>
            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center items-center gap-2 py-3 px-4 border border-transparent rounded-lg shadow-sm text-[13px] leading-[16px] tracking-[0.05em] font-semibold text-white bg-[#000666] hover:bg-[#1a237e] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#000666] disabled:opacity-60 disabled:cursor-not-allowed transition-colors duration-200"
            >
              {loading ? "Connexion…" : "Se connecter"}
              {!loading && (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 12h16m0 0l-6-6m6 6l-6 6" />
                </svg>
              )}
            </button>
          </div>
        </form>

        {/* Footer Link */}
        <p className="text-center text-[16px] leading-[24px] text-[#454652]">
          Pas encore de compte ?{" "}
          <Link
            href="/inscription"
            className="text-[13px] font-semibold text-[#000666] hover:text-[#1a237e] hover:underline underline-offset-4 transition-all"
          >
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
