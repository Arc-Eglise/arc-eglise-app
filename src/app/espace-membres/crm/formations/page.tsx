import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import MemberSidebar from "@/components/espace-membres/MemberSidebar";
import { droits } from "@/lib/droits";
import { DONS_ENABLED } from "@/lib/features";
import { listFormations } from "@/lib/actions/formations";
import type { Formation } from "@/lib/formations-constants";
import FormationsClient from "./FormationsClient";

export const dynamic = "force-dynamic";

export default async function FormationsPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/connexion");

  const { data: me } = await supabase
    .from("profiles")
    .select("role, groups, managed_groups, first_name, last_name, email, avatar_url")
    .eq("id", user.id)
    .single();
  const meGroups = (me?.groups as string[] | null) ?? [];
  // Onglet CRM : accès réservé — Pasteur / fonction Support / membres ayant accès
  // au CRM (admin + fonction Suivi). Règle unique = droits.peutVoirCRM.
  const hasCrmAccess = droits.peutVoirCRM(me ?? {});
  if (!hasCrmAccess) redirect("/espace-membres");
  const canWrite = ["admin", "pasteur"].includes(me?.role ?? "") || meGroups.includes("suivi");

  const { data: membersData } = await supabase
    .from("profiles")
    .select("id, first_name, last_name, avatar_url")
    .eq("validated", true)
    .order("first_name", { ascending: true });
  const members = (membersData ?? []).map((m) => ({
    id: m.id as string,
    name: [m.first_name, m.last_name].filter(Boolean).join(" ") || "Membre",
    avatarUrl: (m.avatar_url as string | null) ?? null,
  }));

  const res = await listFormations();
  const fdata = res && "data" in res ? res.data : null;
  const formations: Formation[] = fdata?.formations ?? [];
  const enrollments: Record<string, string[]> = fdata?.enrollments ?? {};
  const completed = fdata?.completed ?? {};
  const enrollStatus = fdata?.status ?? {};
  const attendance = fdata?.attendance ?? {};

  const managedGroups = ((me as { managed_groups?: string[] } | null)?.managed_groups ?? []);
  const sidebarPerms = {
    canAdmin: ["admin", "pasteur"].includes(me?.role ?? "") || meGroups.includes("communication") || meGroups.includes("support"),
    peutVoirCRM: droits.peutVoirCRM(me ?? {}),
    isManager: managedGroups.length > 0,
    donsEnabled: DONS_ENABLED,
    hasGroups: meGroups.length > 0,
  };
  const sidebarUser = {
    displayName: me ? `${me.first_name ?? ""} ${me.last_name ?? ""}`.trim() || (me.email ?? "Membre") : "Membre",
    initiale: (me?.first_name?.[0] ?? me?.email?.[0] ?? "?").toUpperCase(),
    role: me?.role ?? "membre",
    avatarUrl: (me?.avatar_url as string | null) ?? null,
  };

  return (
    <>
      <MemberSidebar perms={sidebarPerms} user={sidebarUser} membresValides={members.length} />
      <div className="min-[821px]:ml-[220px] max-w-[1200px] px-4 md:px-6 pt-6 pb-24">
        <FormationsClient
          initialFormations={formations}
          initialEnrollments={enrollments}
          initialCompleted={completed}
          initialStatus={enrollStatus}
          initialAttendance={attendance}
          members={members}
          canWrite={canWrite}
          currentUserId={user.id}
        />
      </div>
    </>
  );
}
