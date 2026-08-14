"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { notifyUser } from "@/lib/notify";
import { revalidatePath } from "next/cache";
import {
  FORMATION_STATUSES, WEEKDAYS, computeSessionDates,
  type Formation, type FormationStatus, type FormationAttendance, type EnrollmentStatus,
} from "@/lib/formations-constants";

const PATH = "/espace-membres/crm/formations";

/** Staff CRM (écriture) = admin | pasteur | fonction "suivi" (miroir de la RLS). */
async function assertCrmWriter(supabase: ReturnType<typeof createClient>) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase.from("profiles").select("role, groups").eq("id", user.id).single();
  const allowed =
    ["admin", "pasteur"].includes(data?.role ?? "") ||
    ((data?.groups as string[] | null) ?? []).includes("suivi");
  return allowed ? user : null;
}

/** Liste des formations + inscriptions (member_ids par formation). */
export async function listFormations() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Non authentifié" as const };

  const [{ data: formations, error }, { data: enrollments }, { data: attendance }] = await Promise.all([
    supabase.from("formations").select("*").order("start_date", { ascending: false, nullsFirst: false }).order("created_at", { ascending: false }),
    supabase.from("formation_enrollments").select("formation_id, member_id, days_completed, status, start_from_date"),
    supabase.from("formation_attendance").select("formation_id, member_id, status"),
  ]);
  if (error) return { error: error.message };

  const byFormation: Record<string, string[]> = {};
  // progression : formation_id → { member_id → jours effectués }
  const completedByFormation: Record<string, Record<string, number>> = {};
  // statut d'inscription : formation_id → { member_id → 'pending' | 'active' }
  const enrollStatus: Record<string, Record<string, EnrollmentStatus>> = {};
  for (const e of (enrollments ?? []) as { formation_id: string; member_id: string; days_completed: number; status: EnrollmentStatus }[]) {
    (byFormation[e.formation_id] ??= []).push(e.member_id);
    (completedByFormation[e.formation_id] ??= {})[e.member_id] = e.days_completed ?? 0;
    (enrollStatus[e.formation_id] ??= {})[e.member_id] = e.status ?? "active";
  }
  // attendance : formation_id → { member_id → status }
  const attByFormation: Record<string, Record<string, FormationStatus>> = {};
  for (const a of (attendance ?? []) as FormationAttendance[]) {
    (attByFormation[a.formation_id] ??= {})[a.member_id] = a.status;
  }
  return { data: { formations: (formations ?? []) as Formation[], enrollments: byFormation, completed: completedByFormation, status: enrollStatus, attendance: attByFormation } };
}

export async function createFormation(input: {
  title: string;
  start_date?: string | null;
  end_date?: string | null;
  days?: string[] | null;
  time_start?: string | null;
  time_end?: string | null;
  formateur_member_id?: string | null;
  formateur_externe?: string | null;
  description?: string | null;
  recurring?: boolean;
  total_days?: number | null;
  location?: string | null;
}) {
  const supabase = createClient();
  const user = await assertCrmWriter(supabase);
  if (!user) return { error: "Non autorisé" as const };

  const title = input.title.trim();
  if (!title) return { error: "Le nom de la formation est requis" as const };

  const totalDays = input.total_days != null && input.total_days > 0 ? Math.min(Math.round(input.total_days), 365) : null;

  const { data, error } = await supabase
    .from("formations")
    .insert({
      title: title.slice(0, 200),
      description: input.description?.slice(0, 2000) || null,
      start_date: input.start_date || null,
      end_date: input.end_date || null,
      days: (input.days ?? []).filter(d => (WEEKDAYS as readonly string[]).includes(d)),
      time_start: input.time_start || null,
      time_end: input.time_end || null,
      formateur_member_id: input.formateur_member_id || null,
      formateur_externe: input.formateur_externe?.trim().slice(0, 200) || null,
      recurring: !!input.recurring,
      total_days: totalDays,
      location: input.location?.trim().slice(0, 200) || null,
      created_by: user.id,
    })
    .select("*")
    .single();
  if (error) return { error: error.message };
  revalidatePath(PATH);
  return { data: data as Formation };
}

/** Mise à jour (dates modifiables si la formation se prolonge, formateur, nom). */
export async function updateFormation(id: string, patch: {
  title?: string;
  start_date?: string | null;
  end_date?: string | null;
  days?: string[] | null;
  time_start?: string | null;
  time_end?: string | null;
  formateur_member_id?: string | null;
  formateur_externe?: string | null;
  description?: string | null;
  recurring?: boolean;
  total_days?: number | null;
  location?: string | null;
}) {
  const supabase = createClient();
  const user = await assertCrmWriter(supabase);
  if (!user) return { error: "Non autorisé" as const };

  const clean: Record<string, unknown> = {};
  if (patch.title !== undefined) clean.title = patch.title.trim().slice(0, 200);
  if (patch.start_date !== undefined) clean.start_date = patch.start_date || null;
  if (patch.end_date !== undefined) clean.end_date = patch.end_date || null;
  if (patch.days !== undefined) clean.days = (patch.days ?? []).filter(d => (WEEKDAYS as readonly string[]).includes(d));
  if (patch.time_start !== undefined) clean.time_start = patch.time_start || null;
  if (patch.time_end !== undefined) clean.time_end = patch.time_end || null;
  if (patch.formateur_member_id !== undefined) clean.formateur_member_id = patch.formateur_member_id || null;
  if (patch.formateur_externe !== undefined) clean.formateur_externe = patch.formateur_externe?.trim().slice(0, 200) || null;
  if (patch.description !== undefined) clean.description = patch.description?.slice(0, 2000) || null;
  if (patch.recurring !== undefined) clean.recurring = !!patch.recurring;
  if (patch.total_days !== undefined) clean.total_days = patch.total_days != null && patch.total_days > 0 ? Math.min(Math.round(patch.total_days), 365) : null;
  if (patch.location !== undefined) clean.location = patch.location?.trim().slice(0, 200) || null;
  if (Object.keys(clean).length === 0) return { success: true as const };

  const { error } = await supabase.from("formations").update(clean).eq("id", id);
  if (error) return { error: error.message };
  revalidatePath(PATH);
  return { success: true as const };
}

/**
 * Affecte des membres à une formation → ils passent à l'étape « formation »
 * (apparaissent dans la colonne Formation du pipeline) + sont notifiés.
 */
export async function enrollMembers(formationId: string, memberIds: string[]) {
  const supabase = createClient();
  const user = await assertCrmWriter(supabase);
  if (!user) return { error: "Non autorisé" as const };
  if (memberIds.length === 0) return { success: true as const };

  const admin = createAdminClient();

  // Inscriptions directes par le staff = déjà validées (« active »).
  const { error: insErr } = await admin
    .from("formation_enrollments")
    .upsert(
      memberIds.map((mid) => ({ formation_id: formationId, member_id: mid, status: "active", validated_by: user.id, validated_at: new Date().toISOString() })),
      { onConflict: "formation_id,member_id", ignoreDuplicates: true },
    );
  if (insErr) return { error: insErr.message };

  // Passage à l'étape pastorale « formation »
  await admin.from("profiles").update({ pastoral_stage: "formation" }).in("id", memberIds);

  // Titre pour la notification
  const { data: f } = await admin.from("formations").select("title").eq("id", formationId).maybeSingle();
  const title = (f?.title as string) ?? "une formation";
  await Promise.all(memberIds.map((mid) =>
    notifyUser({
      userId: mid, type: "system",
      title: "🎓 Inscription à une formation",
      body: `Vous avez été inscrit(e) à la formation « ${title} ».`,
      link: "/espace-membres/profil",
    }).catch(() => {}),
  ));

  revalidatePath(PATH);
  revalidatePath("/espace-membres/crm");
  return { success: true as const };
}

/** Retire un membre d'une formation (n'inverse pas l'étape pastorale). */
export async function unenrollMember(formationId: string, memberId: string) {
  const supabase = createClient();
  const user = await assertCrmWriter(supabase);
  if (!user) return { error: "Non autorisé" as const };
  const { error } = await supabase
    .from("formation_enrollments")
    .delete()
    .eq("formation_id", formationId)
    .eq("member_id", memberId);
  if (error) return { error: error.message };
  revalidatePath(PATH);
  return { success: true as const };
}

export async function deleteFormation(id: string) {
  const supabase = createClient();
  const user = await assertCrmWriter(supabase);
  if (!user) return { error: "Non autorisé" as const };
  const { error } = await supabase.from("formations").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath(PATH);
  return { success: true as const };
}

/** Formations où le membre courant est inscrit + statut annoncé + progression (jours faits). */
export async function listMyFormations() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Non authentifié" as const };

  const { data: enr } = await supabase
    .from("formation_enrollments").select("formation_id, days_completed, status, start_from_date").eq("member_id", user.id);
  const ids = (enr ?? []).map(e => e.formation_id as string);
  if (ids.length === 0) {
    return { data: { formations: [] as Formation[], myStatus: {} as Record<string, FormationStatus>, myCompleted: {} as Record<string, number>, myEnrollStatus: {} as Record<string, EnrollmentStatus>, myStartFrom: {} as Record<string, string | null> } };
  }

  const myCompleted: Record<string, number> = {};
  const myEnrollStatus: Record<string, EnrollmentStatus> = {};
  const myStartFrom: Record<string, string | null> = {};
  for (const e of (enr ?? []) as { formation_id: string; days_completed: number; status: EnrollmentStatus; start_from_date: string | null }[]) {
    myCompleted[e.formation_id] = e.days_completed ?? 0;
    myEnrollStatus[e.formation_id] = e.status ?? "active";
    myStartFrom[e.formation_id] = e.start_from_date ?? null;
  }

  const [{ data: formations }, { data: att }] = await Promise.all([
    supabase.from("formations").select("*").in("id", ids),
    supabase.from("formation_attendance").select("formation_id, status").eq("member_id", user.id),
  ]);
  const myStatus: Record<string, FormationStatus> = {};
  for (const a of (att ?? []) as { formation_id: string; status: FormationStatus }[]) myStatus[a.formation_id] = a.status;
  return { data: { formations: (formations ?? []) as Formation[], myStatus, myCompleted, myEnrollStatus, myStartFrom } };
}

/** Événement synthétique de séance de formation (pour « Prochains événements »). */
export interface FormationSessionEvent {
  id: string;
  title: string;
  date: string;
  time_start: string | null;
  location: string | null;
  isFormation: true;
}

/**
 * Séances de formation À VENIR pour l'utilisateur courant — qu'il soit inscrit
 * OU formateur interne. Sert à alimenter « Prochains événements » (élève + formateur).
 */
export async function getMyUpcomingFormationSessions(userId: string, limit = 6): Promise<FormationSessionEvent[]> {
  const supabase = createClient();
  const today = new Date().toISOString().slice(0, 10);

  // Inscriptions ACTIVES uniquement (les demandes « pending » n'ont pas de séance)
  const { data: enr } = await supabase
    .from("formation_enrollments").select("formation_id, start_from_date").eq("member_id", userId).eq("status", "active");
  const startFrom = new Map<string, string | null>();
  for (const e of (enr ?? []) as { formation_id: string; start_from_date: string | null }[]) startFrom.set(e.formation_id, e.start_from_date);
  const enrolledIds = new Set(startFrom.keys());

  // Formations où l'utilisateur est inscrit OU formateur interne
  const { data: taught } = await supabase.from("formations").select("*").eq("formateur_member_id", userId);
  const enrolledFormations = enrolledIds.size
    ? (await supabase.from("formations").select("*").in("id", Array.from(enrolledIds))).data ?? []
    : [];

  const byId = new Map<string, Formation>();
  for (const f of [...(taught ?? []), ...enrolledFormations] as Formation[]) byId.set(f.id, f);

  const out: FormationSessionEvent[] = [];
  for (const f of Array.from(byId.values())) {
    // Un élève rattaché à la « prochaine session » ne voit ses séances qu'à partir de start_from_date.
    const sf = startFrom.get(f.id);
    const from = sf && sf > today ? sf : today;
    const next = computeSessionDates(f, { from });
    for (const date of next.slice(0, limit)) {
      out.push({
        id: `formation-${f.id}-${date}`,
        title: `🎓 ${f.title}`,
        date,
        time_start: f.time_start,
        location: f.location,
        isFormation: true,
      });
    }
  }
  return out.sort((a, b) => a.date.localeCompare(b.date)).slice(0, limit);
}

/**
 * Valide/ajuste le nombre de jours effectués par un élève (progression X/Y).
 * Autorisé au staff CRM OU au formateur interne de la formation. Passe par le
 * service role (l'élève n'écrit jamais sa propre progression).
 */
export async function setFormationDaysCompleted(formationId: string, memberId: string, value: number) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Non authentifié" as const };

  const admin = createAdminClient();
  const { data: f } = await admin
    .from("formations").select("title, total_days, formateur_member_id").eq("id", formationId).maybeSingle();
  if (!f) return { error: "Formation introuvable" as const };

  // Autorisation : staff CRM OU formateur interne
  const { data: me } = await supabase.from("profiles").select("role, groups").eq("id", user.id).single();
  const isStaff = ["admin", "pasteur"].includes(me?.role ?? "") || ((me?.groups as string[] | null) ?? []).includes("suivi");
  if (!isStaff && f.formateur_member_id !== user.id) return { error: "Non autorisé" as const };

  const max = (f.total_days as number | null) ?? 365;
  const clamped = Math.max(0, Math.min(Math.round(value), max));

  const { error } = await admin
    .from("formation_enrollments")
    .update({ days_completed: clamped })
    .eq("formation_id", formationId)
    .eq("member_id", memberId);
  if (error) return { error: error.message };

  // Notifie l'élève de sa progression
  const total = (f.total_days as number | null) ?? null;
  await notifyUser({
    userId: memberId, type: "system",
    title: "🎓 Progression de formation",
    body: `Formation « ${(f.title as string) ?? ""} » : ${clamped}${total ? ` / ${total}` : ""} jour(s) effectué(s).`,
    link: "/espace-membres/profil",
  }).catch(() => {});

  revalidatePath(PATH);
  revalidatePath("/espace-membres/profil");
  revalidatePath("/espace-membres");
  return { success: true as const, value: clamped };
}

/**
 * Le membre annonce sa présence à une formation (sera_present/present/sera_absent/absent).
 * Notifie les pasteurs + le responsable (formateur interne) de la formation.
 */
export async function announceFormationAttendance(formationId: string, status: FormationStatus) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Non authentifié" as const };
  if (!FORMATION_STATUSES.includes(status)) return { error: "Statut invalide" as const };

  // Le membre doit être inscrit
  const { data: enrolled } = await supabase
    .from("formation_enrollments").select("id").eq("formation_id", formationId).eq("member_id", user.id).maybeSingle();
  if (!enrolled) return { error: "Vous n'êtes pas inscrit à cette formation" as const };

  const { error } = await supabase
    .from("formation_attendance")
    .upsert(
      { formation_id: formationId, member_id: user.id, status, updated_at: new Date().toISOString() },
      { onConflict: "formation_id,member_id" },
    );
  if (error) return { error: error.message };

  // Notifie pasteurs + responsable (formateur interne)
  const admin = createAdminClient();
  const [{ data: f }, { data: me }, { data: pasteurs }] = await Promise.all([
    admin.from("formations").select("title, formateur_member_id").eq("id", formationId).maybeSingle(),
    admin.from("profiles").select("first_name, last_name").eq("id", user.id).maybeSingle(),
    admin.from("profiles").select("id").eq("role", "pasteur"),
  ]);
  const memberName = me ? [me.first_name, me.last_name].filter(Boolean).join(" ") || "Un membre" : "Un membre";
  const LABEL: Record<FormationStatus, string> = {
    sera_present: "sera présent", present: "présent", sera_absent: "sera absent", absent: "absent",
  };
  const recipients = new Set<string>();
  for (const p of pasteurs ?? []) recipients.add(p.id as string);
  if (f?.formateur_member_id) recipients.add(f.formateur_member_id as string);
  recipients.delete(user.id);
  await Promise.all(Array.from(recipients).map(uid => notifyUser({
    userId: uid, type: "system",
    title: "🎓 Présence formation",
    body: `${memberName} : ${LABEL[status]} — formation « ${(f?.title as string) ?? ""} ».`,
    link: "/espace-membres/presences",
  }).catch(() => {})));

  revalidatePath("/espace-membres/presences");
  revalidatePath(PATH);
  return { success: true as const };
}

/**
 * Catalogue des formations visible par TOUT membre (panneau « Activités »),
 * avec le statut d'inscription du membre courant (pour proposer « S'inscrire »
 * ou afficher « En attente » / « Inscrit »).
 */
export async function listAvailableFormations() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Non authentifié" as const };

  const [{ data: formations }, { data: myEnr }] = await Promise.all([
    supabase.from("formations").select("*").order("start_date", { ascending: false, nullsFirst: false }).order("created_at", { ascending: false }),
    supabase.from("formation_enrollments").select("formation_id, status").eq("member_id", user.id),
  ]);
  const myStatus: Record<string, EnrollmentStatus> = {};
  for (const e of (myEnr ?? []) as { formation_id: string; status: EnrollmentStatus }[]) myStatus[e.formation_id] = e.status ?? "active";
  return { data: { formations: (formations ?? []) as Formation[], myStatus } };
}

/**
 * Un membre demande librement à s'inscrire à une formation → crée une demande
 * « pending » (liste d'attente). Notifie le formateur interne + les pasteurs.
 * L'étape pastorale n'est PAS modifiée tant que ce n'est pas validé.
 */
export async function requestSelfEnrollment(formationId: string) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Non authentifié" as const };

  const admin = createAdminClient();
  const { data: existing } = await admin
    .from("formation_enrollments").select("status").eq("formation_id", formationId).eq("member_id", user.id).maybeSingle();
  if (existing) {
    return existing.status === "pending"
      ? { error: "Ta demande est déjà en attente de validation." as const }
      : { error: "Tu es déjà inscrit(e) à cette formation." as const };
  }

  const { error } = await admin
    .from("formation_enrollments")
    .insert({ formation_id: formationId, member_id: user.id, status: "pending" });
  if (error) return { error: error.message };

  // Notifie le formateur interne + les pasteurs (file de validation)
  const [{ data: f }, { data: me }, { data: pasteurs }] = await Promise.all([
    admin.from("formations").select("title, formateur_member_id").eq("id", formationId).maybeSingle(),
    admin.from("profiles").select("first_name, last_name").eq("id", user.id).maybeSingle(),
    admin.from("profiles").select("id").eq("role", "pasteur"),
  ]);
  const memberName = me ? [me.first_name, me.last_name].filter(Boolean).join(" ") || "Un membre" : "Un membre";
  const recipients = new Set<string>();
  for (const p of pasteurs ?? []) recipients.add(p.id as string);
  if (f?.formateur_member_id) recipients.add(f.formateur_member_id as string);
  recipients.delete(user.id);
  await Promise.all(Array.from(recipients).map(uid => notifyUser({
    userId: uid, type: "system",
    title: "🎓 Demande d'inscription à valider",
    body: `${memberName} souhaite s'inscrire à la formation « ${(f?.title as string) ?? ""} ».`,
    link: "/espace-membres/crm/formations",
  }).catch(() => {})));

  revalidatePath(PATH);
  revalidatePath("/espace-membres");
  return { success: true as const };
}

/**
 * Le formateur (ou le staff CRM) valide une demande d'inscription.
 *   • opts.nextSession + formation RÉCURRENTE → rattache le membre à la
 *     PROCHAINE session (start_from_date = prochaine date de séance) au lieu de
 *     la session en cours.
 * Passe le membre à l'étape pastorale « formation » et le notifie.
 */
export async function validateEnrollment(formationId: string, memberId: string, opts: { nextSession?: boolean } = {}) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Non authentifié" as const };

  const admin = createAdminClient();
  const { data: f } = await admin
    .from("formations").select("*").eq("id", formationId).maybeSingle();
  if (!f) return { error: "Formation introuvable" as const };

  // Autorisation : staff CRM OU formateur interne
  const { data: me } = await supabase.from("profiles").select("role, groups").eq("id", user.id).single();
  const isStaff = ["admin", "pasteur"].includes(me?.role ?? "") || ((me?.groups as string[] | null) ?? []).includes("suivi");
  if (!isStaff && (f.formateur_member_id as string | null) !== user.id) return { error: "Non autorisé" as const };

  // Rattachement à la prochaine session (récurrente uniquement)
  let startFrom: string | null = null;
  if (opts.nextSession && f.recurring) {
    const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
    startFrom = computeSessionDates(f as Formation, { from: tomorrow })[0] ?? null;
  }

  const { error } = await admin
    .from("formation_enrollments")
    .update({ status: "active", validated_by: user.id, validated_at: new Date().toISOString(), start_from_date: startFrom })
    .eq("formation_id", formationId)
    .eq("member_id", memberId);
  if (error) return { error: error.message };

  await admin.from("profiles").update({ pastoral_stage: "formation" }).eq("id", memberId);

  const when = startFrom
    ? ` Tu rejoins la prochaine session (à partir du ${new Date(startFrom + "T00:00:00").toLocaleDateString("fr-CH", { day: "numeric", month: "long" })}).`
    : "";
  await notifyUser({
    userId: memberId, type: "system",
    title: "🎓 Inscription validée",
    body: `Ton inscription à la formation « ${(f.title as string) ?? ""} » a été validée.${when}`,
    link: "/espace-membres/profil",
  }).catch(() => {});

  revalidatePath(PATH);
  revalidatePath("/espace-membres/crm");
  revalidatePath("/espace-membres/profil");
  revalidatePath("/espace-membres");
  return { success: true as const, startFrom };
}
