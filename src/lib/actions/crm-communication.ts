"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendMail } from "@/lib/mail/graph-client";
import { resolveSegment, type SegmentFilters, type SendSegmentResult } from "@/lib/crm/segment";

const SENDER = "communication@arc-eglise.ch";
const MAX_RECIPIENTS = 500; // garde-fou anti-envoi massif accidentel

// Autorisation d'envoi : plus stricte que la lecture CRM.
async function assertCommunicator(supabase: ReturnType<typeof createClient>) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase.from("profiles").select("role, groups").eq("id", user.id).single();
  const allowed =
    ["admin", "pasteur"].includes(data?.role ?? "") ||
    (data?.groups as string[] | null)?.includes("communication");
  return allowed ? user : null;
}

function personalize(template: string, firstName: string | null): string {
  return template.replace(/\{prenom\}/gi, firstName?.trim() || "cher membre");
}

export async function sendSegmentEmail(_prevState: SendSegmentResult | null, formData: FormData): Promise<SendSegmentResult> {
  const supabase = createClient();
  const user = await assertCommunicator(supabase);
  if (!user) return { error: "Non autorisé (réservé admin, pasteur ou communication)." };

  const subject = ((formData.get("subject") as string) ?? "").trim();
  const body    = ((formData.get("body") as string) ?? "").trim();
  if (!subject) return { error: "Objet requis." };
  if (!body)    return { error: "Message requis." };

  const filters: SegmentFilters = {
    q:          ((formData.get("q") as string) ?? "").trim() || undefined,
    stage:      ((formData.get("stage") as string) ?? "").trim() || undefined,
    tag:        ((formData.get("tag") as string) ?? "").trim() || undefined,
    group:      ((formData.get("group") as string) ?? "").trim() || undefined,
    engagement: ((formData.get("engagement") as string) ?? "").trim() || undefined,
  };

  const admin = createAdminClient();
  const members = await resolveSegment(admin, filters);
  const recipients = members.filter(m => m.email && m.email.includes("@"));
  const total = members.length;
  const noEmail = total - recipients.length;

  if (recipients.length === 0) return { error: "Aucun destinataire avec email dans ce segment.", total, noEmail };
  if (recipients.length > MAX_RECIPIENTS) {
    return { error: `Trop de destinataires (${recipients.length} > ${MAX_RECIPIENTS}). Affinez le segment.`, total };
  }

  let sent = 0, failed = 0;
  for (const r of recipients) {
    try {
      await sendMail({
        from: SENDER,
        to: r.email!,
        subject,
        body: personalize(body, r.first_name),
        isHtml: false,
      });
      sent++;
    } catch {
      failed++;
    }
  }

  return { success: true, sent, failed, total, noEmail };
}
