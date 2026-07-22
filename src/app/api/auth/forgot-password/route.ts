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

    // Génère le lien de recovery via le SDK admin (lien à usage unique, expiration Supabase).
    // redirectTo encode la destination finale dans l'URL Supabase : après vérification du token,
    // Supabase redirige vers cette URL en ajoutant #access_token=... en fragment.
    // Le callback lit ?next= depuis la query string pour savoir où rediriger l'utilisateur.
    const { data, error } = await admin.auth.admin.generateLink({
      type: "recovery",
      email,
      options: {
        redirectTo: `${SITE_URL}/auth/callback?next=/nouveau-mot-de-passe`,
      },
    });

    // Si l'utilisateur n'existe pas ou toute autre erreur → réponse neutre identique
    if (error || !data?.properties?.action_link) return OK;

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
    await sendPasswordResetEmail(email, displayName, data.properties.action_link);
  } catch {
    // Absorber toutes les erreurs — réponse toujours neutre
  }

  return OK;
}
