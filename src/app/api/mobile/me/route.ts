import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

const ALLOWED_ROLES = ["admin", "pasteur", "membre"] as const;

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Token manquant", code: "MISSING_TOKEN" }, { status: 401 });
  }
  const token = authHeader.slice(7);

  const supabase = adminClient();

  // Verify JWT and get user
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) {
    return NextResponse.json({ error: "Token invalide", code: "INVALID_TOKEN" }, { status: 401 });
  }

  // Check membership status
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, first_name, last_name, email, role, groups, validated, avatar_url, phone, country")
    .eq("id", user.id)
    .single();

  const isValidatedMember =
    profile?.validated === true &&
    ALLOWED_ROLES.includes(profile?.role as typeof ALLOWED_ROLES[number]);

  if (!isValidatedMember) {
    return NextResponse.json(
      {
        error: "Accès réservé aux membres validés de ARC.",
        code: "NOT_MEMBER",
        hint:
          profile?.validated === false
            ? "Ton compte est en attente de validation par le Pasteur."
            : "Ton rôle ne permet pas l'accès à l'application mobile.",
      },
      { status: 403 }
    );
  }

  return NextResponse.json({
    id: user.id,
    email: user.email,
    first_name: profile.first_name,
    last_name: profile.last_name,
    role: profile.role,
    groups: profile.groups ?? [],
    avatar_url: profile.avatar_url,
    phone: profile.phone,
    country: profile.country,
  });
}
