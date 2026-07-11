import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAuthorizedMailboxes } from "@/lib/mail/mailbox-config";
import { getMessage, markAsRead } from "@/lib/mail/graph-client";

export async function GET(req: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles").select("role, groups").eq("id", user.id).single();
  if (!profile) return NextResponse.json({ error: "Profil introuvable" }, { status: 403 });

  const authorized = getAuthorizedMailboxes(profile.role, profile.groups ?? []);
  const sp  = req.nextUrl.searchParams;
  const box = sp.get("box");
  const id  = sp.get("id");

  if (!box || !id) return NextResponse.json({ error: "Paramètres manquants" }, { status: 400 });
  if (!authorized.includes(box))
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

  if (!process.env.GRAPH_TENANT_ID || !process.env.GRAPH_CLIENT_ID || !process.env.GRAPH_CLIENT_SECRET) {
    return NextResponse.json({ error: "Messagerie Microsoft non configurée — variables GRAPH_* manquantes." }, { status: 503 });
  }

  try {
    const msg = await getMessage(box, id);
    if (!msg.isRead) await markAsRead(box, id).catch(() => {});
    return NextResponse.json(msg);
  } catch (err) {
    const detail = err instanceof Error ? err.message : "Erreur inconnue";
    console.error("[api/mail/message]", detail);
    return NextResponse.json({ error: detail }, { status: 502 });
  }
}
