import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAuthorizedMailboxes } from "@/lib/mail/mailbox-config";
import { replyToMessage, getMessage, sendMail } from "@/lib/mail/graph-client";

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

  // fromBox: boîte expéditrice souhaitée — doit aussi être autorisée
  const fromBox: string =
    body.fromBox && typeof body.fromBox === "string" && authorized.includes(body.fromBox)
      ? body.fromBox
      : body.box;

  const cc: string[] = Array.isArray(body.cc)
    ? (body.cc as unknown[]).filter((s): s is string => typeof s === "string" && !!s.trim()).map((s) => s.trim())
    : [];

  if (!process.env.GRAPH_TENANT_ID || !process.env.GRAPH_CLIENT_ID || !process.env.GRAPH_CLIENT_SECRET) {
    return NextResponse.json({ error: "Messagerie Microsoft non configurée — variables GRAPH_* manquantes." }, { status: 503 });
  }

  try {
    // Lire le message original pour le sujet et déterminer le vrai destinataire
    const original = await getMessage(body.box, body.id);

    const toAddress: string =
      (typeof body.toAddress === "string" && body.toAddress.trim()) ||
      (original.replyTo && original.replyTo.length > 0
        ? original.replyTo[0].emailAddress.address
        : original.from.emailAddress.address);

    if (fromBox !== body.box) {
      // Répondre depuis une boîte différente → sendMail (préserve pas le fil mais change l'expéditeur)
      const reSubject = original.subject?.startsWith("Re:")
        ? original.subject
        : `Re: ${original.subject ?? "(sans objet)"}`;

      await sendMail({
        from: fromBox,
        to: toAddress,
        subject: reSubject,
        body: body.comment,
        isHtml: false,
        cc: cc.length > 0 ? cc : undefined,
      });
    } else {
      // Même boîte → endpoint /reply de Graph (conserve le fil de discussion)
      const toRecipients = [{ emailAddress: { address: toAddress } }];
      const ccRecipients = cc.map(a => ({ emailAddress: { address: a } }));
      await replyToMessage(body.box, body.id, body.comment, toRecipients, ccRecipients.length > 0 ? ccRecipients : undefined);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    const detail = err instanceof Error ? err.message : "Erreur inconnue";
    console.error("[api/mail/reply]", detail);
    return NextResponse.json({ error: detail }, { status: 502 });
  }
}
