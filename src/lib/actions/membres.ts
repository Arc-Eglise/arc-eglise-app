"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import {
  sendWelcomeMemberEmail,
  sendProfileUpdateEmail,
  sendInvitationEmail,
} from "@/lib/email";

const ROLE_LABELS: Record<string, string> = {
  admin: "Administrateur",
  pasteur: "Pasteur",
  membre: "Membre",
  visiteur: "Visiteur",
};

const GROUP_LABELS: Record<string, string> = {
  pasteur:       "Pasteur",
  media:         "Équipe Média",
  chorale:       "Chorale",
  jeunesse:      "La Jeunesse",
  femmes:        "Groupe des Femmes",
  social:        "Social & Hospitalité",
  sanitaire:     "Sanitaire & Propreté",
  ecodim:        "Écodim",
  suivi:         "Suivi d'âmes",
  communication: "Communication",
  support:       "Support",
  finance:       "Finance",
};

export async function updateProfile(formData: FormData) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Non authentifié" };

  const { error } = await supabase.from("profiles").update({
    first_name: (formData.get("first_name") as string)?.trim() || null,
    last_name:  (formData.get("last_name")  as string)?.trim() || null,
    phone:      (formData.get("phone")      as string)?.trim() || null,
    country:    (formData.get("country")    as string)?.trim() || null,
  }).eq("id", user.id);

  if (error) return { error: error.message };
  revalidatePath("/espace-membres/profil");
  return { success: true };
}

export async function createPrayerRequest(formData: FormData) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Non authentifié" };

  const title = (formData.get("title") as string)?.trim();
  if (!title) return { error: "Le titre est obligatoire" };

  const { error } = await supabase.from("prayer_requests").insert({
    user_id:      user.id,
    title,
    description:  (formData.get("description") as string)?.trim() || null,
    is_anonymous: formData.get("is_anonymous") === "on",
  });

  if (error) return { error: error.message };
  revalidatePath("/espace-membres/priere");
  return { success: true };
}

export async function prayForRequest(id: string) {
  const admin = createAdminClient();
  const { data } = await admin
    .from("prayer_requests")
    .select("prayer_count")
    .eq("id", id)
    .single();

  await admin
    .from("prayer_requests")
    .update({ prayer_count: (data?.prayer_count ?? 0) + 1 })
    .eq("id", id);

  revalidatePath("/espace-membres/priere");
  return { success: true };
}

export async function markPrayerAnswered(id: string) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Non authentifié" };

  await supabase
    .from("prayer_requests")
    .update({ is_answered: true })
    .eq("id", id)
    .eq("user_id", user.id);

  revalidatePath("/espace-membres/priere");
  return { success: true };
}

export async function deletePrayerRequest(id: string) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Non authentifié" };

  await supabase
    .from("prayer_requests")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  revalidatePath("/espace-membres/priere");
  return { success: true };
}

// ─── RSVP ──────────────────────────────────────────────────────────────────

export async function rsvpEvent(
  eventId: string,
  status: "going" | "maybe" | "declined" | null,
) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Non authentifié" };

  if (status === null) {
    await supabase
      .from("event_rsvp")
      .delete()
      .eq("event_id", eventId)
      .eq("user_id", user.id);
  } else {
    await supabase
      .from("event_rsvp")
      .upsert({ event_id: eventId, user_id: user.id, status }, { onConflict: "event_id,user_id" });
  }

  revalidatePath("/espace-membres/agenda");
  return { success: true };
}

// ── Présences événements ──────────────────────────────────────────

export async function checkInEvent(eventId: string, targetUserId?: string) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Non authentifié" };

  const userId = targetUserId ?? user.id;

  // Si admin checke quelqu'un d'autre, vérifier le rôle
  if (targetUserId && targetUserId !== user.id) {
    const { data: profile } = await supabase.from("profiles").select("role, groups").eq("id", user.id).single();
    const ok = ["admin", "pasteur"].includes(profile?.role ?? "") || (profile?.groups as string[] | null)?.includes("support");
    if (!ok) return { error: "Non autorisé" };
  }

  const { error } = await supabase.from("event_attendance").upsert(
    { event_id: eventId, user_id: userId, checked_in_by: user.id },
    { onConflict: "event_id,user_id" }
  );

  if (error) return { error: error.message };
  revalidatePath("/espace-membres/agenda");
  return { success: true };
}

export async function cancelCheckIn(eventId: string, targetUserId?: string) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Non authentifié" };

  const userId = targetUserId ?? user.id;

  if (targetUserId) {
    const { data: p } = await supabase.from("profiles").select("role, groups").eq("id", user.id).single();
    const ok = ["admin", "pasteur"].includes(p?.role ?? "") || (p?.groups as string[] | null)?.includes("support");
    if (!ok) return { error: "Non autorisé" };
  }

  await supabase.from("event_attendance").delete().eq("event_id", eventId).eq("user_id", userId);
  revalidatePath("/espace-membres/agenda");
  revalidatePath(`/espace-membres/presences/${eventId}`);
  return { success: true };
}

// ── Notes bibliques ────────────────────────────────────────────────

export async function createBiblicalNote(formData: FormData) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Non authentifié" };

  const title     = (formData.get("title") as string)?.trim();
  const content   = (formData.get("content") as string)?.trim();
  const reference = (formData.get("reference") as string)?.trim() || null;

  if (!title || !content) return { error: "Titre et contenu requis" };

  const { data, error } = await supabase
    .from("biblical_notes")
    .insert({ user_id: user.id, title, content, reference })
    .select("id")
    .single();

  if (error) return { error: error.message };
  revalidatePath("/espace-membres/notes");
  return { id: data.id };
}

export async function updateBiblicalNote(formData: FormData) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Non authentifié" };

  const id        = formData.get("id") as string;
  const title     = (formData.get("title") as string)?.trim();
  const content   = (formData.get("content") as string)?.trim();
  const reference = (formData.get("reference") as string)?.trim() || null;

  if (!title || !content) return { error: "Titre et contenu requis" };

  const { error } = await supabase
    .from("biblical_notes")
    .update({ title, content, reference })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { error: error.message };
  revalidatePath("/espace-membres/notes");
  return { success: true };
}

export async function deleteBiblicalNote(id: string) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Non authentifié" };

  await supabase.from("biblical_notes").delete().eq("id", id).eq("user_id", user.id);
  revalidatePath("/espace-membres/notes");
  return { success: true };
}

// ── Doléances ─────────────────────────────────────────────────────

export async function createGrievance(formData: FormData) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Non authentifié" };

  const title        = (formData.get("title") as string)?.trim();
  const description  = (formData.get("description") as string)?.trim();
  const category     = (formData.get("category") as string) || "autre";
  const is_anonymous = formData.get("is_anonymous") === "on";

  if (!title || !description) return { error: "Titre et description requis" };

  const { error } = await supabase.from("grievances").insert({
    user_id: user.id, title, description, category, is_anonymous,
  });

  if (error) return { error: error.message };

  // Notifier contact@arc-eglise.ch via Graph API (silencieux si non configuré)
  if (process.env.GRAPH_TENANT_ID && process.env.GRAPH_CLIENT_ID && process.env.GRAPH_CLIENT_SECRET) {
    let senderLine = "Anonyme";
    if (!is_anonymous) {
      const { data: prof } = await supabase.from("profiles").select("first_name, last_name, email").eq("id", user.id).single();
      const name = [prof?.first_name, prof?.last_name].filter(Boolean).join(" ") || "—";
      senderLine = `${name} <${prof?.email ?? user.email ?? "—"}>`;
    }
    import("@/lib/mail/graph-client").then(({ sendMail }) =>
      sendMail({
        from: "contact@arc-eglise.ch",
        to:   "contact@arc-eglise.ch",
        subject: `[Doléance] ${title}`,
        body:    `Catégorie : ${category}\n\n${description}\n\n— ${senderLine}`,
      })
    ).catch(() => {});
  }

  revalidatePath("/espace-membres/doleances");
  return { success: true };
}

export async function updateGrievanceStatus(formData: FormData) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Non authentifié" };

  const { data: profile } = await supabase
    .from("profiles").select("role, groups").eq("id", user.id).single();
  const canManage =
    ["admin","pasteur"].includes(profile?.role ?? "") ||
    (profile?.groups as string[] | null)?.includes("support");
  if (!canManage) return { error: "Non autorisé" };

  const id             = formData.get("id") as string;
  const status         = formData.get("status") as string;
  const admin_response = (formData.get("admin_response") as string)?.trim() || null;

  const { error } = await supabase
    .from("grievances")
    .update({ status, admin_response, responded_by: user.id })
    .eq("id", id);

  if (error) return { error: error.message };
  revalidatePath("/espace-membres/doleances");
  revalidatePath("/admin/doleances");
  return { success: true };
}

export async function deleteGrievance(id: string) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Non authentifié" };

  await supabase.from("grievances").delete().eq("id", id).eq("user_id", user.id);
  revalidatePath("/espace-membres/doleances");
  return { success: true };
}

// ── CRM (admin/pasteur) ───────────────────────────────────────────

async function assertAdmin(supabase: ReturnType<typeof createClient>) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase.from("profiles").select("role, groups").eq("id", user.id).single();
  const allowed =
    ["admin", "pasteur"].includes(data?.role ?? "") ||
    (data?.groups as string[] | null)?.includes("support");
  if (!allowed) return null;
  return user;
}

export async function addMemberNote(formData: FormData) {
  const supabase = createClient();
  const user = await assertAdmin(supabase);
  if (!user) return { error: "Non autorisé" };

  const member_id    = formData.get("member_id") as string;
  const content      = (formData.get("content") as string)?.trim();
  const type         = (formData.get("type") as string) || "general";
  const followup_raw = (formData.get("followup_date") as string)?.trim();
  const followup_date = followup_raw || null;

  if (!content) return { error: "Contenu requis" };

  const row: Record<string, unknown> = { member_id, author_id: user.id, content, type };
  if (followup_date) row.followup_date = followup_date;

  const { error } = await supabase.from("member_notes").insert(row);

  if (error) return { error: error.message };
  revalidatePath(`/espace-membres/crm/${member_id}`);
  revalidatePath("/espace-membres/crm");
  return { success: true };
}

const PASTORAL_STAGES = ["visiteur","integration","actif","formation","responsable"] as const;

export async function updatePastoralStage(memberId: string, stage: string) {
  const supabase = createClient();
  const user = await assertAdmin(supabase);
  if (!user) return { error: "Non autorisé" };
  if (!(PASTORAL_STAGES as readonly string[]).includes(stage)) return { error: "Étape invalide" };

  const admin = createAdminClient();
  const { error } = await admin.from("profiles").update({ pastoral_stage: stage }).eq("id", memberId);
  if (error) return { error: error.message };
  revalidatePath(`/espace-membres/crm/${memberId}`);
  revalidatePath("/espace-membres/crm");
  return { success: true };
}

export async function deleteMemberNote(noteId: string, memberId: string) {
  const supabase = createClient();
  const user = await assertAdmin(supabase);
  if (!user) return { error: "Non autorisé" };

  await supabase.from("member_notes").delete().eq("id", noteId).eq("author_id", user.id);
  revalidatePath(`/espace-membres/crm/${memberId}`);
  return { success: true };
}

export async function createEvent(data: {
  title: string; date: string; time_start: string;
  location: string; type: string; description?: string;
}) {
  const supabase = createClient();
  const user = await assertAdmin(supabase);
  if (!user) return { error: "Non autorisé" };

  const { error } = await supabase.from("events").insert({
    title: data.title.trim(),
    date: data.date,
    time_start: data.time_start || null,
    location: data.location.trim() || null,
    description: data.description?.trim() || null,
    is_published: true,
  });

  if (error) return { error: error.message };
  revalidatePath("/espace-membres");
  revalidatePath("/");
  return { success: true };
}

export async function generateInviteLink(email: string, firstName: string, lastName: string) {
  const supabase = createClient();
  const user = await assertAdmin(supabase);
  if (!user) return { error: "Non autorisé" };

  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.generateLink({
    type: "invite",
    email: email.trim(),
    options: { data: { first_name: firstName.trim(), last_name: lastName.trim() } },
  });

  if (error) return { error: error.message };
  return { link: (data.properties as { action_link?: string } | null)?.action_link ?? null };
}

export async function createRoomBooking(data: {
  room: string; date: string; time_start: string;
  time_end: string; groupe: string; motif: string;
}) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Non authentifié" };

  const { error } = await supabase.from("room_bookings").insert({
    user_id: user.id,
    room: data.room,
    date: data.date,
    time_start: data.time_start,
    time_end: data.time_end,
    groupe: data.groupe || null,
    motif: data.motif.trim(),
  });

  if (error) return { error: error.message };
  revalidatePath("/espace-membres");
  return { success: true };
}

export async function updateSiteSettings(settings: Record<string, string>) {
  const supabase = createClient();
  const user = await assertAdmin(supabase);
  if (!user) return { error: "Non autorisé" };

  for (const [key, value] of Object.entries(settings)) {
    await supabase
      .from("site_settings")
      .update({ value, updated_by: user.id, updated_at: new Date().toISOString() })
      .eq("key", key);
  }

  revalidatePath("/");
  revalidatePath("/espace-membres");
  return { success: true };
}

export async function updateMemberRole(memberId: string, newRole: string) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Non authentifié" };

  const { data: me } = await supabase.from("profiles").select("role, groups").eq("id", user.id).single();
  const callerIsAdmin = me?.role === "admin";
  const callerIsPrivileged =
    callerIsAdmin ||
    me?.role === "pasteur" ||
    (me?.groups as string[] | null)?.includes("support");
  if (!callerIsPrivileged) return { error: "Non autorisé" };
  if (newRole === "admin" && !callerIsAdmin) return { error: "Seul l'admin peut attribuer le rôle admin" };

  const admin = createAdminClient();

  // Récupérer le profil cible pour l'email
  const { data: target } = await admin
    .from("profiles")
    .select("email, first_name")
    .eq("id", memberId)
    .single();

  const updatePayload: Record<string, unknown> = { role: newRole };
  if (newRole === "pasteur") {
    const { data: cur } = await admin.from("profiles").select("groups").eq("id", memberId).single();
    const existing = (cur?.groups as string[]) ?? [];
    if (!existing.includes("pasteur")) updatePayload.groups = [...existing, "pasteur"];
  }
  const { error } = await admin.from("profiles").update(updatePayload).eq("id", memberId);
  if (error) return { error: error.message };

  // Notification email (best-effort)
  if (target?.email) {
    const roleLabel = ROLE_LABELS[newRole] ?? newRole;
    const message = `Ton rôle dans la communauté ARC a été mis à jour. Tu es maintenant : <strong>${roleLabel}</strong>.`;
    try {
      await sendProfileUpdateEmail(target.email, target.first_name ?? "", message);
    } catch { /* ne pas bloquer si l'envoi échoue */ }
  }

  // Log dans activity_feed (best-effort)
  try {
    await admin.from("activity_feed").insert({
      icon: "👤", text: `Rôle modifié → ${newRole}`,
      user_id: user.id, target_user_id: memberId,
    });
  } catch { /* table pas encore créée */ }

  revalidatePath("/espace-membres");
  return { success: true };
}

export async function savePermissionsMatrix(perms: Record<string, Record<string, boolean>>) {
  const supabase = createClient();
  const user = await assertAdmin(supabase);
  if (!user) return { error: "Non autorisé" };

  const admin = createAdminClient();
  await admin.from("site_settings").upsert(
    { key: "role_permissions_matrix", value: JSON.stringify(perms), updated_by: user.id, updated_at: new Date().toISOString() },
    { onConflict: "key" }
  );

  return { success: true };
}

export async function savePlatformCards(cards: object[]) {
  const supabase = createClient();
  const user = await assertAdmin(supabase);
  if (!user) {
    const { data: { user: u } } = await supabase.auth.getUser();
    if (!u) return { error: "Non authentifié" };
    const { data: p } = await supabase.from("profiles").select("role,groups").eq("id", u.id).single();
    if (!["admin","pasteur"].includes(p?.role ?? "") && !(p?.groups ?? []).includes("Communication")) {
      return { error: "Non autorisé" };
    }
  }

  const admin = createAdminClient();
  await admin.from("site_settings").upsert(
    { key: "mp_cards", value: JSON.stringify(cards), updated_by: user?.id ?? null, updated_at: new Date().toISOString() },
    { onConflict: "key" }
  );

  revalidatePath("/");
  return { success: true };
}

export async function updateCrmTags(memberId: string, tags: string[]) {
  const supabase = createClient();
  const user = await assertAdmin(supabase);
  if (!user) return { error: "Non autorisé" };

  const { error } = await supabase.from("profiles").update({ crm_tags: tags }).eq("id", memberId);
  if (error) return { error: error.message };
  revalidatePath(`/espace-membres/crm/${memberId}`);
  return { success: true };
}

export async function updateMemberValidation(memberId: string, validated: boolean) {
  const admin = createAdminClient();
  const supabase = createClient();
  const user = await assertAdmin(supabase);
  if (!user) return { error: "Non autorisé" };

  // Récupérer le profil avant modification (pour l'email)
  const { data: target } = await admin
    .from("profiles")
    .select("email, first_name, validated")
    .eq("id", memberId)
    .single();

  const updatePayload: Record<string, unknown> = {
    validated,
    validated_by: user.id,
    validated_at: validated ? new Date().toISOString() : null,
  };
  if (validated) updatePayload.role = "membre";
  const { error } = await admin.from("profiles").update(updatePayload).eq("id", memberId);
  if (error) return { error: error.message };

  // Email de bienvenue quand on passe de non-validé → validé
  if (validated && !target?.validated && target?.email) {
    try {
      await sendWelcomeMemberEmail(target.email, target.first_name ?? "");
    } catch { /* ne pas bloquer si l'envoi échoue */ }
  }

  revalidatePath("/espace-membres/crm");
  revalidatePath(`/espace-membres/crm/${memberId}`);
  revalidatePath("/admin/membres");
  return { success: true };
}

export async function updateMemberGroups(memberId: string, groups: string[]) {
  const admin = createAdminClient();
  const supabase = createClient();
  const user = await assertAdmin(supabase);
  if (!user) return { error: "Non autorisé" };

  const { data: target } = await admin
    .from("profiles")
    .select("email, first_name, managed_groups")
    .eq("id", memberId)
    .single();

  // Nettoyer managed_groups si un groupe géré est retiré des groups
  const currentManaged = (target?.managed_groups as string[]) ?? [];
  const cleanedManaged = currentManaged.filter(g => groups.includes(g));
  const updatePayload: Record<string, unknown> = { groups };
  if (cleanedManaged.length !== currentManaged.length) {
    updatePayload.managed_groups = cleanedManaged;
  }

  const { error } = await admin.from("profiles").update(updatePayload).eq("id", memberId);
  if (error) return { error: error.message };

  // Notification email (best-effort)
  if (target?.email) {
    const groupNames = groups
      .map((g) => GROUP_LABELS[g] ?? g)
      .join(", ");
    const message = groups.length > 0
      ? `Tes fonctions dans la communauté ARC ont été mises à jour : <strong>${groupNames}</strong>.`
      : "Tes fonctions dans la communauté ARC ont été mises à jour. Aucune fonction n'est attribuée pour le moment.";
    try {
      await sendProfileUpdateEmail(target.email, target.first_name ?? "", message);
    } catch { /* ne pas bloquer si l'envoi échoue */ }
  }

  revalidatePath("/espace-membres/crm");
  revalidatePath(`/espace-membres/crm/${memberId}`);
  return { success: true };
}

export async function inviteMember(email: string, firstName: string, lastName: string) {
  const supabase = createClient();
  const user = await assertAdmin(supabase);
  if (!user) return { error: "Non autorisé" };

  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.generateLink({
    type: "invite",
    email: email.trim(),
    options: { data: { first_name: firstName.trim(), last_name: lastName.trim() } },
  });

  if (error) return { error: error.message };

  const inviteLink = (data.properties as { action_link?: string } | null)?.action_link;
  if (!inviteLink) return { error: "Lien d'invitation non généré" };

  try {
    await sendInvitationEmail(email.trim(), firstName.trim(), inviteLink);
  } catch (e) {
    return { error: `Lien généré mais email non envoyé : ${(e as Error).message}` };
  }

  return { success: true };
}

// ── Gestion des managers de groupes ──────────────────────────────

const VALID_GROUPS = new Set(["pasteur","chorale","media","social","sanitaire","finance","support","jeunesse","femmes","ecodim","suivi","communication"]);
const MAX_MANAGERS_PER_GROUP = 2;

/** Vérifie si l'appelant peut gérer les managers du groupe donné */
async function assertManagerOf(supabase: ReturnType<typeof createClient>, groupName: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: me } = await supabase.from("profiles").select("role, managed_groups").eq("id", user.id).single();
  const isPrivileged = me?.role === "admin" || me?.role === "pasteur";
  const isManagerOfGroup = (me?.managed_groups as string[] ?? []).includes(groupName);
  if (!isPrivileged && !isManagerOfGroup) return null;
  return user;
}

export async function assignGroupManager(targetMemberId: string, groupName: string) {
  if (!VALID_GROUPS.has(groupName)) return { error: "Groupe invalide" };

  const supabase = createClient();
  const caller = await assertManagerOf(supabase, groupName);
  if (!caller) return { error: "Non autorisé" };

  const admin = createAdminClient();
  const { data: target } = await admin.from("profiles")
    .select("groups, managed_groups").eq("id", targetMemberId).single();
  if (!target) return { error: "Membre introuvable" };

  const targetGroups   = (target.groups         as string[]) ?? [];
  const targetManaged  = (target.managed_groups  as string[]) ?? [];

  if (!targetGroups.includes(groupName))   return { error: "Ce membre n'appartient pas à ce groupe" };
  if (targetManaged.includes(groupName))   return { success: true }; // déjà manager

  const { data: existing } = await admin.from("profiles").select("id").contains("managed_groups", [groupName]);
  if ((existing?.length ?? 0) >= MAX_MANAGERS_PER_GROUP)
    return { error: `Ce groupe a déjà ${MAX_MANAGERS_PER_GROUP} managers (maximum atteint)` };

  const { error } = await admin.from("profiles")
    .update({ managed_groups: [...targetManaged, groupName] })
    .eq("id", targetMemberId);
  if (error) return { error: error.message };

  revalidatePath(`/espace-membres/crm/${targetMemberId}`);
  revalidatePath("/espace-membres/gestion-groupe");
  return { success: true };
}

export async function revokeGroupManager(targetMemberId: string, groupName: string) {
  if (!VALID_GROUPS.has(groupName)) return { error: "Groupe invalide" };

  const supabase = createClient();
  const caller = await assertManagerOf(supabase, groupName);
  if (!caller) return { error: "Non autorisé" };

  const admin = createAdminClient();
  const { data: target } = await admin.from("profiles").select("managed_groups").eq("id", targetMemberId).single();
  if (!target) return { error: "Membre introuvable" };

  const current = (target.managed_groups as string[]) ?? [];
  const { error } = await admin.from("profiles")
    .update({ managed_groups: current.filter(g => g !== groupName) })
    .eq("id", targetMemberId);
  if (error) return { error: error.message };

  revalidatePath(`/espace-membres/crm/${targetMemberId}`);
  revalidatePath("/espace-membres/gestion-groupe");
  return { success: true };
}

export async function addMemberToGroup(targetMemberId: string, groupName: string) {
  if (!VALID_GROUPS.has(groupName)) return { error: "Groupe invalide" };

  const supabase = createClient();
  const caller = await assertManagerOf(supabase, groupName);
  if (!caller) return { error: "Non autorisé" };

  const admin = createAdminClient();
  const { data: target } = await admin.from("profiles").select("groups").eq("id", targetMemberId).single();
  if (!target) return { error: "Membre introuvable" };

  const current = (target.groups as string[]) ?? [];
  if (current.includes(groupName)) return { success: true };

  const { error } = await admin.from("profiles")
    .update({ groups: [...current, groupName] })
    .eq("id", targetMemberId);
  if (error) return { error: error.message };

  revalidatePath("/espace-membres/gestion-groupe");
  return { success: true };
}

export async function removeMemberFromGroup(targetMemberId: string, groupName: string) {
  if (!VALID_GROUPS.has(groupName)) return { error: "Groupe invalide" };

  const supabase = createClient();
  const caller = await assertManagerOf(supabase, groupName);
  if (!caller) return { error: "Non autorisé" };

  const admin = createAdminClient();
  const { data: target } = await admin.from("profiles")
    .select("groups, managed_groups").eq("id", targetMemberId).single();
  if (!target) return { error: "Membre introuvable" };

  const updGroups   = ((target.groups         as string[]) ?? []).filter(g => g !== groupName);
  const updManaged  = ((target.managed_groups  as string[]) ?? []).filter(g => g !== groupName);

  const { error } = await admin.from("profiles")
    .update({ groups: updGroups, managed_groups: updManaged })
    .eq("id", targetMemberId);
  if (error) return { error: error.message };

  revalidatePath("/espace-membres/gestion-groupe");
  return { success: true };
}
