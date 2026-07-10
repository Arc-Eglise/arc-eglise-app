import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAuthorizedMailboxes } from "@/lib/mail/mailbox-config";
import { listMessages } from "@/lib/mail/graph-client";

export async function GET(req: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, groups")
    .eq("id", user.id)
    .single();
  if (!profile) return NextResponse.json({ error: "Profil introuvable" }, { status: 403 });

  const authorized = getAuthorizedMailboxes(profile.role, profile.groups ?? []);
  if (authorized.length === 0)
    return NextResponse.json({ error: "Aucune boîte autorisée" }, { status: 403 });

  const sp     = req.nextUrl.searchParams;
  const box    = sp.get("box");
  const folder = sp.get("folder") ?? "inbox";
  const top    = Math.min(Number(sp.get("top") ?? "30"), 50);
  const skip   = Number(sp.get("skip") ?? "0");

  if (!box) return NextResponse.json({ error: "Paramètre box manquant" }, { status: 400 });
  if (!authorized.includes(box))
    return NextResponse.json({ error: "Accès refusé à cette boîte" }, { status: 403 });

  try {
    const data = await listMessages(box, folder, top, skip);
    return NextResponse.json(data);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erreur inconnue";
    console.error("[api/mail/messages]", msg);
    return NextResponse.json({ error: "Erreur Graph API", detail: msg }, { status: 502 });
  }
}
