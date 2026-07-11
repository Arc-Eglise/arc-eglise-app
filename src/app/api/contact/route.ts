import { createAdminClient } from "@/lib/supabase/admin";
import { sendContactConfirmation } from "@/lib/email";
import { NextRequest, NextResponse } from "next/server";

const GRAPH_READY =
  !!process.env.GRAPH_TENANT_ID &&
  !!process.env.GRAPH_CLIENT_ID &&
  !!process.env.GRAPH_CLIENT_SECRET;

export async function POST(req: NextRequest) {
  let body: Record<string, string>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Requête invalide" }, { status: 400 });
  }

  const { first_name, last_name, email, subject, message } = body;

  if (!first_name?.trim() || !last_name?.trim() || !email?.trim() || !message?.trim()) {
    return NextResponse.json({ error: "Champs obligatoires manquants" }, { status: 400 });
  }

  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  if (!emailOk) {
    return NextResponse.json({ error: "Adresse email invalide" }, { status: 400 });
  }

  if (message.trim().length > 5000) {
    return NextResponse.json({ error: "Message trop long (max 5000 caractères)" }, { status: 400 });
  }

  const data = {
    first_name: first_name.trim(),
    last_name:  last_name.trim(),
    email:      email.trim().toLowerCase(),
    subject:    subject?.trim() || "Information générale",
    message:    message.trim(),
  };

  const supabase = createAdminClient();
  const { error: dbError } = await supabase.from("contact_messages").insert(data);

  if (dbError) {
    console.error("[api/contact] Supabase error:", dbError.message);
    return NextResponse.json({ error: "Erreur lors de l'enregistrement" }, { status: 500 });
  }

  // ── Envoyer notification + confirmation (tous deux attendus avant la réponse)
  const notifText = buildNotifText(data);

  await Promise.allSettled([
    // Notification interne → contact@arc-eglise.ch (texte brut)
    (async () => {
      if (GRAPH_READY) {
        const { sendMail } = await import("@/lib/mail/graph-client");
        await sendMail({
          from:    "contact@arc-eglise.ch",
          to:      "contact@arc-eglise.ch",
          replyTo: data.email,
          subject: `[Contact] ${data.subject}`,
          body:    notifText,
          isHtml:  false,
        });
        console.log("[api/contact] Notification envoyée via Graph API");
      } else {
        const { sendContactNotification } = await import("@/lib/email");
        await sendContactNotification(data);
        console.log("[api/contact] Notification envoyée via Resend (fallback)");
      }
    })(),
    // Confirmation à l'expéditeur
    sendContactConfirmation({ first_name: data.first_name, email: data.email })
      .catch((e: unknown) => console.error("[api/contact] Confirmation email:", e)),
  ]);

  return NextResponse.json({ success: true });
}

// ── Corps texte brut pour la notification interne ────────────────────────────
function buildNotifText(data: {
  first_name: string; last_name: string;
  email: string; subject: string; message: string;
}): string {
  const { first_name, last_name, email, subject, message } = data;
  return [
    "Nouveau message depuis le formulaire de contact (arc-eglise.ch)",
    "─────────────────────────────────────────",
    `Prénom  : ${first_name}`,
    `Nom     : ${last_name}`,
    `Email   : ${email}`,
    `Sujet   : ${subject}`,
    "─────────────────────────────────────────",
    "",
    message,
    "",
    "─────────────────────────────────────────",
    "Pour répondre, utilisez le bouton Répondre — la réponse ira directement à l'expéditeur.",
  ].join("\n");
}
