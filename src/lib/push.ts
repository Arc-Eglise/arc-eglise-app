import webpush from "web-push";
import { createAdminClient } from "@/lib/supabase/admin";

let configured = false;

function ensureConfigured() {
  if (configured) return;
  const pub = process.env.VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || "mailto:contact@arc-eglise.ch";
  if (!pub || !priv) {
    throw new Error("VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY manquantes");
  }
  webpush.setVapidDetails(subject, pub, priv);
  configured = true;
}

export type PushPayload = {
  title: string;
  body?: string | null;
  link?: string | null;
  type?: string | null;
  icon?: string;
  tag?: string;
};

/**
 * Envoie une notification push à tous les abonnements d'un utilisateur.
 * Purge automatiquement les endpoints morts (404/410).
 */
export async function sendPushToUser(userId: string, payload: PushPayload) {
  ensureConfigured();
  const admin = createAdminClient();

  const { data: subs } = await admin
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth")
    .eq("user_id", userId);

  if (!subs?.length) return { sent: 0, pruned: 0 };

  const json = JSON.stringify({
    title: payload.title,
    body: payload.body ?? "",
    link: payload.link ?? "/espace-membres",
    type: payload.type ?? "system",
    icon: payload.icon ?? "/images/logo-arc.jpeg",
    tag: payload.tag,
  });

  const dead: string[] = [];
  let sent = 0;

  await Promise.all(
    subs.map(async (s: { id: string; endpoint: string; p256dh: string; auth: string }) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          json
        );
        sent++;
      } catch (err: unknown) {
        const code = (err as { statusCode?: number })?.statusCode;
        if (code === 404 || code === 410) dead.push(s.id);
      }
    })
  );

  if (dead.length) {
    await admin.from("push_subscriptions").delete().in("id", dead);
  }

  return { sent, pruned: dead.length };
}
