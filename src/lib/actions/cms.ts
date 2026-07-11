"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";

async function uploadToStorage(bucket: string, path: string, file: File) {
  const admin = createAdminClient();
  const buffer = Buffer.from(await file.arrayBuffer());
  const { error } = await admin.storage
    .from(bucket)
    .upload(path, buffer, { contentType: file.type, upsert: true });
  if (error) return null;
  const { data } = admin.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

async function getCmsUser() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, groups")
    .eq("id", user.id)
    .single();

  if (!profile) throw new Error("Profil introuvable");

  const canCms =
    profile.role === "admin" ||
    profile.role === "pasteur" ||
    profile.groups?.includes("support") ||
    profile.groups?.includes("media") ||
    profile.groups?.includes("communication");

  if (!canCms) throw new Error("Accès non autorisé");
  return { supabase, profile, userId: user.id };
}

// ── SERMONS ────────────────────────────────────────────────────

export async function createSermon(formData: FormData) {
  const { supabase, userId } = await getCmsUser();

  const { error } = await supabase.from("sermons").insert({
    title:        formData.get("title")     as string,
    pastor:       formData.get("pastor")    as string,
    reference:    formData.get("reference") as string || null,
    series:       formData.get("series")    as string || null,
    excerpt:      formData.get("excerpt")   as string || null,
    youtube_id:   formData.get("youtube_id") as string || null,
    date:         formData.get("date")      as string,
    is_featured:  formData.get("is_featured") === "on",
    is_published: formData.get("is_published") !== "off",
    created_by:   userId,
  });

  if (error) return { error: error.message };
  revalidatePath("/");
  revalidatePath("/admin/sermons");
  return { success: true };
}

export async function updateSermon(id: string, formData: FormData) {
  const { supabase } = await getCmsUser();

  const { error } = await supabase.from("sermons").update({
    title:        formData.get("title")     as string,
    pastor:       formData.get("pastor")    as string,
    reference:    formData.get("reference") as string || null,
    series:       formData.get("series")    as string || null,
    excerpt:      formData.get("excerpt")   as string || null,
    youtube_id:   formData.get("youtube_id") as string || null,
    date:         formData.get("date")      as string,
    is_featured:  formData.get("is_featured") === "on",
    is_published: formData.get("is_published") !== "off",
  }).eq("id", id);

  if (error) return { error: error.message };
  revalidatePath("/");
  revalidatePath("/admin/sermons");
  return { success: true };
}

export async function deleteSermon(id: string) {
  const { supabase, profile } = await getCmsUser();
  const canDelete =
    ["admin", "pasteur"].includes(profile.role as string) ||
    (profile.groups as string[] | null)?.includes("support");
  if (!canDelete) return { error: "Non autorisé" };

  const { error } = await supabase.from("sermons").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/");
  revalidatePath("/admin/sermons");
  return { success: true };
}

// ── EVENTS ─────────────────────────────────────────────────────

export async function createEvent(formData: FormData) {
  const { supabase, userId } = await getCmsUser();

  const tagsRaw = formData.get("tags") as string;
  const tags = tagsRaw ? tagsRaw.split(",").map((t) => t.trim()).filter(Boolean) : [];

  const { error } = await supabase.from("events").insert({
    title:        formData.get("title")       as string,
    description:  formData.get("description") as string || null,
    date:         formData.get("date")        as string,
    time_start:   formData.get("time_start")  as string,
    time_end:     formData.get("time_end")    as string || null,
    location:     formData.get("location")    as string,
    capacity:     formData.get("capacity")    ? Number(formData.get("capacity")) : null,
    price_chf:    formData.get("price_chf")   ? Number(formData.get("price_chf")) : 0,
    tags,
    is_public:    formData.get("is_public")    !== "off",
    is_published: formData.get("is_published") !== "off",
    created_by:   userId,
  });

  if (error) return { error: error.message };
  revalidatePath("/");
  revalidatePath("/admin/evenements");
  return { success: true };
}

export async function deleteEvent(id: string) {
  const { supabase } = await getCmsUser();
  const { error } = await supabase.from("events").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/");
  revalidatePath("/admin/evenements");
  return { success: true };
}

// ── TEAM MEMBERS ───────────────────────────────────────────────

export async function createTeamMember(formData: FormData) {
  const { supabase } = await getCmsUser();

  let avatar_url: string | null = null;
  const photo = formData.get("photo") as File | null;
  if (photo && photo.size > 0) {
    const ext = photo.name.split(".").pop()?.toLowerCase() ?? "jpg";
    avatar_url = await uploadToStorage("team-photos", `team-${Date.now()}.${ext}`, photo);
  }

  const { error } = await supabase.from("team_members").insert({
    name:       formData.get("name")       as string,
    role_label: formData.get("role_label") as string,
    bio:        formData.get("bio")        as string || null,
    initials:   (formData.get("initials") as string).toUpperCase(),
    sort_order: Number(formData.get("sort_order") ?? 5),
    avatar_url,
  });

  if (error) return { error: error.message };
  revalidatePath("/");
  revalidatePath("/admin/equipe");
  return { success: true };
}

export async function deleteTeamMember(id: string) {
  const { supabase } = await getCmsUser();

  const { error } = await supabase.from("team_members").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/");
  revalidatePath("/admin/equipe");
  return { success: true };
}

// ── MEMBERS (validation) ────────────────────────────────────────

export async function validateMember(memberId: string) {
  const { profile, userId } = await getCmsUser();
  const canManage =
    ["admin", "pasteur"].includes(profile.role as string) ||
    (profile.groups as string[] | null)?.includes("support");
  if (!canManage) return { error: "Non autorisé" };

  // Doit utiliser createAdminClient() pour contourner le RLS
  const admin = createAdminClient();
  const { error } = await admin.from("profiles").update({
    validated:    true,
    role:         "membre",
    validated_by: userId,
    validated_at: new Date().toISOString(),
  }).eq("id", memberId);

  if (error) return { error: error.message };
  revalidatePath("/admin/membres");
  revalidatePath(`/admin/crm/${memberId}`);
  return { success: true };
}

export async function rejectMember(memberId: string) {
  const { profile } = await getCmsUser();
  const canManage =
    ["admin", "pasteur"].includes(profile.role as string) ||
    (profile.groups as string[] | null)?.includes("support");
  if (!canManage) return { error: "Non autorisé" };

  const admin = createAdminClient();
  const { error } = await admin.from("profiles").update({
    validated: false,
    role:      "visiteur",
  }).eq("id", memberId);

  if (error) return { error: error.message };
  revalidatePath("/admin/membres");
  revalidatePath(`/admin/crm/${memberId}`);
  return { success: true };
}

// ── TÉMOIGNAGES ────────────────────────────────────────────────

export async function createTestimonial(formData: FormData) {
  const { supabase, userId } = await getCmsUser();

  let avatar_url: string | null = null;
  const photo = formData.get("photo") as File | null;
  if (photo && photo.size > 0) {
    const ext = photo.name.split(".").pop()?.toLowerCase() ?? "jpg";
    avatar_url = await uploadToStorage("media", `testimonials/${Date.now()}.${ext}`, photo);
  }

  const { error } = await supabase.from("testimonials").insert({
    author_name:  formData.get("author_name")  as string,
    author_role:  formData.get("author_role")  as string || null,
    content:      formData.get("content")      as string,
    sort_order:   Number(formData.get("sort_order") ?? 0),
    is_published: formData.get("is_published") !== "off",
    avatar_url,
    created_by: userId,
  });

  if (error) return { error: error.message };
  revalidatePath("/");
  revalidatePath("/admin/temoignages");
  return { success: true };
}

export async function deleteTestimonial(id: string) {
  const { supabase } = await getCmsUser();
  const { error } = await supabase.from("testimonials").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/");
  revalidatePath("/admin/temoignages");
  return { success: true };
}

export async function toggleTestimonialPublished(id: string, published: boolean) {
  const { supabase } = await getCmsUser();
  const { error } = await supabase.from("testimonials").update({ is_published: published }).eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/");
  revalidatePath("/admin/temoignages");
  return { success: true };
}

// ── SITE SETTINGS ──────────────────────────────────────────────

const ALLOWED_SETTINGS = [
  "verset_du_jour", "verset_reference", "hero_subtitle",
  "culte_1_label", "culte_2_label", "culte_3_label",
  "contact_address", "contact_email", "contact_horaires", "contact_map_url",
  "social_facebook", "social_instagram", "social_youtube", "social_whatsapp",
  "histoire_p1", "histoire_p2", "histoire_citation",
  "votre_impact_intro",
  "decouvrir_1_text", "decouvrir_2_text", "decouvrir_3_text", "decouvrir_4_text",
  "stats_nations", "stats_touches",
] as const;

export async function updateSiteSettings(formData: FormData) {
  const { supabase } = await getCmsUser();

  const upserts = ALLOWED_SETTINGS
    .filter((key) => formData.has(key))
    .map((key) => ({ key, value: (formData.get(key) as string) ?? "" }));

  if (!upserts.length) return { error: "Aucun champ" };

  const { error } = await supabase
    .from("site_settings")
    .upsert(upserts, { onConflict: "key" });

  if (error) return { error: error.message };
  revalidatePath("/");
  revalidatePath("/admin/site");
  return { success: true };
}

// ── AVATAR MEMBRE ───────────────────────────────────────────────

export async function uploadMemberAvatar(formData: FormData) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Non authentifié" };

  const photo = formData.get("avatar") as File | null;
  if (!photo || photo.size === 0) return { error: "Aucun fichier sélectionné" };
  if (photo.size > 2 * 1024 * 1024) return { error: "Fichier trop grand (max 2 Mo)" };

  const ext = photo.name.split(".").pop()?.toLowerCase() ?? "jpg";
  const publicUrl = await uploadToStorage("media", `avatars/${user.id}.${ext}`, photo);
  if (!publicUrl) return { error: "Erreur lors de l'upload" };

  await supabase.from("profiles").update({ avatar_url: publicUrl }).eq("id", user.id);

  revalidatePath("/espace-membres");
  return { success: true };
}
