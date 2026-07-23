import { createAdminClient } from "@/lib/supabase/admin";
import { notifyMany } from "@/lib/notify";

/**
 * Notifie l'audience d'une demande de prière selon sa visibilité
 * (all / pasteur / groups / members). Partagé entre la server action
 * `submitPrayerRequest` (membres.ts) et le moteur IA `prayer-engine`.
 */
export async function notifyPrayerAudience(row: {
  userId: string;
  title: string;
  isAnonymous: boolean;
  visibility: string | null;
  targetGroups: string[];
  targetMembers: string[];
}) {
  const admin = createAdminClient();

  let author = "Un membre";
  if (!row.isAnonymous) {
    const { data: p } = await admin
      .from("profiles").select("first_name, last_name").eq("id", row.userId).maybeSingle();
    const name = [p?.first_name, p?.last_name].filter(Boolean).join(" ").trim();
    if (name) author = name;
  }

  const vis = row.visibility ?? "all";
  let recipientIds: string[] = [];
  let title = `🙏 Prière de ${author}`;

  if (vis === "all") {
    const { data } = await admin.from("profiles")
      .select("id").eq("validated", true).neq("id", row.userId).limit(500);
    recipientIds = (data ?? []).map((r: { id: string }) => r.id);
  } else if (vis === "pasteur") {
    const { data } = await admin.from("profiles")
      .select("id").in("role", ["pasteur", "admin"]).neq("id", row.userId);
    recipientIds = (data ?? []).map((r: { id: string }) => r.id);
    title = `🙏 Prière (pasteurs) — ${author}`;
  } else if (vis === "groups" && row.targetGroups.length) {
    const { data } = await admin.from("profiles")
      .select("id, groups").eq("validated", true).neq("id", row.userId);
    recipientIds = (data ?? [])
      .filter((r: { groups: string[] | null }) => (r.groups ?? []).some((g) => row.targetGroups.includes(g)))
      .map((r: { id: string }) => r.id);
    title = `🙏 Prière dans ton groupe — ${author}`;
  } else if (vis === "members" && row.targetMembers.length) {
    recipientIds = row.targetMembers.filter((id) => id !== row.userId);
    title = `🙏 ${author} partage une prière avec toi`;
  }

  if (recipientIds.length) {
    await notifyMany(recipientIds, {
      type: "prayer",
      title,
      body: row.title.slice(0, 90),
      link: "/espace-membres?p=priere",
    });
  }
}
