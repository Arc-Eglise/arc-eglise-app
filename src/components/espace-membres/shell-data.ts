import { createClient } from "@/lib/supabase/server";
import { droits } from "@/lib/droits";
import { DONS_ENABLED } from "@/lib/features";

/**
 * Données communes du "shell" espace membre (barre de navigation gauche +
 * panneau droit) : permissions, profil affiché et stats communauté.
 * Réutilisé par les pages rattachées au CRM pour éviter la duplication.
 */
export async function getMemberShellData(userId: string) {
  const supabase = createClient();

  const { data: me } = await supabase
    .from("profiles")
    .select("role, groups, managed_groups, first_name, last_name, email, avatar_url")
    .eq("id", userId)
    .single();

  const meGroups = (me?.groups as string[] | null) ?? [];
  const isAdmin = ["admin", "pasteur"].includes(me?.role ?? "");

  const [{ count: membresValides }, { count: totalUsers }, { count: visiteurs }, { count: prayerCount }] =
    await Promise.all([
      supabase.from("profiles").select("id", { count: "exact", head: true }).eq("validated", true),
      supabase.from("profiles").select("id", { count: "exact", head: true }),
      supabase.from("profiles").select("id", { count: "exact", head: true }).eq("validated", false),
      supabase.from("prayer_requests").select("id", { count: "exact", head: true }).eq("is_answered", false),
    ]);

  return {
    sidebarPerms: {
      canAdmin: isAdmin || meGroups.includes("communication") || meGroups.includes("support"),
      peutVoirCRM: droits.peutVoirCRM(me ?? {}),
      isManager: (((me as { managed_groups?: string[] } | null)?.managed_groups?.length) ?? 0) > 0,
      donsEnabled: DONS_ENABLED,
      hasGroups: meGroups.length > 0,
    },
    sidebarUser: {
      displayName: me
        ? `${me.first_name ?? ""} ${me.last_name ?? ""}`.trim() || (me.email ?? "Membre")
        : "Membre",
      initiale: (me?.first_name?.[0] ?? me?.email?.[0] ?? "?").toUpperCase(),
      role: me?.role ?? "membre",
      avatarUrl: (me?.avatar_url as string | null) ?? null,
    },
    rp: {
      membresValides: membresValides ?? 0,
      visiteurs: visiteurs ?? 0,
      totalUsers: totalUsers ?? 0,
      prayerCount: prayerCount ?? 0,
    },
  };
}
