import { Resend } from "resend";
import { SITE_BASE, siteUrl } from "@/lib/url";

// Init lazy pour éviter un crash au build si RESEND_API_KEY n'est pas présente
let _resend: Resend | null = null;
function getResend(): Resend {
  if (!_resend) _resend = new Resend(process.env.RESEND_API_KEY);
  return _resend;
}
const FROM_NOREPLY = "ARC Église <noreply@arc-eglise.ch>";
const FROM_CONTACT = "ARC Église <contact@arc-eglise.ch>";
const REPLY_TO   = "contact@arc-eglise.ch";
const LOGO_URL   = siteUrl("/logo-arc.jpeg");
const SITE_URL   = SITE_BASE;

// ── Template engine ────────────────────────────────────────────────────────
// Replace {{variable}} placeholders — warn if a key is missing.
function interpolate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key: string) => {
    if (!(key in vars)) {
      console.warn(`[email] Missing template variable: ${key}`);
      return match;
    }
    return vars[key];
  });
}

// ── Full HTML email layout (table-based for Outlook compatibility) ──────────
function layout(body: string): string {
  return `<!DOCTYPE html>
<html lang="fr" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <!--[if mso]>
  <noscript><xml><o:OfficeDocumentSettings>
    <o:PixelsPerInch>96</o:PixelsPerInch>
  </o:OfficeDocumentSettings></xml></noscript>
  <![endif]-->
  <title>ARC Église</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f6fb;-webkit-text-size-adjust:100%;mso-line-height-rule:exactly;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"
  style="background-color:#f4f6fb;padding:32px 16px;">
  <tr><td align="center">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0"
      width="600" style="max-width:600px;width:100%;">

      <!-- ── Header ── -->
      <tr>
        <td style="background-color:#2B3475;border-radius:12px 12px 0 0;
                   padding:28px 40px;text-align:center;">
          <a href="${SITE_URL}" target="_blank" style="text-decoration:none;border:none;">
            <img src="${LOGO_URL}" alt="ARC Église" width="90" height="55"
              style="display:block;margin:0 auto;max-width:90px;border:0;
                     -ms-interpolation-mode:bicubic;" />
          </a>
          <p style="margin:10px 0 0;color:#8495C1;font-size:11px;
                    letter-spacing:1.2px;text-transform:uppercase;
                    font-family:Arial,Helvetica,sans-serif;">
            Ambassade du Royaume de Christ
          </p>
        </td>
      </tr>

      <!-- ── Body ── -->
      <tr>
        <td style="background-color:#ffffff;padding:40px;
                   border:1px solid #e4e7f0;border-top:none;
                   border-radius:0 0 12px 12px;
                   font-family:Arial,Helvetica,sans-serif;">
          ${body}

          <!-- Footer -->
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"
            style="margin-top:32px;border-top:1px solid #e4e7f0;">
            <tr>
              <td style="padding-top:20px;text-align:center;">
                <p style="margin:0;color:#9CA3AF;font-size:11px;line-height:1.7;
                          font-family:Arial,Helvetica,sans-serif;">
                  ARC — Ambassade du Royaume de Christ<br/>
                  Av. Charles-Naine 39 · 2300 La Chaux-de-Fonds · Suisse<br/>
                  <a href="${SITE_URL}" style="color:#2B3475;text-decoration:none;">arc-eglise.ch</a>
                  &nbsp;·&nbsp;
                  <a href="mailto:contact@arc-eglise.ch"
                     style="color:#2B3475;text-decoration:none;">contact@arc-eglise.ch</a>
                </p>
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

// ═══════════════════════════════════════════════════════════════════════════
//  TEMPLATES (corps uniquement — injectés dans layout())
//  Toutes les valeurs dynamiques passent par {{variable}}.
//  Les constantes (SITE_URL, LOGO_URL) sont évaluées à l'import.
// ═══════════════════════════════════════════════════════════════════════════

const T = {

  // 01 · Confirmation d'inscription
  // Variables : prenom, lien_confirmation
  //
  // Note : Supabase envoie cet email automatiquement via le relay SMTP Resend.
  // Pour y appliquer ce template, coller le HTML de sendConfirmationEmail()
  // dans : Supabase → Auth → Emails → Templates → "Confirm signup"
  // en remplaçant {{lien_confirmation}} par {{ .ConfirmationURL }}.
  confirmation: `
<h2 style="margin:0 0 20px;color:#2B3475;font-size:22px;font-weight:bold;">
  Confirme ton adresse email 📧
</h2>
<p style="margin:0 0 12px;color:#374151;font-size:15px;line-height:1.7;">
  Bonjour <strong>{{prenom}}</strong>,
</p>
<p style="margin:0 0 24px;color:#374151;font-size:15px;line-height:1.7;">
  Merci d'avoir rejoint la communauté ARC Église !<br/>
  Pour activer ton compte, clique sur le bouton ci-dessous.
</p>
<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 auto 28px;">
  <tr>
    <td align="center" bgcolor="#2B3475" style="border-radius:10px;">
      <a href="{{lien_confirmation}}" target="_blank"
         style="display:inline-block;padding:14px 32px;background-color:#2B3475;
                color:#ffffff;font-size:15px;font-weight:bold;text-decoration:none;
                border-radius:10px;font-family:Arial,sans-serif;letter-spacing:0.3px;
                mso-padding-alt:0;text-underline-color:#2B3475;">
        <!--[if mso]><i style="letter-spacing:32px;mso-font-width:-100%;mso-text-raise:30pt">&nbsp;</i><![endif]-->
        Confirmer mon adresse →
        <!--[if mso]><i style="letter-spacing:32px;mso-font-width:-100%">&nbsp;</i><![endif]-->
      </a>
    </td>
  </tr>
</table>
<div style="background-color:#f4f6fb;border-left:4px solid #8495C1;
            border-radius:0 8px 8px 0;padding:16px 20px;margin:0 0 24px;">
  <p style="margin:0;color:#6B7280;font-size:13px;line-height:1.6;">
    ⏱ Ce lien expire dans <strong>24 heures</strong>.<br/>
    Une fois ton adresse confirmée, un responsable validera ton accès à l'espace membres.
  </p>
</div>
<p style="margin:0 0 6px;color:#374151;font-size:14px;">Que Dieu vous bénisse,</p>
<p style="margin:0;color:#2B3475;font-size:14px;font-weight:bold;">L'équipe ARC</p>`,

  // 02 · Bienvenue / compte validé
  // Variables : prenom
  bienvenue: `
<h2 style="margin:0 0 20px;color:#2B3475;font-size:22px;font-weight:bold;">
  Bienvenue dans la famille ARC ! 🎉
</h2>
<p style="margin:0 0 12px;color:#374151;font-size:15px;line-height:1.7;">
  Bonjour <strong>{{prenom}}</strong>,
</p>
<p style="margin:0 0 24px;color:#374151;font-size:15px;line-height:1.7;">
  Excellente nouvelle — ton compte a été
  <strong style="color:#2B3475;">validé</strong> par un responsable de la communauté.<br/>
  Tu as maintenant pleinement accès à l'espace membres ARC.
</p>
<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 auto 28px;">
  <tr>
    <td align="center" bgcolor="#2B3475" style="border-radius:10px;">
      <a href="${SITE_URL}/espace-membres" target="_blank"
         style="display:inline-block;padding:14px 32px;background-color:#2B3475;
                color:#ffffff;font-size:15px;font-weight:bold;text-decoration:none;
                border-radius:10px;font-family:Arial,sans-serif;letter-spacing:0.3px;">
        Accéder à l'espace membres →
      </a>
    </td>
  </tr>
</table>
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"
  style="margin:0 0 24px;">
  <tr>
    <td style="background-color:#f4f6fb;border-radius:10px;padding:20px;">
      <p style="margin:0 0 10px;color:#2B3475;font-size:14px;font-weight:bold;">
        Ce qui t'attend dans l'espace membres :
      </p>
      <table role="presentation" cellpadding="0" cellspacing="0" border="0">
        <tr><td style="padding:3px 0;color:#374151;font-size:14px;">📅&nbsp; Agenda des cultes et événements</td></tr>
        <tr><td style="padding:3px 0;color:#374151;font-size:14px;">💬&nbsp; Messagerie de la communauté</td></tr>
        <tr><td style="padding:3px 0;color:#374151;font-size:14px;">📖&nbsp; Plans de lecture biblique</td></tr>
        <tr><td style="padding:3px 0;color:#374151;font-size:14px;">📋&nbsp; Annuaire des membres</td></tr>
      </table>
    </td>
  </tr>
</table>
<p style="margin:0 0 6px;color:#374151;font-size:14px;">Que Dieu vous bénisse,</p>
<p style="margin:0;color:#2B3475;font-size:14px;font-weight:bold;">L'équipe ARC</p>`,

  // 03 · Invitation
  // Variables : prenom, invitant, lien_invitation
  invitation: `
<h2 style="margin:0 0 20px;color:#2B3475;font-size:22px;font-weight:bold;">
  Tu es invité(e) à rejoindre ARC Église ✉️
</h2>
<p style="margin:0 0 12px;color:#374151;font-size:15px;line-height:1.7;">
  Bonjour <strong>{{prenom}}</strong>,
</p>
<p style="margin:0 0 24px;color:#374151;font-size:15px;line-height:1.7;">
  <strong>{{invitant}}</strong> t'invite à rejoindre l'espace membres de
  l'<strong>ARC — Ambassade du Royaume de Christ</strong>.<br/>
  Clique sur le bouton ci-dessous pour créer ton mot de passe et accéder à ton compte.
</p>
<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 auto 28px;">
  <tr>
    <td align="center" bgcolor="#2B3475" style="border-radius:10px;">
      <a href="{{lien_invitation}}" target="_blank"
         style="display:inline-block;padding:14px 32px;background-color:#2B3475;
                color:#ffffff;font-size:15px;font-weight:bold;text-decoration:none;
                border-radius:10px;font-family:Arial,sans-serif;letter-spacing:0.3px;">
        Activer mon compte →
      </a>
    </td>
  </tr>
</table>
<div style="background-color:#fff8e1;border-left:4px solid #C9A227;
            border-radius:0 8px 8px 0;padding:16px 20px;margin:0 0 24px;">
  <p style="margin:0;color:#6B7280;font-size:13px;line-height:1.6;">
    ⏱ Ce lien est valable <strong>24 heures</strong>. S'il a expiré, contacte
    <a href="mailto:contact@arc-eglise.ch" style="color:#2B3475;text-decoration:none;">contact@arc-eglise.ch</a>.
  </p>
</div>
<p style="margin:0 0 6px;color:#374151;font-size:14px;">Que Dieu vous bénisse,</p>
<p style="margin:0;color:#2B3475;font-size:14px;font-weight:bold;">L'équipe ARC</p>`,

  // 04 · Notification de profil (rôle ou fonctions)
  // Variables : prenom, message
  profil: `
<h2 style="margin:0 0 20px;color:#2B3475;font-size:22px;font-weight:bold;">
  Mise à jour de ton profil ARC 🔔
</h2>
<p style="margin:0 0 12px;color:#374151;font-size:15px;line-height:1.7;">
  Bonjour <strong>{{prenom}}</strong>,
</p>
<div style="background-color:#f4f6fb;border-left:4px solid #2B3475;
            border-radius:0 10px 10px 0;padding:20px 24px;margin:0 0 28px;">
  <p style="margin:0;color:#2B3475;font-size:15px;line-height:1.7;">{{message}}</p>
</div>
<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 auto 28px;">
  <tr>
    <td align="center" bgcolor="#2B3475" style="border-radius:10px;">
      <a href="${SITE_URL}/espace-membres" target="_blank"
         style="display:inline-block;padding:14px 32px;background-color:#2B3475;
                color:#ffffff;font-size:15px;font-weight:bold;text-decoration:none;
                border-radius:10px;font-family:Arial,sans-serif;letter-spacing:0.3px;">
        Voir mon espace membres →
      </a>
    </td>
  </tr>
</table>
<p style="margin:0 0 12px;color:#6B7280;font-size:13px;line-height:1.6;">
  Questions ? Écris-nous à
  <a href="mailto:contact@arc-eglise.ch" style="color:#2B3475;text-decoration:none;">contact@arc-eglise.ch</a>.
</p>
<p style="margin:0 0 6px;color:#374151;font-size:14px;">Que Dieu vous bénisse,</p>
<p style="margin:0;color:#2B3475;font-size:14px;font-weight:bold;">L'équipe ARC</p>`,

  // 05 · Réinitialisation mot de passe
  // Variables : prenom, lien_reset, duree_validite
  reset: `
<h2 style="margin:0 0 20px;color:#2B3475;font-size:22px;font-weight:bold;">
  Réinitialisation de ton mot de passe 🔐
</h2>
<p style="margin:0 0 12px;color:#374151;font-size:15px;line-height:1.7;">
  Bonjour <strong>{{prenom}}</strong>,
</p>
<p style="margin:0 0 24px;color:#374151;font-size:15px;line-height:1.7;">
  Nous avons reçu une demande de réinitialisation de mot de passe pour ton compte ARC Église.<br/>
  Clique sur le bouton ci-dessous pour choisir un nouveau mot de passe.
</p>
<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 auto 28px;">
  <tr>
    <td align="center" bgcolor="#2B3475" style="border-radius:10px;">
      <a href="{{lien_reset}}" target="_blank"
         style="display:inline-block;padding:14px 32px;background-color:#2B3475;
                color:#ffffff;font-size:15px;font-weight:bold;text-decoration:none;
                border-radius:10px;font-family:Arial,sans-serif;letter-spacing:0.3px;">
        Choisir un nouveau mot de passe →
      </a>
    </td>
  </tr>
</table>
<div style="background-color:#fff8e1;border-left:4px solid #C9A227;
            border-radius:0 8px 8px 0;padding:16px 20px;margin:0 0 24px;">
  <p style="margin:0;color:#6B7280;font-size:13px;line-height:1.6;">
    ⏱ Ce lien est valable <strong>{{duree_validite}}</strong>
    et ne peut être utilisé qu'une seule fois.<br/>
    Si tu n'es pas à l'origine de cette demande, ignore cet email — ton mot de passe ne changera pas.
  </p>
</div>
<p style="margin:0 0 6px;color:#374151;font-size:14px;">Que Dieu vous bénisse,</p>
<p style="margin:0;color:#2B3475;font-size:14px;font-weight:bold;">L'équipe ARC</p>`,

  // 06 · Confirmation de modification de mot de passe
  // Variables : prenom, date_heure
  password_changed: `
<h2 style="margin:0 0 20px;color:#2B3475;font-size:22px;font-weight:bold;">
  Ton mot de passe a été modifié 🔐
</h2>
<p style="margin:0 0 12px;color:#374151;font-size:15px;line-height:1.7;">
  Bonjour <strong>{{prenom}}</strong>,
</p>
<p style="margin:0 0 24px;color:#374151;font-size:15px;line-height:1.7;">
  Le mot de passe de ton compte ARC Église a été modifié avec succès le <strong>{{date_heure}}</strong>.
</p>
<div style="background-color:#fff8e1;border-left:4px solid #C9A227;
            border-radius:0 8px 8px 0;padding:16px 20px;margin:0 0 28px;">
  <p style="margin:0 0 8px;color:#374151;font-size:14px;font-weight:bold;">
    ⚠️ Tu n'es pas à l'origine de ce changement ?
  </p>
  <p style="margin:0;color:#6B7280;font-size:13px;line-height:1.6;">
    Si tu n'as pas effectué cette modification, contacte-nous immédiatement à
    <a href="mailto:contact@arc-eglise.ch" style="color:#2B3475;text-decoration:none;font-weight:bold;">contact@arc-eglise.ch</a>
    afin que nous sécurisions ton compte.
  </p>
</div>
<p style="margin:0 0 6px;color:#374151;font-size:14px;">Que Dieu vous bénisse,</p>
<p style="margin:0;color:#2B3475;font-size:14px;font-weight:bold;">L'équipe ARC</p>`,

} as const;

// ── Generic send helper ────────────────────────────────────────────────────
async function sendEmail(opts: {
  from: string;
  replyTo?: string;
  to: string;
  subject: string;
  html: string;
}) {
  const { error } = await getResend().emails.send({
    from: opts.from,
    replyTo: opts.replyTo,
    to: [opts.to],
    subject: opts.subject,
    html: opts.html,
  });
  if (error) throw new Error(`[Resend] ${error.message}`);
}

// ── Render helper ──────────────────────────────────────────────────────────
function render(key: keyof typeof T, vars: Record<string, string>): string {
  return layout(interpolate(T[key], vars));
}

// ═══════════════════════════════════════════════════════════════════════════
//  EMAILS TRANSACTIONNELS (noreply@)
// ═══════════════════════════════════════════════════════════════════════════

// 01 · Confirmation d'inscription
// Supabase envoie cet email automatiquement via le relay SMTP Resend.
// sendConfirmationEmail() est exportée pour usage manuel (ex. renvoi admin)
// ou pour mettre à jour le template Supabase : Auth → Emails → Templates →
// "Confirm signup". Remplacer {{lien_confirmation}} par {{ .ConfirmationURL }}.
export async function sendConfirmationEmail(
  to: string,
  prenom: string,
  lienConfirmation: string,
) {
  await sendEmail({
    from:     FROM_NOREPLY,
    replyTo:  REPLY_TO,
    to,
    subject:  "Confirme ton adresse pour rejoindre ARC Église",
    html:     render("confirmation", { prenom, lien_confirmation: lienConfirmation }),
  });
}

// 02 · Bienvenue / compte validé
export async function sendWelcomeMemberEmail(to: string, prenom: string) {
  await sendEmail({
    from:    FROM_NOREPLY,
    replyTo: REPLY_TO,
    to,
    subject: "Bienvenue dans la communauté ARC Église",
    html:    render("bienvenue", { prenom }),
  });
}

// 03 · Invitation
export async function sendInvitationEmail(
  to: string,
  prenom: string,
  lienInvitation: string,
  invitant = "L'équipe ARC",
) {
  await sendEmail({
    from:    FROM_NOREPLY,
    replyTo: REPLY_TO,
    to,
    subject: "Tu es invité(e) à rejoindre ARC Église",
    html:    render("invitation", { prenom, lien_invitation: lienInvitation, invitant }),
  });
}

// 04 · Notification de profil — message HTML construit côté appelant
export async function sendProfileUpdateEmail(
  to: string,
  prenom: string,
  message: string,
) {
  await sendEmail({
    from:    FROM_NOREPLY,
    replyTo: REPLY_TO,
    to,
    subject: "Ton profil ARC Église a été mis à jour",
    html:    render("profil", { prenom, message }),
  });
}

// 05 · Réinitialisation mot de passe
// duree_validite doit correspondre au token Supabase (défaut : 1 heure)
export async function sendPasswordResetEmail(
  to: string,
  prenom: string,
  lienReset: string,
  dureeValidite = "1 heure",
) {
  await sendEmail({
    from:    FROM_NOREPLY,
    replyTo: REPLY_TO,
    to,
    subject: "Réinitialisation de ton mot de passe ARC Église",
    html:    render("reset", { prenom, lien_reset: lienReset, duree_validite: dureeValidite }),
  });
}

// 06 · Confirmation de modification de mot de passe
export async function sendPasswordChangedEmail(to: string, prenom: string) {
  const dateHeure = new Date().toLocaleString("fr-CH", {
    day: "2-digit", month: "long", year: "numeric",
    hour: "2-digit", minute: "2-digit", timeZone: "Europe/Zurich",
  });
  await sendEmail({
    from:    FROM_NOREPLY,
    replyTo: REPLY_TO,
    to,
    subject: "Ton mot de passe ARC Église a été modifié",
    html:    render("password_changed", { prenom, date_heure: dateHeure }),
  });
}

// ═══════════════════════════════════════════════════════════════════════════
//  FORMULAIRE DE CONTACT (contact@)
// ═══════════════════════════════════════════════════════════════════════════

export interface ContactFormData {
  first_name: string;
  last_name:  string;
  email:      string;
  subject:    string;
  message:    string;
}

export async function sendContactNotification(data: ContactFormData) {
  const { first_name, last_name, email, subject, message } = data;

  await sendEmail({
    from:    FROM_CONTACT,
    replyTo: email,
    to:      REPLY_TO,
    subject: `[Contact] ${subject}`,
    html: layout(`
      <h2 style="margin:0 0 20px;color:#2B3475;font-size:20px;font-weight:bold;">
        Nouveau message de contact
      </h2>
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"
        style="border-collapse:collapse;margin:0 0 20px;">
        <tr>
          <td style="padding:8px 0;color:#6B7280;font-size:13px;width:110px;
                     vertical-align:top;font-weight:bold;">Nom</td>
          <td style="padding:8px 0;color:#374151;font-size:14px;font-weight:600;">
            ${first_name} ${last_name}
          </td>
        </tr>
        <tr>
          <td style="padding:8px 0;color:#6B7280;font-size:13px;vertical-align:top;font-weight:bold;">Email</td>
          <td style="padding:8px 0;">
            <a href="mailto:${email}" style="color:#2B3475;font-size:14px;">${email}</a>
          </td>
        </tr>
        <tr>
          <td style="padding:8px 0;color:#6B7280;font-size:13px;vertical-align:top;font-weight:bold;">Sujet</td>
          <td style="padding:8px 0;color:#374151;font-size:14px;font-weight:600;">${subject}</td>
        </tr>
      </table>
      <div style="border-top:1px solid #e4e7f0;padding-top:20px;">
        <p style="margin:0;color:#374151;font-size:14px;line-height:1.7;white-space:pre-wrap;">${message}</p>
      </div>
    `),
  });
}

export async function sendContactConfirmation(
  data: Pick<ContactFormData, "first_name" | "email">,
) {
  const { first_name, email } = data;

  await sendEmail({
    from:    FROM_CONTACT,
    replyTo: REPLY_TO,
    to:      email,
    subject: "Nous avons bien reçu votre message — ARC Église",
    html: layout(`
      <h2 style="margin:0 0 20px;color:#2B3475;font-size:22px;font-weight:bold;">
        Message bien reçu ✅
      </h2>
      <p style="margin:0 0 12px;color:#374151;font-size:15px;line-height:1.7;">
        Bonjour ${first_name},
      </p>
      <p style="margin:0 0 20px;color:#374151;font-size:15px;line-height:1.7;">
        Nous avons bien reçu votre message et vous répondrons dans les meilleurs délais.
      </p>
      <p style="margin:0 0 20px;color:#6B7280;font-size:13px;line-height:1.6;">
        Si votre demande est urgente, contactez-nous directement à
        <a href="mailto:contact@arc-eglise.ch" style="color:#2B3475;text-decoration:none;">contact@arc-eglise.ch</a>.
      </p>
      <p style="margin:0 0 6px;color:#374151;font-size:14px;">Que Dieu vous bénisse,</p>
      <p style="margin:0;color:#2B3475;font-size:14px;font-weight:bold;">L'équipe ARC</p>
    `),
  });
}
