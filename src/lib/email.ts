import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM = "ARC Église <contact@arc-eglise.ch>";
const REPLY_TO = "contact@arc-eglise.ch";

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
    from: FROM,
    to: [REPLY_TO],
    replyTo: email,
    subject: `[Contact] ${subject}`,
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;color:#1e2464">
        <div style="background:#1e2464;padding:24px 32px;border-radius:12px 12px 0 0">
          <h1 style="color:#fff;margin:0;font-size:20px">Nouveau message de contact</h1>
        </div>
        <div style="background:#f8f6ff;padding:32px;border-radius:0 0 12px 12px;border:1px solid #e5e3f5;border-top:none">
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
        </div>
        <p style="text-align:center;color:#aaa;font-size:11px;margin-top:16px">
          ARC Ambassade du Royaume de Christ — arc-eglise.ch
        </p>
      </div>
    `,
  });

  if (error) throw new Error(error.message);
}

export async function sendContactConfirmation(data: Pick<ContactFormData, "first_name" | "email">) {
  const { first_name, email } = data;

  const { error } = await resend.emails.send({
    from: FROM,
    to: [email],
    replyTo: REPLY_TO,
    subject: "Nous avons bien reçu votre message — ARC Église",
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;color:#1e2464">
        <div style="background:#1e2464;padding:24px 32px;border-radius:12px 12px 0 0">
          <h1 style="color:#fff;margin:0;font-size:20px">ARC Ambassade du Royaume de Christ</h1>
        </div>
        <div style="background:#f8f6ff;padding:32px;border-radius:0 0 12px 12px;border:1px solid #e5e3f5;border-top:none">
          <p>Bonjour ${first_name},</p>
          <p>Nous avons bien reçu votre message et nous vous répondrons dans les meilleurs délais.</p>
          <p style="color:#6b6f86;font-size:13px">Si votre demande est urgente, vous pouvez également nous joindre directement à <a href="mailto:contact@arc-eglise.ch" style="color:#1e2464">contact@arc-eglise.ch</a>.</p>
          <p>Que Dieu vous bénisse,<br/><strong>L'équipe ARC</strong></p>
        </div>
        <p style="text-align:center;color:#aaa;font-size:11px;margin-top:16px">
          ARC Ambassade du Royaume de Christ — arc-eglise.ch
        </p>
      </div>
    `,
  });

  if (error) throw new Error(error.message);
}
