"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";

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

  const member_id = formData.get("member_id") as string;
  const content   = (formData.get("content") as string)?.trim();
  const type      = (formData.get("type") as string) || "general";

  if (!content) return { error: "Contenu requis" };

  const { error } = await supabase.from("member_notes").insert({
    member_id, author_id: user.id, content, type,
  });

  if (error) return { error: error.message };
  revalidatePath(`/espace-membres/crm/${member_id}`);
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
  // Seul l'admin peut promouvoir au rôle admin
  if (newRole === "admin" && !callerIsAdmin) return { error: "Seul l'admin peut attribuer le rôle admin" };

  const admin = createAdminClient();
  const { error } = await admin.from("profiles").update({ role: newRole }).eq("id", memberId);
  if (error) return { error: error.message };

  // Log dans activity_feed (best-effort, table may not exist yet)
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

  const { error } = await admin.from("profiles").update({ validated }).eq("id", memberId);
  if (error) return { error: error.message };
  revalidatePath("/espace-membres/crm");
  revalidatePath(`/espace-membres/crm/${memberId}`);
  return { success: true };
}
