"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

function ConnexionForm() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const supabase     = createClient();

  const [email,      setEmail]      = useState("");
  const [password,   setPassword]   = useState("");
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState<string | null>(null);
  const [showPwd,    setShowPwd]    = useState(false);
  const [resterConnecte, setResterConnecte] = useState(true);

  // Message depuis le callback ou l'inscription
  const urlError   = searchParams.get("error");
  const urlMessage = searchParams.get("message");

  useEffect(() => {
    if (urlError === "auth_callback_error") setError("Lien de confirmation invalide ou expiré.");
  }, [urlError]);

  // Rediriger vers l'espace membres si déjà connecté (évite d'afficher le form au retour navigateur)
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
      // Si "rester connecté" est désactivé, noter en sessionStorage
      // (la session sera active dans cet onglet mais ne survivra pas à la fermeture du navigateur)
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
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2">

      {/* LEFT — brand panel */}
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
          <blockquote className="font-serif text-[32px] italic text-white/85 leading-[1.4] mb-6">
            "Construisons des générations de disciples qui influencent positivement leur environnement."
          </blockquote>
          <div className="text-sm text-white/50">— Pasteur Pedro Obova · Fondateur ARC</div>
        </div>
      </div>

      {/* RIGHT — form */}
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

          {/* Message de confirmation inscription */}
          {urlMessage === "check_email" && (
            <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 mb-5 text-sm text-arc-green font-medium">
              ✅ Inscription réussie ! Vérifie ton email pour confirmer ton compte.
            </div>
          )}

          {/* Erreur */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-5 text-sm text-arc-red">
              ⚠️ {error}
            </div>
          )}

          {/* Google */}
          <button
            onClick={handleGoogle}
            className="w-full flex items-center justify-center gap-3 py-3.5 rounded-xl border-[1.5px] border-arc-border bg-white text-sm font-semibold text-arc-text hover:border-arc-blue hover:bg-arc-blueBg transition-all duration-200 mb-5"
          >
            <span className="text-lg">🔵</span> Continuer avec Google
          </button>

          <div className="flex items-center gap-3 mb-5">
            <div className="flex-1 h-px bg-arc-border" />
            <span className="text-xs text-arc-text3 font-medium">ou par email</span>
            <div className="flex-1 h-px bg-arc-border" />
          </div>

          {/* Form */}
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
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-arc-text3 hover:text-arc-navy transition-colors text-base"
                >
                  {showPwd ? "🙈" : "👁️"}
                </button>
              </div>
            </div>

            {/* Rester connecté */}
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
              Rejoindre l'ARC
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function ConnexionPage() {
  return (
    <Suspense fallback={null}>
      <ConnexionForm />
    </Suspense>
  );
}
