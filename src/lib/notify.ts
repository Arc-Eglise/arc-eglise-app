import { createAdminClient } from "@/lib/supabase/admin";
import { sendPushToUser } from "@/lib/push";
import { isTypeEnabled } from "@/lib/notification-types";

/**
 * Service de notification unifié — POINT D'ENTRÉE UNIQUE.
 *
 * Toute notification passe par ici : le canal push (Web Push) est envoyé
 * ET la ligne in-app est écrite (historique pour la cloche NotifBell).
 * La notif in-app n'existe qu'à travers ce service — plus de trigger SQL.
 */

export type NotifInput = {
  userId: string;
  type: string;
  title: string;
  body?: string | null;
  link?: string | null;
  /** Anti-doublon : ignore si une notif identique (type+title) existe depuis N heures. */
  dedupHours?: number;
};

/** Notifie un seul utilisateur (push + in-app). */
export async function notifyUser(input: NotifInput) {
  const admin = createAdminClient();
  const { userId, type, title, body = null, link = null, dedupHours } = input;

  // Préférence utilisateur : la catégorie de ce type est-elle activée ?
  const { data: prof } = await admin
    .from("profiles")
    .select("notification_prefs")
    .eq("id", userId)
    .maybeSingle();
  if (!isTypeEnabled(prof?.notification_prefs as Record<string, boolean> | null, type)) {
    return { created: false, skipped: true, reason: "opted_out", push: { sent: 0, pruned: 0 } };
  }

  if (dedupHours && dedupHours > 0) {
    const since = new Date(Date.now() - dedupHours * 3600 * 1000).toISOString();
    const { data: existing } = await admin
      .from("notifications")
      .select("id")
      .eq("user_id", userId)
      .eq("type", type)
      .eq("title", title)
      .gte("created_at", since)
      .maybeSingle();
    if (existing) return { created: false, skipped: true, push: { sent: 0, pruned: 0 } };
  }

  await admin.from("notifications").insert({ user_id: userId, type, title, body, link });
  const push = await sendPushToUser(userId, { title, body, link, type });
  return { created: true, push };
}

/** Notifie tous les membres validés (push + in-app), sauf `exclude`. */
export async function broadcastNotify(input: {
  type: string;
  title: string;
  body?: string | null;
  link?: string | null;
  exclude?: string;
}) {
  const admin = createAdminClient();
  const { type, title, body = null, link = null, exclude } = input;

  let query = admin.from("profiles").select("id, notification_prefs").eq("validated", true);
  if (exclude) query = query.neq("id", exclude);
  const { data: members } = await query;
  if (!members?.length) return { sent: 0 };

  // Ne garder que les membres qui n'ont pas désactivé cette catégorie.
  const ids = (members as { id: string; notification_prefs: Record<string, boolean> | null }[])
    .filter((m) => isTypeEnabled(m.notification_prefs, type))
    .map((m) => m.id);
  if (!ids.length) return { sent: 0 };

  // Historique in-app (insertion par lots de 100)
  const rows = ids.map((id) => ({ user_id: id, type, title, body, link }));
  for (let i = 0; i < rows.length; i += 100) {
    await admin.from("notifications").insert(rows.slice(i, i + 100));
  }

  // Canal push (en parallèle, tolérant aux échecs individuels)
  await Promise.all(
    ids.map((id) => sendPushToUser(id, { title, body, link, type }).catch(() => {}))
  );

  return { sent: rows.length };
}
