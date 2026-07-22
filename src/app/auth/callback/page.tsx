"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// Gère trois flux d'authentification Supabase :
//   PKCE    : ?code=xxx                    → exchangeCodeForSession()
//   Implicit: #access_token=xxx (recovery) → setSession() explicite (évite la condition de course)
//   Cookie  : session déjà persistée        → getSession()
//
// Le paramètre ?next= (query string) indique la page de destination après la session établie.

export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();

    // Paramètres de la query string (?code=, ?next=)
    const params = new URLSearchParams(window.location.search);
    const code   = params.get("code");

    // Tokens du flux Implicit — Supabase les place dans le hash (#access_token=…)
    const hash         = new URLSearchParams(window.location.hash.substring(1));
    const accessToken  = hash.get("access_token");
    const refreshToken = hash.get("refresh_token");

    // `next` : query string en priorité (redirectTo de generateLink), hash en fallback
    const next = params.get("next") ?? hash.get("next") ?? "/espace-membres";

    async function process() {
      try {
        if (code) {
          // Flux PKCE : échange le code contre une session
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
        } else if (accessToken && refreshToken) {
          // Flux Implicit (recovery / magic-link) : setSession() explicite.
          // getSession() ratait car @supabase/ssr détecte le hash de manière asynchrone
          // et retournait null avant que la session soit stockée en cookie.
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (error) throw error;
        } else {
          // Session déjà en cookie (reconnexion silencieuse)
          const { data, error } = await supabase.auth.getSession();
          if (error) throw error;
          if (!data.session) throw new Error("session absente");
        }
        router.replace(next);
      } catch (err) {
        console.error("[auth/callback] Erreur:", err);
        router.replace("/connexion?error=lien_invalide");
      }
    }

    process();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-arc-bg">
      <div className="text-center">
        <div className="text-4xl mb-3 animate-bounce">⌛</div>
        <p className="text-sm text-arc-text2 animate-pulse">Vérification en cours…</p>
      </div>
    </div>
  );
}
