import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { NOTIFICATION_CATEGORIES } from "@/lib/notification-types";

export const runtime = "nodejs";

/** Préférences de notifications de l'utilisateur courant. */
export async function GET() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const { data } = await supabase
    .from("profiles")
    .select("notification_prefs")
    .eq("id", user.id)
    .maybeSingle();

  return NextResponse.json({ prefs: data?.notification_prefs ?? {} });
}

export async function POST(req: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const prefs = body?.prefs;
  if (!prefs || typeof prefs !== "object") {
    return NextResponse.json({ error: "prefs requis" }, { status: 400 });
  }

  // On ne garde que les catégories connues et non verrouillées, en booléen.
  const clean: Record<string, boolean> = {};
  for (const cat of NOTIFICATION_CATEGORIES) {
    if (cat.locked) continue;
    if (cat.key in prefs) clean[cat.key] = Boolean(prefs[cat.key]);
  }

  const { error } = await supabase
    .from("profiles")
    .update({ notification_prefs: clean })
    .eq("id", user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, prefs: clean });
}
