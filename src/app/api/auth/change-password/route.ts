import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendPasswordChangedEmail } from "@/lib/email";

const BCRYPT_COST    = 12;
const HISTORY_MONTHS = 3;

function threeMonthsAgo(): string {
  const d = new Date();
  d.setMonth(d.getMonth() - HISTORY_MONTHS);
  return d.toISOString();
}

function validatePolicy(password: string): string | null {
  if (password.length < 8)     return "Le mot de passe doit contenir au moins 8 caractères.";
  if (!/[A-Z]/.test(password)) return "Le mot de passe doit contenir au moins une lettre majuscule.";
  if (!/\d/.test(password))    return "Le mot de passe doit contenir au moins un chiffre.";
  return null;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as { currentPassword?: unknown; newPassword?: unknown };
    const currentPassword = body?.currentPassword;
    const newPassword     = body?.newPassword;

    if (typeof currentPassword !== "string" || !currentPassword) {
      return NextResponse.json({ error: "Mot de passe actuel manquant." }, { status: 400 });
    }
    if (typeof newPassword !== "string" || !newPassword) {
      return NextResponse.json({ error: "Nouveau mot de passe manquant." }, { status: 400 });
    }

    // ── 1. Vérifier la session ──────────────────────────────────────────
    const supabase = createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user || !user.email) {
      return NextResponse.json(
        { error: "Vous devez être connecté pour modifier votre mot de passe." },
        { status: 401 }
      );
    }

    // ── 2. Vérifier le mot de passe actuel (ré-authentification) ───────
    const { error: reAuthError } = await supabase.auth.signInWithPassword({
      email:    user.email,
      password: currentPassword,
    });

    if (reAuthError) {
      return NextResponse.json(
        { error: "Mot de passe actuel incorrect." },
        { status: 400 }
      );
    }

    // ── 3. Politique de complexité ──────────────────────────────────────
    const policyError = validatePolicy(newPassword);
    if (policyError) {
      return NextResponse.json({ error: policyError }, { status: 400 });
    }

    const admin = createAdminClient();

    // ── 4. Vérification de l'historique (3 mois) ───────────────────────
    const { data: history } = await admin
      .from("password_history")
      .select("password_hash")
      .eq("user_id", user.id)
      .gte("created_at", threeMonthsAgo());

    if (history && history.length > 0) {
      for (const row of history) {
        const reused = await bcrypt.compare(newPassword, row.password_hash as string);
        if (reused) {
          return NextResponse.json(
            { error: "Tu ne peux pas réutiliser un mot de passe utilisé au cours des 3 derniers mois." },
            { status: 400 }
          );
        }
      }
    }

    // ── 5. Mise à jour du mot de passe via le SDK admin ────────────────
    const { error: updateError } = await admin.auth.admin.updateUserById(
      user.id,
      { password: newPassword }
    );

    if (updateError) {
      return NextResponse.json(
        { error: "Impossible de modifier le mot de passe. Réessaie." },
        { status: 500 }
      );
    }

    // ── 6. Enregistrer le nouveau hash dans l'historique ───────────────
    const newHash = await bcrypt.hash(newPassword, BCRYPT_COST);
    await admin
      .from("password_history")
      .insert({ user_id: user.id, password_hash: newHash });

    // ── 7. Email de confirmation (best-effort) ─────────────────────────
    try {
      const { data: profile } = await admin
        .from("profiles")
        .select("prenom")
        .eq("id", user.id)
        .single();
      await sendPasswordChangedEmail(user.email, profile?.prenom ?? "");
    } catch (emailErr) {
      console.error("[change-password] email confirmation:", emailErr);
    }

    return NextResponse.json({ success: true });

  } catch (err) {
    console.error("[change-password]", err);
    return NextResponse.json({ error: "Une erreur est survenue." }, { status: 500 });
  }
}
