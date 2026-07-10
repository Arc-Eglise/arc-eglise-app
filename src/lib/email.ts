import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

// Expéditeurs
const FROM_CONTACT  = "ARC Église <contact@arc-eglise.ch>";  // vraie boîte — formulaire contact
const FROM_NOREPLY  = "ARC Église <noreply@arc-eglise.ch>";  // no-reply — emails transactionnels
const REPLY_TO      = "contact@arc-eglise.ch";

// Libellés français des rôles
const ROLE_LABELS: Record<string, string> = {
  admin:    "Administrateur",
  pasteur:  "Pasteur",
  membre:   "Membre",
  visiteur: "Visiteur",
};

// Libellés français des fonctions (groupes)
const GROUP_LABELS: Record<string, string> = {
  pasteur:       "Pasteur",
  media:         "Équipe Média",
  chorale:       "Chorale",
  jeunesse:      "La Jeunesse",
  femmes:        "Groupe des Femmes",
  social:        "Social & Hospitalité",
  sanitaire:     "Sanitaire & Propreté",
  ecodim:        "Écodim",
  suivi:         "Suivi d'âmes",
  communication: "Communication",
  support:       "Support",
  finance:       "Finance",
};

function groupLabel(g: string): string {
  return GROUP_LABELS[g.toLowerCase()] ?? g;
}

// ── Enveloppe HTML commune ─────────────────────────────────────────
function wrapHtml(content: string): string {
  return `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;color:#1e2464">
    <div style="background:#1e2464;padding:24px 32px;border-radius:12px 12px 0 0">
      <h1 style="color:#fff;margin:0;font-size:20px">ARC — Ambassade du Royaume de Christ</h1>
    </div>
    <div style="background:#f8f6ff;padding:32px;border-radius:0 0 12px 12px;border:1px solid #e5e3f5;border-top:none">
      ${content}
    </div>
    <p style="text-align:center;color:#aaa;font-size:11px;margin-top:16px">
      ARC Église — arc-eglise.ch · La Chaux-de-Fonds, Suisse
    </p>
  </div>`;
}

// ══════════════════════════════════════════════════════════════════
//  FORMULAIRE DE CONTACT (FROM contact@)
// ══════════════════════════════════════════════════════════════════

export interface ContactFormData {
  first_name: string;
  last_name: string;
  email: string;
  subject: string;
  message: string;
}

export async function sendContactNotification(data: ContactFormData) {
  const { first_name, last_name, email, subject, message } = data;

  const { error } = await resend.emails.send({
    from: FROM_CONTACT,
    to: [REPLY_TO],
    replyTo: email,
    subject: `[Contact] ${subject}`,
    html: wrapHtml(`
      <table style="width:100%;border-collapse:collapse">
        <tr><td style="padding:8px 0;color:#6b6f86;font-size:13px;width:120px">Nom</td>
            <td style="padding:8px 0;font-weight:600">${first_name} ${last_name}</td></tr>
        <tr><td style="padding:8px 0;color:#6b6f86;font-size:13px">Email</td>
            <td style="padding:8px 0"><a href="mailto:${email}" style="color:#1e2464">${email}</a></td></tr>
        <tr><td style="padding:8px 0;color:#6b6f86;font-size:13px">Sujet</td>
            <td style="padding:8px 0;font-weight:600">${subject}</td></tr>
      </table>
      <hr style="border:none;border-top:1px solid #e5e3f5;margin:20px 0" />
      <p style="margin:0;line-height:1.7;white-space:pre-wrap">${message}</p>
    `),
  });

  if (error) throw new Error(error.message);
}

export async function sendContactConfirmation(data: Pick<ContactFormData, "first_name" | "email">) {
  const { first_name, email } = data;

  const { error } = await resend.emails.send({
    from: FROM_CONTACT,
    to: [email],
    replyTo: REPLY_TO,
    subject: "Nous avons bien reçu votre message — ARC Église",
    html: wrapHtml(`
      <p>Bonjour ${first_name},</p>
      <p>Nous avons bien reçu votre message et vous répondrons dans les meilleurs délais.</p>
      <p style="color:#6b6f86;font-size:13px">
        Si votre demande est urgente, contactez-nous à
        <a href="mailto:contact@arc-eglise.ch" style="color:#1e2464">contact@arc-eglise.ch</a>.
      </p>
      <p>Que Dieu vous bénisse,<br/><strong>L'équipe ARC</strong></p>
    `),
  });

  if (error) throw new Error(error.message);
}

// ══════════════════════════════════════════════════════════════════
//  EMAILS TRANSACTIONNELS (FROM noreply@)
// ══════════════════════════════════════════════════════════════════

/** Envoyé quand un compte Visiteur est validé → Membre */
export async function sendWelcomeMemberEmail(to: string, firstName: string) {
  const { error } = await resend.emails.send({
    from: FROM_NOREPLY,
    to: [to],
    subject: "Bienvenue dans l'ARC — Votre compte est validé !",
    html: wrapHtml(`
      <p>Bonjour ${firstName || ""},</p>
      <p>
        Bonne nouvelle — votre compte a été <strong>validé</strong> par l'équipe de l'ARC.
        Vous avez maintenant accès à l'espace membres.
      </p>
      <div style="text-align:center;margin:28px 0">
        <a href="https://arc-eglise.ch/espace-membres"
           style="background:#1e2464;color:#fff;padding:14px 28px;border-radius:10px;text-decoration:none;font-weight:700;font-size:15px">
          Accéder à l'espace membres →
        </a>
      </div>
      <p style="color:#6b6f86;font-size:13px">
        Si vous avez des questions, répondez à
        <a href="mailto:contact@arc-eglise.ch" style="color:#1e2464">contact@arc-eglise.ch</a>.
      </p>
      <p>Que Dieu vous bénisse,<br/><strong>L'équipe ARC</strong></p>
    `),
  });

  if (error) throw new Error(error.message);
}

/** Envoyé quand le rôle d'un membre change */
export async function sendRoleUpdateEmail(to: string, firstName: string, newRole: string) {
  const label = ROLE_LABELS[newRole] ?? newRole;

  const { error } = await resend.emails.send({
    from: FROM_NOREPLY,
    to: [to],
    subject: `Votre rôle a été mis à jour — ARC Église`,
    html: wrapHtml(`
      <p>Bonjour ${firstName || ""},</p>
      <p>
        Votre rôle dans la communauté ARC a été mis à jour.
        Vous êtes maintenant : <strong>${label}</strong>.
      </p>
      <div style="text-align:center;margin:28px 0">
        <a href="https://arc-eglise.ch/espace-membres"
           style="background:#1e2464;color:#fff;padding:14px 28px;border-radius:10px;text-decoration:none;font-weight:700;font-size:15px">
          Voir mon espace membres →
        </a>
      </div>
      <p style="color:#6b6f86;font-size:13px">
        Questions ? Écrivez à
        <a href="mailto:contact@arc-eglise.ch" style="color:#1e2464">contact@arc-eglise.ch</a>.
      </p>
      <p>Que Dieu vous bénisse,<br/><strong>L'équipe ARC</strong></p>
    `),
  });

  if (error) throw new Error(error.message);
}

/** Envoyé quand les fonctions (groupes) d'un membre changent */
export async function sendGroupUpdateEmail(to: string, firstName: string, groups: string[]) {
  const list = groups.length > 0
    ? `<ul style="margin:8px 0 0;padding-left:20px">${groups.map(g => `<li>${groupLabel(g)}</li>`).join("")}</ul>`
    : "<p style='color:#6b6f86;font-size:13px'>Aucune fonction attribuée pour le moment.</p>";

  const { error } = await resend.emails.send({
    from: FROM_NOREPLY,
    to: [to],
    subject: "Vos fonctions ont été mises à jour — ARC Église",
    html: wrapHtml(`
      <p>Bonjour ${firstName || ""},</p>
      <p>Vos <strong>fonctions</strong> dans la communauté ARC ont été mises à jour :</p>
      ${list}
      <div style="text-align:center;margin:28px 0">
        <a href="https://arc-eglise.ch/espace-membres"
           style="background:#1e2464;color:#fff;padding:14px 28px;border-radius:10px;text-decoration:none;font-weight:700;font-size:15px">
          Voir mon espace membres →
        </a>
      </div>
      <p style="color:#6b6f86;font-size:13px">
        Questions ? Écrivez à
        <a href="mailto:contact@arc-eglise.ch" style="color:#1e2464">contact@arc-eglise.ch</a>.
      </p>
      <p>Que Dieu vous bénisse,<br/><strong>L'équipe ARC</strong></p>
    `),
  });

  if (error) throw new Error(error.message);
}

/** Envoyé pour inviter quelqu'un à rejoindre la plateforme */
export async function sendInvitationEmail(
  to: string,
  firstName: string,
  inviteLink: string,
) {
  const { error } = await resend.emails.send({
    from: FROM_NOREPLY,
    to: [to],
    subject: "Vous êtes invité à rejoindre l'espace membres ARC",
    html: wrapHtml(`
      <p>Bonjour ${firstName || ""},</p>
      <p>
        L'équipe de l'<strong>ARC — Ambassade du Royaume de Christ</strong>
        vous invite à rejoindre l'espace membres de la communauté.
      </p>
      <p>Cliquez sur le bouton ci-dessous pour créer votre mot de passe et accéder à votre compte :</p>
      <div style="text-align:center;margin:28px 0">
        <a href="${inviteLink}"
           style="background:#1e2464;color:#fff;padding:14px 28px;border-radius:10px;text-decoration:none;font-weight:700;font-size:15px">
          Activer mon compte →
        </a>
      </div>
      <p style="color:#6b6f86;font-size:13px">
        Ce lien est valable 24 heures. S'il a expiré, contactez
        <a href="mailto:contact@arc-eglise.ch" style="color:#1e2464">contact@arc-eglise.ch</a>.
      </p>
      <p>Que Dieu vous bénisse,<br/><strong>L'équipe ARC</strong></p>
    `),
  });

  if (error) throw new Error(error.message);
}
