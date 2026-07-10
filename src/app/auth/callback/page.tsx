"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// Gère deux flux d'authentification Supabase :
//   PKCE    : ?code=xxx         → exchangeCodeForSession()
//   Implicit: #access_token=xxx → getSession() consomme le fragment automatiquement
//
// Le paramètre ?next= indique la page de destination après la session établie.

export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    const supabase  = createClient();
    // Lire depuis window.location (disponible uniquement côté client)
    const params    = new URLSearchParams(window.location.search);
    const next      = params.get("next") ?? "/espace-membres";
    const code      = params.get("code");

    async function process() {
      try {
        if (code) {
          // Flux PKCE : échanger le code contre une session
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
        } else {
          // Flux Implicit : getSession() détecte et consomme le fragment #access_token
          const { data, error } = await supabase.auth.getSession();
          if (error) throw error;
          if (!data.session) throw new Error("session absente");
        }
        router.replace(next);
      } catch {
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
