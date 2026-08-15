import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect, notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import MemberSidebar from "@/components/espace-membres/MemberSidebar";
import MemberRightPanel from "@/components/espace-membres/MemberRightPanel";
import { getMemberShellData } from "@/components/espace-membres/shell-data";
import { addMemberNote, deleteMemberNote, updateMemberValidation, updateMemberRole, updateMemberGroups, assignGroupManager, revokeGroupManager, updatePastoralStage, addMemberInteraction, deleteMemberInteraction, createPastoralTask, updateTaskStatus, deletePastoralTask } from "@/lib/actions/membres";
import { DangerActionsPanel } from "@/components/crm/DangerActionsPanel";
import { RoleSelectorClient } from "@/components/crm/RoleSelectorClient";
import { GroupsEditorClient } from "@/components/crm/GroupsEditorClient";
import CrmTagsEditor from "../CrmTagsEditor";
import GroupBadge from "@/components/GroupBadge";
import MemberTimeline from "@/components/crm/MemberTimeline";
import { computeEngagement, ENGAGEMENT_META } from "@/lib/crm/engagement";

const STAGES: { key: string; label: string; color: string }[] = [
  { key: "visiteur",    label: "Visiteur",     color: "text-gray-600 bg-gray-50 border-gray-200"       },
  { key: "integration", label: "Intégration",  color: "text-amber-700 bg-amber-50 border-amber-200"    },
  { key: "actif",       label: "Membre actif", color: "text-green-700 bg-green-50 border-green-200"    },
  { key: "formation",   label: "Formation",    color: "text-blue-700 bg-blue-50 border-blue-200"       },
  { key: "responsable", label: "Responsable",  color: "text-purple-700 bg-purple-50 border-purple-200" },
];
const STAGE_MAP = Object.fromEntries(STAGES.map(s => [s.key, s]));

const ALL_GROUPS = ["pasteur","chorale","media","social","hospitalite","sanitaire","finance","support","jeunesse","femmes","ecodim","suivi","communication"];
const GROUP_LABELS_LOCAL: Record<string,string> = {
  pasteur:"Pasteur",chorale:"Chorale",media:"Équipe Média",social:"Social & Hospitalité",
  hospitalite:"Hospitalité",sanitaire:"Sanitaire",finance:"Finance",support:"Support",
  jeunesse:"La Jeunesse",femmes:"Groupe des Femmes",ecodim:"Écodim",suivi:"Suivi d'âmes",
  communication:"Communication",
};
const GROUP_EMOJIS: Record<string,string> = {
  pasteur:"👑",chorale:"🎵",media:"🎬",social:"🤝",hospitalite:"🤝",sanitaire:"🏥",finance:"💰",
  support:"🛠️",jeunesse:"⚡",femmes:"🌸",ecodim:"📚",suivi:"🕊️",communication:"📣",
};
const ROLE_STYLE: Record<string, string> = {
  admin:    "text-red-700 bg-red-50 border-red-200",
  pasteur:  "text-purple-700 bg-purple-50 border-purple-200",
  support:  "text-blue-700 bg-blue-50 border-blue-200",
  membre:   "text-green-700 bg-green-50 border-green-200",
  visiteur: "text-gray-700 bg-gray-50 border-gray-200",
};

const NOTE_TYPES = [
  { val: "general",   label: "Général" },
  { val: "pastoral",  label: "Pastoral" },
  { val: "suivi",     label: "Suivi" },
  { val: "priere",    label: "Prière" },
  { val: "admin",     label: "Admin" },
];

const INTERACTION_META: Record<string, { label: string; emoji: string }> = {
  appel:     { label: "Appel",     emoji: "📞" },
  visite:    { label: "Visite",    emoji: "🏠" },
  email:     { label: "Email",     emoji: "✉️" },
  whatsapp:  { label: "WhatsApp",  emoji: "💬" },
  sms:       { label: "SMS",       emoji: "📱" },
  rencontre: { label: "Rencontre", emoji: "🤝" },
  autre:     { label: "Autre",     emoji: "•"  },
};

const TASK_PRIO_META: Record<string, { label: string; cls: string }> = {
  basse:   { label: "Basse",   cls: "bg-gray-50 text-gray-600 border-gray-200" },
  normale: { label: "Normale", cls: "bg-sky-50 text-sky-700 border-sky-200" },
  haute:   { label: "Haute",   cls: "bg-red-50 text-red-700 border-red-200" },
};

export default async function CrmMemberPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/connexion");

  const { data: me } = await supabase.from("profiles").select("id, role, groups").eq("id", user.id).single();
  const meGroups = (me?.groups as string[] | null) ?? [];
  const callerIsAdminFull = ["admin", "pasteur"].includes(me?.role ?? "");
  if (!callerIsAdminFull && !meGroups.includes("suivi") && !meGroups.includes("support")) redirect("/espace-membres");

  const callerIsAdmin = me?.role === "admin";
  const canWriteNotes = callerIsAdminFull || meGroups.includes("suivi");

  const admin = createAdminClient();

  const { data: member } = await supabase
    .from("profiles")
    .select("id, first_name, last_name, role, validated, groups, managed_groups, avatar_url, country, crm_tags, created_at, email, pastoral_stage")
    .eq("id", params.id)
    .single();

  if (!member) notFound();

  // Compte de managers par groupe (pour la limite de 2)
  const { data: allManagersData } = await admin.from("profiles").select("id, managed_groups");
  const managerCountByGroup: Record<string, number> = {};
  for (const p of allManagersData ?? []) {
    for (const g of (p.managed_groups as string[] ?? [])) {
      managerCountByGroup[g] = (managerCountByGroup[g] ?? 0) + 1;
    }
  }

  // Fetch notes, attendance, prayer stats, interactions + ban status in parallel
  const [notesRes, attendRes, prayerRes, rsvpRes, interactRes, tasksRes, authData] = await Promise.all([
    supabase.from("member_notes")
      .select("id, content, type, created_at, followup_date, confidentialite, profiles!member_notes_author_id_fkey(first_name, last_name)")
      .eq("member_id", params.id)
      .order("created_at", { ascending: false }),
    supabase.from("event_attendance")
      .select("event_id, checked_in_at, events(title, date)")
      .eq("user_id", params.id)
      .order("checked_in_at", { ascending: false })
      .limit(5),
    supabase.from("prayer_requests")
      .select("id, title, is_answered, created_at")
      .eq("user_id", params.id)
      .order("created_at", { ascending: false })
      .limit(5),
    supabase.from("event_rsvp")
      .select("event_id, status")
      .eq("user_id", params.id),
    supabase.from("member_interactions")
      .select("id, type, direction, subject, content, occurred_at, profiles!member_interactions_author_id_fkey(first_name, last_name)")
      .eq("member_id", params.id)
      .order("occurred_at", { ascending: false })
      .limit(50),
    supabase.from("pastoral_tasks")
      .select("id, title, description, due_date, priority, status, assigned_to, created_at, completed_at, profiles!pastoral_tasks_assigned_to_fkey(first_name, last_name)")
      .eq("member_id", params.id)
      .order("status")
      .order("due_date", { ascending: true, nullsFirst: false })
      .limit(50),
    admin.auth.admin.getUserById(params.id),
  ]);

  // Équipe pastorale (pour assigner une tâche) — admin/pasteur ou fonction suivi
  const { data: teamRaw } = await admin
    .from("profiles")
    .select("id, first_name, last_name, role, groups")
    .order("first_name");
  const pastoralTeam = (teamRaw ?? []).filter(p =>
    ["admin", "pasteur"].includes((p.role as string) ?? "") || ((p.groups as string[] | null) ?? []).includes("suivi")
  );

  const isBanned = authData?.data?.user?.banned_until
    ? new Date(authData.data.user.banned_until) > new Date()
    : false;

  const notes    = notesRes.data ?? [];
  const attends  = attendRes.data ?? [];
  const prayers  = prayerRes.data ?? [];
  const rsvps    = rsvpRes.data ?? [];
  const interactions = interactRes.data ?? [];
  const tasks        = tasksRes.data ?? [];
  const rsvpGoing = rsvps.filter(r => r.status === "going").length;

  // Engagement (Phase 4) : présence récente + fréquence 90j + dernier contact
  const since90 = new Date(Date.now() - 90 * 24 * 3600 * 1000).toISOString();
  const { count: attendance90 } = await supabase
    .from("event_attendance")
    .select("event_id", { count: "exact", head: true })
    .eq("user_id", params.id)
    .gte("checked_in_at", since90);
  const engagement = computeEngagement({
    lastAttendanceAt:   (attends[0] as { checked_in_at?: string } | undefined)?.checked_in_at ?? null,
    attendanceCount90d: attendance90 ?? 0,
    lastInteractionAt:  (interactions[0] as { occurred_at?: string } | undefined)?.occurred_at ?? null,
  });
  const engMeta = ENGAGEMENT_META[engagement.status];

  const fullName = [member.first_name, member.last_name].filter(Boolean).join(" ") || "Membre";
  const initiale = (member.first_name?.[0] ?? "?").toUpperCase();
  const tags     = member.crm_tags ?? [];

  async function handleAddNote(formData: FormData): Promise<void> {
    "use server";
    await addMemberNote(formData);
  }

  async function handleDeleteNote(formData: FormData): Promise<void> {
    "use server";
    await deleteMemberNote(formData.get("note_id") as string, params.id);
  }

  async function handleAddInteraction(formData: FormData): Promise<void> {
    "use server";
    await addMemberInteraction(formData);
  }

  async function handleDeleteInteraction(formData: FormData): Promise<void> {
    "use server";
    await deleteMemberInteraction(formData.get("interaction_id") as string, params.id);
  }

  async function handleAddTask(formData: FormData): Promise<void> {
    "use server";
    await createPastoralTask(formData);
  }

  async function handleTaskStatus(formData: FormData): Promise<void> {
    "use server";
    await updateTaskStatus(formData.get("task_id") as string, formData.get("status") as string, params.id);
  }

  async function handleDeleteTask(formData: FormData): Promise<void> {
    "use server";
    await deletePastoralTask(formData.get("task_id") as string, params.id);
  }

  async function handleValidation(formData: FormData): Promise<void> {
    "use server";
    await updateMemberValidation(params.id, formData.get("action") === "validate");
  }

  async function handleSetRole(_: unknown, formData: FormData) {
    "use server";
    return await updateMemberRole(params.id, formData.get("role") as string);
  }

  async function handleUpdateGroups(_: unknown, formData: FormData) {
    "use server";
    const selected = ALL_GROUPS.filter((g) => formData.get(g) === "on");
    return await updateMemberGroups(params.id, selected);
  }

  async function handleAssignManager(formData: FormData): Promise<void> {
    "use server";
    await assignGroupManager(formData.get("targetId") as string, formData.get("groupName") as string);
  }

  async function handleRevokeManager(formData: FormData): Promise<void> {
    "use server";
    await revokeGroupManager(formData.get("targetId") as string, formData.get("groupName") as string);
  }

  async function handleUpdateStage(formData: FormData): Promise<void> {
    "use server";
    await updatePastoralStage(params.id, formData.get("pastoral_stage") as string);
  }

  const currentStage = STAGE_MAP[(member.pastoral_stage as string | null) ?? "visiteur"] ?? STAGE_MAP["visiteur"];

  const shell = await getMemberShellData(user.id);

  return (
    <>
    <MemberSidebar perms={shell.sidebarPerms} user={shell.sidebarUser} membresValides={shell.rp.membresValides} />
    <MemberRightPanel {...shell.rp} />
    <div className="min-[821px]:ml-[220px] min-[1280px]:mr-[264px] max-w-[1200px] px-4 md:px-6 pt-6 pb-24">
      <Link href="/espace-membres/crm" className="inline-flex items-center gap-1 text-sm text-[#000666] hover:underline mb-4">← CRM Pastoral</Link>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-5">

        {/* ── Colonne gauche ── */}
        <div className="space-y-5">

          {/* Carte identité — portage maquette « Fiche Membre » (profil centré) */}
          <div className="bg-white border border-[#c6c5d4]/40 rounded-xl p-6 shadow-[0_4px_12px_rgba(26,35,126,0.05)] flex flex-col items-center text-center">
            <div className="relative mb-4">
              <div className="w-28 h-28 rounded-full bg-[#000666] flex items-center justify-center overflow-hidden border-4 border-[#f8f9fa]">
                {member.avatar_url
                  ? <Image src={member.avatar_url} alt={fullName} width={112} height={112} className="w-full h-full object-cover" />
                  : <span className="text-4xl font-bold text-white" style={{ fontFamily: '"Playfair Display", serif' }}>{initiale}</span>}
              </div>
              {member.validated && (
                <div className="absolute bottom-0 right-0 bg-[#fed488] text-[#785a1a] rounded-full p-1 border-2 border-white flex">
                  <span className="material-symbols-outlined text-[18px]">verified</span>
                </div>
              )}
            </div>
            <h1 className="text-[28px] leading-tight font-bold text-[#000666]" style={{ fontFamily: '"Playfair Display", serif' }}>{fullName}</h1>
            <p className="text-sm text-[#454652] mt-1">Membre depuis {new Date(member.created_at).getFullYear()}</p>

            <div className="flex flex-wrap justify-center gap-2 mt-3">
              <span className={`text-xs font-bold px-3 py-1 rounded-full border ${ROLE_STYLE[member.role] ?? "text-[#454652] bg-[#edeeef] border-[#c6c5d4]/40"}`}>{member.role}</span>
              <span className={`text-xs font-bold px-3 py-1 rounded-full border ${member.validated ? "text-green-700 bg-green-50 border-green-200" : "text-amber-700 bg-amber-50 border-amber-200"}`}>
                {member.validated ? "Validé" : "En attente"}
              </span>
              {isBanned && <span className="text-xs font-bold px-3 py-1 rounded-full border bg-gray-100 text-gray-500 border-gray-200">🚫 Bloqué</span>}
            </div>

            {/* Contact / stats */}
            <div className="w-full text-left flex flex-col gap-3 border-t border-[#c6c5d4]/30 pt-5 mt-5">
              {member.email && (
                <div>
                  <label className="text-[11px] uppercase tracking-wider text-[#767683] block mb-0.5">Email</label>
                  <div className="text-sm text-[#191c1d] break-all">{member.email}</div>
                </div>
              )}
              {member.country && (
                <div>
                  <label className="text-[11px] uppercase tracking-wider text-[#767683] block mb-0.5">Pays</label>
                  <div className="text-sm text-[#191c1d]">{member.country}</div>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] uppercase tracking-wider text-[#767683] block mb-0.5">Présences</label>
                  <div className="text-sm font-semibold text-[#000666]">{attends.length}</div>
                </div>
                <div>
                  <label className="text-[11px] uppercase tracking-wider text-[#767683] block mb-0.5">RSVP « J&apos;y vais »</label>
                  <div className="text-sm font-semibold text-[#000666]">{rsvpGoing}</div>
                </div>
              </div>
            </div>

            {/* Actions validation — admin/pasteur uniquement */}
            {callerIsAdminFull && (
              <div className="w-full mt-5 pt-4 border-t border-[#c6c5d4]/30 flex gap-2 flex-wrap justify-center">
                {!member.validated ? (
                  <form action={handleValidation}>
                    <input type="hidden" name="action" value="validate" />
                    <button className="px-4 py-2 rounded-lg bg-green-600 text-white text-sm font-bold hover:bg-green-700 transition-colors inline-flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[18px]">check</span> Valider le compte
                    </button>
                  </form>
                ) : (
                  <form action={handleValidation}>
                    <input type="hidden" name="action" value="invalidate" />
                    <button className="px-4 py-2 rounded-lg border border-red-200 text-red-500 text-sm font-bold hover:bg-red-50 transition-colors">
                      Suspendre
                    </button>
                  </form>
                )}
              </div>
            )}
          </div>

          {/* Panneaux admin/pasteur uniquement */}
          {callerIsAdminFull && (
            <>
              {/* Actions administratives (reset mdp, blocage, suppression) */}
              <DangerActionsPanel
                memberId={params.id}
                memberName={fullName}
                isBanned={isBanned}
                isAdmin={callerIsAdmin}
                backHref="/espace-membres/crm"
              />

              {/* Changement de rôle */}
              <div className="bg-white border border-[#c6c5d4]/40 rounded-xl shadow-[0_4px_12px_rgba(26,35,126,0.05)] p-5">
                <h2 style={{ fontFamily: '"Playfair Display", serif' }} className="text-[19px] font-semibold text-[#000666] mb-3">Rôle</h2>
                <RoleSelectorClient
                  action={handleSetRole}
                  currentRole={member.role}
                  callerIsAdmin={callerIsAdmin}
                />
              </div>

              {/* Fonctions */}
              <div className="bg-white border border-[#c6c5d4]/40 rounded-xl shadow-[0_4px_12px_rgba(26,35,126,0.05)] p-5">
                <h2 style={{ fontFamily: '"Playfair Display", serif' }} className="text-[19px] font-semibold text-[#000666] mb-3">Fonctions</h2>
                <GroupsEditorClient
                  action={handleUpdateGroups}
                  currentGroups={(member.groups as string[]) ?? []}
                />
              </div>
            </>
          )}

          {/* Managers de fonctions — admin/pasteur uniquement */}
          {callerIsAdminFull && (member.groups ?? []).length > 0 && (
            <div className="bg-white border border-[#c6c5d4]/40 rounded-xl shadow-[0_4px_12px_rgba(26,35,126,0.05)] p-5">
              <h2 style={{ fontFamily: '"Playfair Display", serif' }} className="text-[19px] font-semibold text-[#000666] mb-1">👑 Manager de fonctions</h2>
              <p className="text-xs text-arc-text3 mb-3">
                Un manager peut ajouter/retirer des membres de son groupe et a un rôle de modération. Max 2 managers par groupe.
              </p>
              <div className="space-y-2">
                {(member.groups as string[]).map(g => {
                  const count  = managerCountByGroup[g] ?? 0;
                  const isMgr  = (member.managed_groups as string[] ?? []).includes(g);
                  const canAdd = !isMgr && count < 2;
                  return (
                    <div key={g} className="flex items-center justify-between p-2.5 rounded-xl bg-arc-bg">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-arc-navy">
                          {GROUP_EMOJIS[g] ?? "📌"} {GROUP_LABELS_LOCAL[g] ?? g}
                        </span>
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full border ${count >= 2 ? "bg-red-50 text-red-600 border-red-200" : "bg-arc-blueBg text-arc-blue border-arc-blue/20"}`}>
                          {count}/2 manager{count !== 1 ? "s" : ""}
                        </span>
                        {isMgr && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                            Manager actuel
                          </span>
                        )}
                      </div>
                      {isMgr ? (
                        <form action={handleRevokeManager}>
                          <input type="hidden" name="targetId"   value={member.id} />
                          <input type="hidden" name="groupName"  value={g} />
                          <button type="submit" className="text-[11px] px-3 py-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition-colors font-semibold">
                            Révoquer
                          </button>
                        </form>
                      ) : (
                        <form action={handleAssignManager}>
                          <input type="hidden" name="targetId"   value={member.id} />
                          <input type="hidden" name="groupName"  value={g} />
                          <button
                            type="submit"
                            disabled={!canAdd}
                            className={`text-[11px] px-3 py-1.5 rounded-lg font-semibold transition-colors ${canAdd ? "bg-arc-navy text-white hover:bg-arc-navy2 cursor-pointer" : "bg-gray-100 text-gray-400 cursor-not-allowed"}`}
                          >
                            {count >= 2 ? "Complet (2/2)" : "Nommer manager"}
                          </button>
                        </form>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Suivi pastoral */}
          <div className="bg-white border border-[#c6c5d4]/40 rounded-xl shadow-[0_4px_12px_rgba(26,35,126,0.05)] p-5">
            <h2 style={{ fontFamily: '"Playfair Display", serif' }} className="text-[19px] font-semibold text-[#000666] mb-1">🕊️ Suivi pastoral</h2>
            <p className="text-[11px] text-arc-text3 mb-3">Étape de progression dans la communauté</p>
            <div className={`text-xs font-bold px-2.5 py-1.5 rounded-lg border inline-flex items-center gap-2 mb-4 ${currentStage.color}`}>
              <span>{currentStage.label}</span>
            </div>
            <form action={handleUpdateStage} className="flex gap-2">
              <select name="pastoral_stage" defaultValue={member.pastoral_stage ?? "visiteur"}
                className="flex-1 px-3 py-2 rounded-lg border border-arc-border text-sm outline-none focus:border-arc-navy bg-white">
                {STAGES.map(s => (
                  <option key={s.key} value={s.key}>{s.label}</option>
                ))}
              </select>
              <button type="submit"
                className="px-4 py-2 rounded-xl bg-[#000666] text-white text-sm font-bold hover:bg-[#1a237e] transition-colors flex-shrink-0">
                OK
              </button>
            </form>
          </div>

          {/* Tags CRM */}
          <div className="bg-white border border-[#c6c5d4]/40 rounded-xl shadow-[0_4px_12px_rgba(26,35,126,0.05)] p-5">
            <h2 style={{ fontFamily: '"Playfair Display", serif' }} className="text-[19px] font-semibold text-[#000666] mb-3">🏷️ Tags pastoraux</h2>
            <CrmTagsEditor memberId={member.id} initialTags={tags} />
          </div>

          {/* Notes pastorales */}
          <div className="bg-white border border-[#c6c5d4]/40 rounded-xl shadow-[0_4px_12px_rgba(26,35,126,0.05)] p-5">
            <h2 style={{ fontFamily: '"Playfair Display", serif' }} className="text-[19px] font-semibold text-[#000666] mb-4">📝 Notes ({notes.length})</h2>

            {/* Ajouter une note — suivi / admin / pasteur */}
            {canWriteNotes && (
              <form action={handleAddNote} className="mb-5 space-y-2">
                <input type="hidden" name="member_id" value={member.id} />
                <div className="flex gap-2 flex-wrap">
                  <select name="type" className="px-2.5 py-2 rounded-lg border border-arc-border text-xs outline-none focus:border-arc-navy bg-white flex-shrink-0">
                    {NOTE_TYPES.map(t => <option key={t.val} value={t.val}>{t.label}</option>)}
                  </select>
                  <select name="confidentialite" className="px-2.5 py-2 rounded-lg border border-arc-border text-xs outline-none focus:border-arc-navy bg-white flex-shrink-0">
                    <option value="confidentielle_pasteur">🔒 Confidentiel pasteur</option>
                    <option value="partagee_suivi">👥 Visible équipe suivi</option>
                  </select>
                  <div className="flex items-center gap-1.5 flex-1 min-w-[180px]">
                    <label className="text-[10px] font-bold text-arc-text3 whitespace-nowrap">Relance le :</label>
                    <input type="date" name="followup_date"
                      className="flex-1 px-2.5 py-2 rounded-lg border border-arc-border text-xs outline-none focus:border-arc-navy transition-colors bg-white" />
                  </div>
                </div>
                <textarea
                  name="content" required maxLength={2000} rows={3}
                  placeholder="Ajouter une note pastorale…"
                  className="w-full px-3 py-2.5 rounded-lg border border-arc-border text-sm outline-none focus:border-arc-navy resize-none transition-colors"
                />
                <button type="submit" className="px-4 py-2 rounded-xl bg-[#000666] text-white text-sm font-bold hover:bg-[#1a237e] transition-colors">
                  Ajouter la note
                </button>
              </form>
            )}

            {/* Liste notes */}
            <div className="space-y-3">
              {notes.length === 0 && (
                <p className="text-sm text-arc-text3">Aucune note pour ce membre.</p>
              )}
              {notes.map(n => {
                type NoteWithAuthor = typeof n & {
                  profiles?: { first_name: string | null; last_name: string | null } | null;
                  followup_date?: string | null;
                  confidentialite?: string | null;
                };
                const note = n as NoteWithAuthor;
                const authorName = [note.profiles?.first_name, note.profiles?.last_name].filter(Boolean).join(" ") || "Admin";
                const hasRelance = !!note.followup_date;
                const relancePast = hasRelance && new Date(note.followup_date! + "T00:00:00") < new Date();
                const isShared = note.confidentialite === "partagee_suivi";
                const authorInitials = authorName.split(/\s+/).map(w => w[0]).filter(Boolean).slice(0, 2).join("").toUpperCase() || "•";
                return (
                  <div key={n.id} className="flex gap-3 group relative">
                    {/* Colonne timeline : avatar + trait */}
                    <div className="flex flex-col items-center flex-shrink-0">
                      <div className="w-8 h-8 rounded-full bg-[#e0e0ff] text-[#000666] flex items-center justify-center text-[11px] font-bold">{authorInitials}</div>
                      <div className="w-px flex-1 bg-[#c6c5d4]/40 my-1" />
                    </div>
                    {/* Contenu */}
                    <div className="flex-1 pb-4 min-w-0">
                      <div className="flex justify-between items-baseline mb-1 gap-2">
                        <span className="text-sm font-semibold text-[#191c1d]">{authorName}</span>
                        <span className="text-[11px] text-[#767683] flex-shrink-0">{new Date(n.created_at).toLocaleDateString("fr-CH")}</span>
                      </div>
                      <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
                        <span className="text-[10px] font-bold text-[#000666] uppercase tracking-wider">{n.type}</span>
                        {isShared ? (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-teal-50 text-teal-700 border border-teal-200">👥 Suivi</span>
                        ) : (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200">🔒 Pasteur</span>
                        )}
                        {hasRelance && (
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${relancePast ? "bg-red-100 text-red-600" : "bg-amber-100 text-amber-700"}`}>
                            🔔 {relancePast ? "En retard" : "Relance"} : {new Date(note.followup_date! + "T00:00:00").toLocaleDateString("fr-CH")}
                          </span>
                        )}
                      </div>
                      <div className={`p-3 rounded-r-lg rounded-bl-lg ${hasRelance ? "bg-amber-50 border border-amber-200" : "bg-[#f3f4f5]"}`}>
                        <p className="text-sm text-[#191c1d] leading-relaxed whitespace-pre-wrap">{n.content}</p>
                      </div>
                    </div>
                    {canWriteNotes && (
                      <form action={handleDeleteNote} className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity">
                        <input type="hidden" name="note_id" value={n.id} />
                        <button type="submit" className="w-6 h-6 rounded-full bg-white border border-[#c6c5d4] text-[#767683] hover:text-red-500 text-xs flex items-center justify-center shadow-sm">
                          ✕
                        </button>
                      </form>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Journal d'interactions pastorales */}
          <div className="bg-white border border-[#c6c5d4]/40 rounded-xl shadow-[0_4px_12px_rgba(26,35,126,0.05)] p-5">
            <h2 style={{ fontFamily: '"Playfair Display", serif' }} className="text-[19px] font-semibold text-[#000666] mb-1">📇 Journal d'interactions ({interactions.length})</h2>
            <p className="text-[11px] text-arc-text3 mb-4">Appels, visites, messages — chaque contact avec le membre.</p>

            {canWriteNotes && (
              <form action={handleAddInteraction} className="mb-5 space-y-2">
                <input type="hidden" name="member_id" value={member.id} />
                <div className="flex gap-2 flex-wrap">
                  <select name="type" className="px-2.5 py-2 rounded-lg border border-arc-border text-xs outline-none focus:border-arc-navy bg-white flex-shrink-0">
                    {Object.entries(INTERACTION_META).map(([val, m]) => (
                      <option key={val} value={val}>{m.emoji} {m.label}</option>
                    ))}
                  </select>
                  <select name="direction" className="px-2.5 py-2 rounded-lg border border-arc-border text-xs outline-none focus:border-arc-navy bg-white flex-shrink-0">
                    <option value="sortant">↗ Sortant</option>
                    <option value="entrant">↘ Entrant</option>
                  </select>
                  <input type="datetime-local" name="occurred_at"
                    className="flex-1 min-w-[170px] px-2.5 py-2 rounded-lg border border-arc-border text-xs outline-none focus:border-arc-navy bg-white" />
                </div>
                <input type="text" name="subject" maxLength={200} placeholder="Objet (ex : Appel de suivi post-culte)"
                  className="w-full px-3 py-2 rounded-lg border border-arc-border text-sm outline-none focus:border-arc-navy transition-colors" />
                <textarea name="content" maxLength={2000} rows={2} placeholder="Détail de l'échange (optionnel)…"
                  className="w-full px-3 py-2.5 rounded-lg border border-arc-border text-sm outline-none focus:border-arc-navy resize-none transition-colors" />
                <button type="submit" className="px-4 py-2 rounded-xl bg-[#000666] text-white text-sm font-bold hover:bg-[#1a237e] transition-colors">
                  Enregistrer l'interaction
                </button>
              </form>
            )}

            <div className="space-y-3">
              {interactions.length === 0 && (
                <p className="text-sm text-arc-text3">Aucune interaction enregistrée.</p>
              )}
              {interactions.map(it => {
                type InteractionRow = typeof it & {
                  subject?: string | null; content?: string | null; direction?: string | null;
                  profiles?: { first_name: string | null; last_name: string | null } | null;
                };
                const row = it as InteractionRow;
                const meta = INTERACTION_META[it.type as string] ?? INTERACTION_META.autre;
                const authorName = [row.profiles?.first_name, row.profiles?.last_name].filter(Boolean).join(" ") || "Équipe";
                const isEntrant = row.direction === "entrant";
                return (
                  <div key={it.id} className="rounded-xl p-3 relative group bg-arc-bg">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="text-xs font-bold text-arc-navy">{meta.emoji} {meta.label}</span>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full border ${isEntrant ? "bg-sky-50 text-sky-700 border-sky-200" : "bg-indigo-50 text-indigo-700 border-indigo-200"}`}>
                        {isEntrant ? "↘ Entrant" : "↗ Sortant"}
                      </span>
                      <span className="text-[10px] text-arc-text3">· {authorName} · {new Date(row.occurred_at as string).toLocaleString("fr-CH", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
                    </div>
                    {row.subject && <p className="text-sm font-semibold text-arc-navy leading-snug">{row.subject}</p>}
                    {row.content && <p className="text-sm text-arc-text2 leading-relaxed mt-0.5">{row.content}</p>}
                    {canWriteNotes && (
                      <form action={handleDeleteInteraction} className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <input type="hidden" name="interaction_id" value={it.id} />
                        <button type="submit" className="w-6 h-6 rounded-full bg-white border border-arc-border text-arc-text3 hover:text-red-500 text-xs flex items-center justify-center shadow-sm">
                          ✕
                        </button>
                      </form>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Tâches & rappels de suivi */}
          <div className="bg-white border border-[#c6c5d4]/40 rounded-xl shadow-[0_4px_12px_rgba(26,35,126,0.05)] p-5">
            <div className="flex items-center justify-between mb-1">
              <h2 style={{ fontFamily: '"Playfair Display", serif' }} className="text-[19px] font-semibold text-[#000666]">🗓️ Tâches de suivi ({tasks.filter(t => t.status === "todo").length})</h2>
              <Link href="/espace-membres/crm/taches" className="text-[11px] font-semibold text-arc-blue hover:underline">Mes tâches →</Link>
            </div>
            <p className="text-[11px] text-arc-text3 mb-4">Rappels et actions de suivi pour ce membre.</p>

            {canWriteNotes && (
              <form action={handleAddTask} className="mb-5 space-y-2">
                <input type="hidden" name="member_id" value={member.id} />
                <input type="text" name="title" required maxLength={200} placeholder="Ex : Rappeler pour l'intégration au groupe"
                  className="w-full px-3 py-2 rounded-lg border border-arc-border text-sm outline-none focus:border-arc-navy transition-colors" />
                <div className="flex gap-2 flex-wrap">
                  <select name="assigned_to" defaultValue={me?.id} className="px-2.5 py-2 rounded-lg border border-arc-border text-xs outline-none focus:border-arc-navy bg-white flex-shrink-0">
                    {pastoralTeam.map(p => (
                      <option key={p.id} value={p.id}>
                        {[p.first_name, p.last_name].filter(Boolean).join(" ") || "Équipe"}{p.id === me?.id ? " (moi)" : ""}
                      </option>
                    ))}
                  </select>
                  <select name="priority" defaultValue="normale" className="px-2.5 py-2 rounded-lg border border-arc-border text-xs outline-none focus:border-arc-navy bg-white flex-shrink-0">
                    <option value="basse">Priorité basse</option>
                    <option value="normale">Priorité normale</option>
                    <option value="haute">Priorité haute</option>
                  </select>
                  <input type="date" name="due_date"
                    className="flex-1 min-w-[140px] px-2.5 py-2 rounded-lg border border-arc-border text-xs outline-none focus:border-arc-navy bg-white" />
                </div>
                <button type="submit" className="px-4 py-2 rounded-xl bg-[#000666] text-white text-sm font-bold hover:bg-[#1a237e] transition-colors">
                  Créer la tâche
                </button>
              </form>
            )}

            <div className="space-y-2">
              {tasks.length === 0 && (
                <p className="text-sm text-arc-text3">Aucune tâche de suivi.</p>
              )}
              {tasks.map(t => {
                type TaskRow = typeof t & {
                  description?: string | null; due_date?: string | null; priority?: string | null;
                  status?: string | null; assigned_to?: string | null;
                  profiles?: { first_name: string | null; last_name: string | null } | null;
                };
                const task = t as TaskRow;
                const done = task.status === "done";
                const cancelled = task.status === "cancelled";
                const prio = TASK_PRIO_META[(task.priority as string) ?? "normale"] ?? TASK_PRIO_META.normale;
                const assigneeName = [task.profiles?.first_name, task.profiles?.last_name].filter(Boolean).join(" ") || "Équipe";
                const overdue = !done && !cancelled && task.due_date && new Date(task.due_date + "T00:00:00") < new Date();
                return (
                  <div key={t.id} className={`rounded-xl p-3 relative group border ${done ? "bg-green-50/60 border-green-100" : overdue ? "bg-red-50 border-red-200" : "bg-arc-bg border-transparent"}`}>
                    <div className="flex items-start gap-2">
                      {canWriteNotes && !done && !cancelled ? (
                        <form action={handleTaskStatus} className="flex-shrink-0 mt-0.5">
                          <input type="hidden" name="task_id" value={t.id} />
                          <input type="hidden" name="status" value="done" />
                          <button type="submit" title="Marquer comme fait" className="w-5 h-5 rounded-full border-2 border-arc-border hover:border-green-500 hover:bg-green-100 transition-colors" />
                        </form>
                      ) : (
                        <span className="flex-shrink-0 mt-0.5 w-5 h-5 rounded-full flex items-center justify-center text-xs bg-green-500 text-white">{done ? "✓" : "✕"}</span>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-semibold leading-snug ${done || cancelled ? "text-arc-text3 line-through" : "text-arc-navy"}`}>{task.title}</p>
                        {task.description && <p className="text-xs text-arc-text2 mt-0.5">{task.description}</p>}
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full border ${prio.cls}`}>{prio.label}</span>
                          {task.due_date && (
                            <span className={`text-[10px] font-semibold ${overdue ? "text-red-600" : "text-arc-text3"}`}>
                              🔔 {overdue ? "En retard : " : ""}{new Date(task.due_date + "T00:00:00").toLocaleDateString("fr-CH")}
                            </span>
                          )}
                          <span className="text-[10px] text-arc-text3">· {assigneeName}</span>
                        </div>
                      </div>
                      {canWriteNotes && (
                        <form action={handleDeleteTask} className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                          <input type="hidden" name="task_id" value={t.id} />
                          <button type="submit" className="w-6 h-6 rounded-full bg-white border border-arc-border text-arc-text3 hover:text-red-500 text-xs flex items-center justify-center shadow-sm">✕</button>
                        </form>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── Colonne droite ── */}
        <div className="space-y-5">

          {/* Engagement (Phase 4) */}
          <div className="bg-white border border-[#c6c5d4]/40 rounded-xl shadow-[0_4px_12px_rgba(26,35,126,0.05)] p-5">
            <h2 style={{ fontFamily: '"Playfair Display", serif' }} className="text-[19px] font-semibold text-[#000666] mb-3">📊 Engagement</h2>
            <div className="flex items-center gap-3">
              <div className="relative flex-shrink-0 w-14 h-14 rounded-full flex items-center justify-center font-bold text-arc-navy border-4 border-arc-bg" style={{ background: `conic-gradient(currentColor ${engagement.score * 3.6}deg, #eef1f6 0deg)` }}>
                <span className="absolute inset-1 bg-white rounded-full flex items-center justify-center text-sm">{engagement.score}</span>
              </div>
              <div className="min-w-0">
                <span className={`text-xs font-bold px-2 py-1 rounded-lg border inline-flex items-center gap-1 ${engMeta.cls}`}>
                  {engMeta.emoji} {engMeta.label}
                </span>
                <p className="text-[11px] text-arc-text3 mt-1">{engagement.reason}</p>
              </div>
            </div>
            <p className="text-[10px] text-arc-text3 mt-3">
              Sur 90 j : {attendance90 ?? 0} présence{(attendance90 ?? 0) !== 1 ? "s" : ""}.{" "}
              <Link href="/espace-membres/crm/desengagement" className="font-semibold text-arc-blue hover:underline">Voir les alertes →</Link>
            </p>
          </div>

          {/* Vue 360° — fil d'activité unifié */}
          <MemberTimeline
            notes={notes}
            interactions={interactions}
            tasks={tasks}
            attends={attends}
            prayers={prayers}
          />

          {/* Historique présences */}
          <div className="bg-white border border-[#c6c5d4]/40 rounded-xl shadow-[0_4px_12px_rgba(26,35,126,0.05)] p-5">
            <h2 style={{ fontFamily: '"Playfair Display", serif' }} className="text-[19px] font-semibold text-[#000666] mb-3">✓ Présences récentes</h2>
            {attends.length === 0 ? (
              <p className="text-sm text-arc-text3">Aucune présence enregistrée.</p>
            ) : (
              <div className="space-y-2">
                {attends.map(a => {
                  type AttendWithEvent = typeof a & { events?: { title: string; date: string } | null };
                  const attend = a as AttendWithEvent;
                  return (
                    <div key={a.event_id} className="flex items-start gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-green-400 mt-1.5 flex-shrink-0" />
                      <div>
                        <div className="text-sm text-arc-navy font-medium">{attend.events?.title ?? "Événement"}</div>
                        <div className="text-[11px] text-arc-text3">{attend.events?.date ? new Date(attend.events.date + "T00:00:00").toLocaleDateString("fr-CH") : ""}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Demandes de prière */}
          <div className="bg-white border border-[#c6c5d4]/40 rounded-xl shadow-[0_4px_12px_rgba(26,35,126,0.05)] p-5">
            <h2 style={{ fontFamily: '"Playfair Display", serif' }} className="text-[19px] font-semibold text-[#000666] mb-3">🙏 Demandes de prière</h2>
            {prayers.length === 0 ? (
              <p className="text-sm text-arc-text3">Aucune demande.</p>
            ) : (
              <div className="space-y-2">
                {prayers.map(p => (
                  <div key={p.id} className="flex items-start gap-2">
                    <div className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${p.is_answered ? "bg-green-400" : "bg-arc-blue"}`} />
                    <div>
                      <div className="text-sm text-arc-navy font-medium">{p.title}</div>
                      <div className="text-[11px] text-arc-text3">
                        {p.is_answered ? "Exaucée" : "En cours"} · {new Date(p.created_at).toLocaleDateString("fr-CH")}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Groupes */}
          {member.groups && member.groups.length > 0 && (
            <div className="bg-white border border-[#c6c5d4]/40 rounded-xl shadow-[0_4px_12px_rgba(26,35,126,0.05)] p-5">
              <h2 style={{ fontFamily: '"Playfair Display", serif' }} className="text-[19px] font-semibold text-[#000666] mb-3">👥 Groupes</h2>
              <div className="flex flex-wrap gap-1.5">
                {member.groups.map((g: string) => (
                  <GroupBadge key={g} name={g} size="sm" />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
    </>
  );
}
