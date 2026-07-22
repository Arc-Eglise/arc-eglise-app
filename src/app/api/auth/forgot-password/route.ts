import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendPasswordResetEmail } from "@/lib/email";
import { SITE_BASE as SITE_URL } from "@/lib/url";

// Réponse neutre — ne jamais révéler si l'adresse existe (anti-énumération)
const OK = NextResponse.json({ success: true });

export async function POST(request: NextRequest) {
  let email = "";

  try {
    const body = await request.json();
    email = (body?.email ?? "").toString().trim().toLowerCase();
  } catch {
    return OK;
  }

  if (!email) return OK;

  try {
    const admin = createAdminClient();

    // Génère le lien de recovery via le SDK admin (lien à usage unique, expiration Supabase)
    // Note: redirectTo est utilisé pour les flux OAuth, pas pour recovery.
    // On le met quand même pour d'autres flux, mais pour recovery on ajoute 'next' au fragment.
    const { data, error } = await admin.auth.admin.generateLink({
      type: "recovery",
      email,
      options: {
        redirectTo: `${SITE_URL}/auth/callback`,
      },
    });

    // Si l'utilisateur n'existe pas ou toute autre erreur → réponse neutre identique
    if (error || !data?.properties?.action_link) return OK;

    // ── CORRECTION CLÉE: Ajouter 'next' au fragment du lien ──────────
    // Supabase génère: https://arc-eglise.ch/auth/callback#access_token=...&type=recovery&...
    // On le transforme en: https://arc-eglise.ch/auth/callback#access_token=...&type=recovery&...&next=/nouveau-mot-de-passe
    let actionLink = data.properties.action_link;
    
    // Vérifier que le lien contient un fragment
    if (actionLink.includes("#")) {
      // Ajouter 'next' à la fin du fragment (avant &expires_in ou autre)
      actionLink = actionLink + "&next=/nouveau-mot-de-passe";
    } else {
      // Au cas où (ne devrait pas arriver)
      actionLink = actionLink + "#next=/nouveau-mot-de-passe";
    }

    // Récupérer le prénom depuis user_metadata (renseigné à l'inscription)
    const firstName =
      (data.user?.user_metadata?.first_name as string | undefined) ?? "";

    // Si le profil a un first_name en DB, le préférer
    let displayName = firstName;
    if (data.user?.id) {
      const { data: profile } = await admin
        .from("profiles")
        .select("first_name")
        .eq("id", data.user.id)
        .single();
      if (profile?.first_name) displayName = profile.first_name;
    }

    // Envoyer via Resend avec le template brandé ARC
    // Le lien contient maintenant: #access_token=...&type=recovery&...&next=/nouveau-mot-de-passe
    await sendPasswordResetEmail(email, displayName, actionLink);
  } catch {
    // Absorber toutes les erreurs — réponse toujours neutre
  }

  return OK;
}
