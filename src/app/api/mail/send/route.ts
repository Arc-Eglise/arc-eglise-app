import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAuthorizedMailboxes } from "@/lib/mail/mailbox-config";
import { sendMail } from "@/lib/mail/graph-client";

export async function POST(req: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles").select("role, groups").eq("id", user.id).single();
  if (!profile) return NextResponse.json({ error: "Profil introuvable" }, { status: 403 });

  const body = await req.json().catch(() => null);
  // body: { from: mailbox, to: email, subject, message }
  if (!body?.from || !body?.to || !body?.subject || !body?.message)
    return NextResponse.json({ error: "Champs manquants: from, to, subject, message" }, { status: 400 });

  const authorized = getAuthorizedMailboxes(profile.role, profile.groups ?? []);
  if (!authorized.includes(body.from))
    return NextResponse.json({ error: "Expéditeur non autorisé" }, { status: 403 });

  const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRe.test(body.to))
    return NextResponse.json({ error: "Adresse destinataire invalide" }, { status: 400 });
  if (body.message.length > 10_000)
    return NextResponse.json({ error: "Message trop long (max 10 000 caractères)" }, { status: 400 });

  if (!process.env.GRAPH_TENANT_ID || !process.env.GRAPH_CLIENT_ID || !process.env.GRAPH_CLIENT_SECRET) {
    return NextResponse.json({ error: "Messagerie Microsoft non configurée — variables GRAPH_* manquantes." }, { status: 503 });
  }

  const cc: string[] = Array.isArray(body.cc)
    ? (body.cc as unknown[]).filter((s): s is string => typeof s === "string" && !!s.trim()).map((s) => s.trim())
    : [];

  try {
    await sendMail({ from: body.from, to: body.to, subject: body.subject, body: body.message, cc: cc.length > 0 ? cc : undefined });
    return NextResponse.json({ success: true });
  } catch (err) {
    const detail = err instanceof Error ? err.message : "Erreur inconnue";
    console.error("[api/mail/send]", detail);
    return NextResponse.json({ error: detail }, { status: 502 });
  }
}
