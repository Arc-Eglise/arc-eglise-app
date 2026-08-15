import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import NotesTachesClient from "./NotesTachesClient";
import MemberSidebar from "@/components/espace-membres/MemberSidebar";
import MemberRightPanel from "@/components/espace-membres/MemberRightPanel";
import { droits } from "@/lib/droits";
import { DONS_ENABLED } from "@/lib/features";
import type { NoteRow, TaskRow, TagRow } from "@/lib/notes-taches/types";

export const dynamic = "force-dynamic";

export default async function NotesTachesPage({
  searchParams,
}: {
  searchParams?: { tab?: string };
}) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/connexion");

  const [notesRes, tasksRes, sharesRes, tagsRes, noteTagsRes, taskTagsRes] = await Promise.all([
    supabase
      .from("notes")
      .select("*")
      .is("archived_at", null)
      .order("is_pinned", { ascending: false })
      .order("position", { ascending: true })
      .order("updated_at", { ascending: false }),
    supabase
      .from("tasks")
      .select("*")
      .eq("owner_id", user.id)
      .order("position", { ascending: true })
      .order("created_at", { ascending: false }),
    supabase
      .from("shares")
      .select("id", { count: "exact", head: true })
      .eq("status", "en_attente")
      .neq("shared_by", user.id),
    supabase.from("user_tags").select("*").eq("owner_id", user.id).order("label"),
    supabase.from("note_tags").select("note_id, tag_id"),
    supabase.from("task_tags").select("task_id, tag_id"),
  ]);

  const noteTagMap: Record<string, string[]> = {};
  for (const r of (noteTagsRes.data ?? []) as { note_id: string; tag_id: string }[]) {
    (noteTagMap[r.note_id] ??= []).push(r.tag_id);
  }
  const taskTagMap: Record<string, string[]> = {};
  for (const r of (taskTagsRes.data ?? []) as { task_id: string; tag_id: string }[]) {
    (taskTagMap[r.task_id] ??= []).push(r.tag_id);
  }

  // Verset d'en-tête — vraie donnée (table citations), comme la page de connexion
  const { data: citation } = await supabase
    .from("citations")
    .select("texte, auteur")
    .eq("is_active", true)
    .maybeSingle();

  const initialTab =
    searchParams?.tab === "taches"   ? "taches" :
    searchParams?.tab === "partages" ? "partages" : "notes";

  // ── Barre de navigation fixe de l'espace membre (permissions authentiques) ──
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, groups, managed_groups, first_name, last_name, email, avatar_url")
    .eq("id", user.id)
    .single();
  const [{ count: membresValides }, { count: rpTotal }, { count: rpVisiteurs }, { count: rpPrayer }] = await Promise.all([
    supabase.from("profiles").select("id", { count: "exact", head: true }).eq("validated", true),
    supabase.from("profiles").select("id", { count: "exact", head: true }),
    supabase.from("profiles").select("id", { count: "exact", head: true }).eq("validated", false),
    supabase.from("prayer_requests").select("id", { count: "exact", head: true }).eq("is_answered", false),
  ]);

  const role = profile?.role ?? "visiteur";
  const groups: string[] = profile?.groups ?? [];

  // ── Attribution de tâches : droits directionnels ──────────────────────────
  //   • manager de groupe → membres de SES groupes uniquement
  //   • pasteur / support (+ admin) → n'importe quel membre
  const managedGroups: string[] = profile?.managed_groups ?? [];
  const canAssignAnyone = ["admin", "pasteur"].includes(role) || groups.includes("support");
  const canAssign = canAssignAnyone || managedGroups.length > 0;

  const { data: membersData } = await supabase
    .from("profiles")
    .select("id, first_name, last_name, avatar_url, groups")
    .eq("validated", true)
    .order("first_name", { ascending: true });
  const allMembers = (membersData ?? []).map((m) => ({
    id: m.id as string,
    name: [m.first_name, m.last_name].filter(Boolean).join(" ") || "Membre",
    avatarUrl: (m.avatar_url as string | null) ?? null,
    groups: (m.groups as string[] | null) ?? [],
  }));
  // Liste complète (affichage des avatars « Attribué à … »)
  const members = allMembers.map(({ id, name, avatarUrl }) => ({ id, name, avatarUrl }));
  // Cibles autorisées (sélecteur d'attribution) selon les droits directionnels
  const assignableMembers = !canAssign
    ? []
    : allMembers
        .filter((m) => m.id !== user.id)
        .filter((m) => canAssignAnyone || m.groups.some((g) => managedGroups.includes(g)))
        .map(({ id, name, avatarUrl }) => ({ id, name, avatarUrl }));

  const canAdmin = ["admin", "pasteur"].includes(role) || groups.includes("communication") || groups.includes("support");
  const perms = {
    canAdmin,
    peutVoirCRM: droits.peutVoirCRM(profile ?? {}),
    isManager: (profile?.managed_groups?.length ?? 0) > 0,
    donsEnabled: DONS_ENABLED,
    hasGroups: groups.length > 0,
  };
  const sidebarUser = {
    displayName: profile
      ? `${profile.first_name ?? ""} ${profile.last_name ?? ""}`.trim() || (profile.email ?? "Membre")
      : "Membre",
    initiale: (profile?.first_name?.[0] ?? profile?.email?.[0] ?? "?").toUpperCase(),
    role,
    avatarUrl: profile?.avatar_url ?? null,
  };

  return (
    <>
    <MemberSidebar perms={perms} user={sidebarUser} membresValides={membresValides ?? 0} />
    <MemberRightPanel membresValides={membresValides ?? 0} visiteurs={rpVisiteurs ?? 0} totalUsers={rpTotal ?? 0} prayerCount={rpPrayer ?? 0} />
    <div className="min-[821px]:ml-[220px] min-[1280px]:mr-[264px]">
    <div className="max-w-[1200px] px-4 md:px-6 pt-6 pb-24">
      {/* En-tête — portage maquette Stitch (Notes et Tâches v3.4_1) */}
      <header className="mb-12">
        <h1
          className="text-[40px] md:text-[48px] md:leading-[56px] md:tracking-[-0.02em] leading-tight font-bold text-[#000666]"
          style={{ fontFamily: '"Playfair Display", serif' }}
        >
          Notes et Tâches
        </h1>
        {citation ? (
          <div className="border-l-4 border-[#775a19] pl-6 py-2 mt-6 max-w-2xl">
            <p
              className="text-[24px] leading-[32px] italic text-[#191c1d] opacity-90"
              style={{ fontFamily: '"Playfair Display", serif', fontWeight: 600 }}
            >
              &ldquo;{citation.texte}&rdquo;
            </p>
            {citation.auteur && (
              <p className="text-xs text-[#454652] mt-2 uppercase tracking-widest">{citation.auteur}</p>
            )}
          </div>
        ) : (
          <p className="text-[16px] text-[#454652] mt-2">Tes pense-bêtes et ta liste de tâches, au même endroit.</p>
        )}
      </header>
      <NotesTachesClient
        initialNotes={(notesRes.data ?? []) as NoteRow[]}
        initialTasks={(tasksRes.data ?? []) as TaskRow[]}
        initialTab={initialTab}
        initialPendingShares={sharesRes.count ?? 0}
        initialTags={(tagsRes.data ?? []) as TagRow[]}
        noteTagMap={noteTagMap}
        taskTagMap={taskTagMap}
        members={members}
        assignableMembers={assignableMembers}
        currentUserId={user.id}
      />
    </div>
    </div>
    </>
  );
}
