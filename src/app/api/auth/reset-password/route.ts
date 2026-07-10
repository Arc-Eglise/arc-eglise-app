import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const BCRYPT_COST    = 12;
const HISTORY_MONTHS = 3;

// Retourner les 3 derniers mois en timestamp ISO
function threeMonthsAgo(): string {
  const d = new Date();
  d.setMonth(d.getMonth() - HISTORY_MONTHS);
  return d.toISOString();
}

function validatePolicy(password: string): string | null {
  if (password.length < 8)       return "Le mot de passe doit contenir au moins 8 caractères.";
  if (!/[A-Z]/.test(password))   return "Le mot de passe doit contenir au moins une lettre majuscule.";
  if (!/\d/.test(password))      return "Le mot de passe doit contenir au moins un chiffre.";
  return null;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as { password?: unknown };
    const password = body?.password;

    if (typeof password !== "string" || !password) {
      return NextResponse.json({ error: "Mot de passe manquant." }, { status: 400 });
    }

    // ── 1. Politique de complexité ──────────────────────────────────────
    const policyError = validatePolicy(password);
    if (policyError) {
      return NextResponse.json({ error: policyError }, { status: 400 });
    }

    // ── 2. Vérifier la session (lue depuis les cookies — établie par /auth/callback) ──
    const supabase = createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: "Session invalide ou expirée. Redemande un lien de réinitialisation." },
        { status: 401 }
      );
    }

    const admin = createAdminClient();

    // ── 3. Vérification de l'historique (3 mois) ───────────────────────
    const { data: history } = await admin
      .from("password_history")
      .select("password_hash")
      .eq("user_id", user.id)
      .gte("created_at", threeMonthsAgo());

    if (history && history.length > 0) {
      // Comparaison bcrypt côté serveur — le mot de passe en clair ne sort jamais
      for (const row of history) {
        const reused = await bcrypt.compare(password, row.password_hash as string);
        if (reused) {
          return NextResponse.json(
            { error: "Tu ne peux pas réutiliser un mot de passe utilisé au cours des 3 derniers mois." },
            { status: 400 }
          );
        }
      }
    }

    // ── 4. Mise à jour du mot de passe via le SDK admin ────────────────
    const { error: updateError } = await admin.auth.admin.updateUserById(
      user.id,
      { password }
    );

    if (updateError) {
      return NextResponse.json(
        { error: "Impossible de modifier le mot de passe. Réessaie." },
        { status: 500 }
      );
    }

    // ── 5. Enregistrer le nouveau hash dans l'historique ───────────────
    // Hachage avec bcrypt (cost 12) — jamais de mot de passe en clair en base
    const newHash = await bcrypt.hash(password, BCRYPT_COST);
    await admin
      .from("password_history")
      .insert({ user_id: user.id, password_hash: newHash });

    return NextResponse.json({ success: true });

  } catch (err) {
    console.error("[reset-password]", err);
    return NextResponse.json({ error: "Une erreur est survenue." }, { status: 500 });
  }
}
