"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// Gère deux flux d'authentification Supabase :
//   PKCE    : ?code=xxx         → exchangeCodeForSession()
//   Implicit: #access_token=xxx → getSession() consomme le fragment automatiquement
//
// Le paramètre #next= dans le fragment indique la page de destination après la session établie.

export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    
    // Récupérer les paramètres depuis QUERY STRING (pour le flux PKCE)
    const params = new URLSearchParams(window.location.search);
    const code   = params.get("code");

    // Récupérer le paramètre 'next' depuis le FRAGMENT (où Supabase le place)
    // Format: #access_token=xyz&type=recovery&next=/nouveau-mot-de-passe&...
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const next       = hashParams.get("next") ?? "/espace-membres";

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
      } catch (err) {
        console.error("[auth/callback] Erreur lors de l'authentification:", err);
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
