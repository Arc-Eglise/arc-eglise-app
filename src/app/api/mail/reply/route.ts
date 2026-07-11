import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAuthorizedMailboxes } from "@/lib/mail/mailbox-config";
import { replyToMessage, getMessage } from "@/lib/mail/graph-client";

export async function POST(req: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles").select("role, groups").eq("id", user.id).single();
  if (!profile) return NextResponse.json({ error: "Profil introuvable" }, { status: 403 });

  const body = await req.json().catch(() => null);
  if (!body?.box || !body?.id || !body?.comment)
    return NextResponse.json({ error: "Champs manquants: box, id, comment" }, { status: 400 });

  const authorized = getAuthorizedMailboxes(profile.role, profile.groups ?? []);
  if (!authorized.includes(body.box))
    return NextResponse.json({ error: "Accès refusé à cette boîte" }, { status: 403 });

  if (!process.env.GRAPH_TENANT_ID || !process.env.GRAPH_CLIENT_ID || !process.env.GRAPH_CLIENT_SECRET) {
    return NextResponse.json({ error: "Messagerie Microsoft non configurée — variables GRAPH_* manquantes." }, { status: 503 });
  }

  try {
    // Lire le message original pour trouver le bon destinataire :
    // Si le message a un champ replyTo, l'utiliser — sinon utiliser From.
    const original = await getMessage(body.box, body.id);
    const toRecipients =
      original.replyTo && original.replyTo.length > 0
        ? original.replyTo
        : [{ emailAddress: original.from.emailAddress }];

    await replyToMessage(body.box, body.id, body.comment, toRecipients);
    return NextResponse.json({ success: true });
  } catch (err) {
    const detail = err instanceof Error ? err.message : "Erreur inconnue";
    console.error("[api/mail/reply]", detail);
    return NextResponse.json({ error: detail }, { status: 502 });
  }
}
