import { createAdminClient } from "@/lib/supabase/admin";
import type WebPush from "web-push";

// `web-push` (bindings natifs) est chargé PARESSEUSEMENT (import dynamique) pour
// ne PAS alourdir le démarrage à froid de toutes les routes qui importent
// transitivement notify/push (ex. notes-taches → shares → notify). Un cold start
// trop lourd provoquait des 503 intermittents sur Vercel Hobby.
let webpush: typeof WebPush | null = null;
let configured = false;

/** Configure web-push. Retourne false (sans lever) si les clés VAPID manquent. */
async function ensureConfigured(): Promise<boolean> {
  if (configured && webpush) return true;
  const pub = process.env.VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || "mailto:contact@arc-eglise.ch";
  if (!pub || !priv) {
    console.warn("[push] VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY manquantes — push désactivé");
    return false;
  }
  webpush = (await import("web-push")).default;
  webpush.setVapidDetails(subject, pub, priv);
  configured = true;
  return true;
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
  if (!(await ensureConfigured()) || !webpush) return { sent: 0, pruned: 0 };
  const wp = webpush;
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
        await wp.sendNotification(
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
