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
  const notifHtml = buildNotifHtml(data);

  await Promise.allSettled([
    // Notification interne → contact@arc-eglise.ch
    (async () => {
      if (GRAPH_READY) {
        const { sendMail } = await import("@/lib/mail/graph-client");
        await sendMail({
          from:    "contact@arc-eglise.ch",
          to:      "contact@arc-eglise.ch",
          replyTo: data.email,
          subject: `[Contact] ${data.subject}`,
          body:    notifHtml,
          isHtml:  true,
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

// ── Template HTML pour la notification interne ───────────────────────────────
function buildNotifHtml(data: {
  first_name: string; last_name: string;
  email: string; subject: string; message: string;
}): string {
  const { first_name, last_name, email, subject, message } = data;
  const msgSafe = message
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/\n/g, "<br/>");

  return `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f4f6fb;font-family:Arial,Helvetica,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6fb;padding:32px 16px;">
<tr><td align="center">
<table width="600" style="max-width:600px;width:100%;">

  <!-- Header -->
  <tr>
    <td style="background:#2B3475;border-radius:12px 12px 0 0;padding:28px 40px;text-align:center;">
      <p style="margin:0;color:#ffffff;font-size:20px;font-weight:bold;letter-spacing:0.5px;">ARC Église</p>
      <p style="margin:8px 0 0;color:#8495C1;font-size:11px;letter-spacing:1.2px;text-transform:uppercase;">
        Formulaire de contact — arc-eglise.ch
      </p>
    </td>
  </tr>

  <!-- Body -->
  <tr>
    <td style="background:#ffffff;padding:36px 40px;border:1px solid #e4e7f0;border-top:none;border-radius:0 0 12px 12px;">

      <h2 style="margin:0 0 24px;color:#2B3475;font-size:20px;font-weight:bold;">
        📬 Nouveau message de contact
      </h2>

      <!-- Fiche expéditeur -->
      <table width="100%" cellpadding="0" cellspacing="0"
        style="border:1px solid #e4e7f0;border-radius:10px;overflow:hidden;margin-bottom:24px;">
        <tr style="background:#f4f6fb;">
          <td colspan="2" style="padding:10px 16px;font-size:11px;font-weight:bold;color:#8495C1;
                                  text-transform:uppercase;letter-spacing:.08em;border-bottom:1px solid #e4e7f0;">
            Identité de l'expéditeur
          </td>
        </tr>
        <tr>
          <td style="padding:10px 16px;width:90px;color:#6B7280;font-size:13px;font-weight:bold;
                     border-bottom:1px solid #f0f1f8;">Prénom</td>
          <td style="padding:10px 16px;color:#1e2464;font-size:14px;font-weight:600;
                     border-bottom:1px solid #f0f1f8;">${first_name}</td>
        </tr>
        <tr>
          <td style="padding:10px 16px;color:#6B7280;font-size:13px;font-weight:bold;
                     border-bottom:1px solid #f0f1f8;">Nom</td>
          <td style="padding:10px 16px;color:#1e2464;font-size:14px;font-weight:600;
                     border-bottom:1px solid #f0f1f8;">${last_name}</td>
        </tr>
        <tr>
          <td style="padding:10px 16px;color:#6B7280;font-size:13px;font-weight:bold;
                     border-bottom:1px solid #f0f1f8;">Email</td>
          <td style="padding:10px 16px;border-bottom:1px solid #f0f1f8;">
            <a href="mailto:${email}" style="color:#2B3475;font-size:14px;font-weight:600;
               text-decoration:none;">${email}</a>
          </td>
        </tr>
        <tr>
          <td style="padding:10px 16px;color:#6B7280;font-size:13px;font-weight:bold;">Sujet</td>
          <td style="padding:10px 16px;color:#1e2464;font-size:14px;font-weight:600;">${subject}</td>
        </tr>
      </table>

      <!-- Message -->
      <p style="margin:0 0 10px;font-size:13px;font-weight:bold;color:#6B7280;
                text-transform:uppercase;letter-spacing:.08em;">Message</p>
      <div style="background:#f4f6fb;border-left:4px solid #2B3475;border-radius:0 10px 10px 0;
                  padding:18px 22px;font-size:14px;color:#374151;line-height:1.75;">
        ${msgSafe}
      </div>

      <!-- Instruction -->
      <p style="margin:24px 0 0;font-size:13px;color:#6B7280;line-height:1.6;">
        💡 Pour répondre directement à ${first_name}, utilisez le bouton
        <strong>Répondre</strong> — la réponse sera adressée à
        <a href="mailto:${email}" style="color:#2B3475;text-decoration:none;">${email}</a>.
      </p>

      <!-- Footer -->
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:32px;border-top:1px solid #e4e7f0;">
        <tr>
          <td style="padding-top:20px;text-align:center;color:#9CA3AF;font-size:11px;line-height:1.7;">
            ARC — Ambassade du Royaume de Christ<br/>
            Av. Charles-Naine 39 · 2300 La Chaux-de-Fonds · Suisse<br/>
            <a href="https://arc-eglise.ch" style="color:#2B3475;text-decoration:none;">arc-eglise.ch</a>
            &nbsp;·&nbsp;
            <a href="mailto:contact@arc-eglise.ch" style="color:#2B3475;text-decoration:none;">contact@arc-eglise.ch</a>
          </td>
        </tr>
      </table>

    </td>
  </tr>

</table>
</td></tr>
</table>
</body>
</html>`;
}
