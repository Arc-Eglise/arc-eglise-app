"use server";

import { createClient } from "@/lib/supabase/server";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

const TYPE_LABELS: Record<string, string> = {
  bug:        "🐛 Problème technique",
  suggestion: "💡 Suggestion d'amélioration",
  pastoral:   "🤝 Question pastorale",
  autre:      "⚠️ Autre",
};

export async function submitDoleance(
  type: string,
  message: string,
  anon: boolean
): Promise<{ success?: boolean; error?: string }> {
  if (!message.trim()) return { error: "Message vide" };

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let senderInfo = "Anonyme";
  if (!anon && user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("first_name, last_name, email")
      .eq("id", user.id)
      .single();
    if (profile) {
      senderInfo = `${profile.first_name ?? ""} ${profile.last_name ?? ""}`.trim()
        + ` &lt;${profile.email}&gt;`;
    }
  }

  const typeLabel = TYPE_LABELS[type] ?? type;

  const { error } = await resend.emails.send({
    from: "ARC Église <contact@arc-eglise.ch>",
    to: ["support@arc-eglise.ch"],
    subject: `[Doléance] ${typeLabel}`,
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;color:#1e2464">
        <div style="background:#1e2464;padding:24px 32px;border-radius:12px 12px 0 0">
          <h1 style="color:#fff;margin:0;font-size:20px">📬 Nouvelle doléance membre</h1>
        </div>
        <div style="background:#f8f6ff;padding:32px;border-radius:0 0 12px 12px;border:1px solid #e5e3f5;border-top:none">
          <table style="width:100%;border-collapse:collapse;margin-bottom:20px">
            <tr>
              <td style="padding:8px 0;color:#6b6f86;font-size:13px;width:120px">Type</td>
              <td style="padding:8px 0;font-weight:600">${typeLabel}</td>
            </tr>
            <tr>
              <td style="padding:8px 0;color:#6b6f86;font-size:13px">Émetteur</td>
              <td style="padding:8px 0">${senderInfo}</td>
            </tr>
          </table>
          <hr style="border:none;border-top:1px solid #e5e3f5;margin:0 0 20px" />
          <p style="margin:0;line-height:1.7;white-space:pre-wrap">${message.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</p>
        </div>
        <p style="text-align:center;color:#aaa;font-size:11px;margin-top:16px">
          ARC Ambassade du Royaume de Christ — arc-eglise.ch
        </p>
      </div>
    `,
  });

  if (error) return { error: error.message };
  return { success: true };
}
