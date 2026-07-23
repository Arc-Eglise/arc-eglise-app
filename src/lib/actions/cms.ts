"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import { broadcastNotify, notifyMany } from "@/lib/notify";

function sermonBody(pastor: string | null) {
  return pastor ? `Prêché par ${pastor}` : "Nouveau sermon disponible";
}

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

type CmsOk  = { ok: true;  supabase: ReturnType<typeof createClient>; profile: { role: string; groups: string[] | null }; userId: string };
type CmsErr = { ok: false; error: string };

async function getCmsUser(): Promise<CmsOk | CmsErr> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Non authentifié" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, groups")
    .eq("id", user.id)
    .single();

  if (!profile) return { ok: false, error: "Profil introuvable" };

  const canCms =
    profile.role === "admin" ||
    profile.role === "pasteur" ||
    (profile.groups as string[] | null)?.includes("support") ||
    (profile.groups as string[] | null)?.includes("media") ||
    (profile.groups as string[] | null)?.includes("communication");

  if (!canCms) return { ok: false, error: "Accès non autorisé" };
  return { ok: true, supabase, profile: { role: profile.role as string, groups: profile.groups as string[] | null }, userId: user.id };
}

// ── SERMONS ────────────────────────────────────────────────────

export async function createSermon(formData: FormData) {
  const cms = await getCmsUser();
  if (!cms.ok) return { error: cms.error };
  const { supabase, userId } = cms;

  const title       = formData.get("title") as string;
  const pastor      = (formData.get("pastor") as string) || null;
  const isPublished = formData.get("is_published") !== "off";

  const { error } = await supabase.from("sermons").insert({
    title,
    pastor,
    reference:    formData.get("reference") as string || null,
    series:       formData.get("series")    as string || null,
    excerpt:      formData.get("excerpt")   as string || null,
    youtube_id:   formData.get("youtube_id") as string || null,
    date:         formData.get("date")      as string,
    is_featured:  formData.get("is_featured") === "on",
    is_published: isPublished,
    created_by:   userId,
  });

  if (error) return { error: error.message };

  // Sermon publié → diffuser à tous les membres (push + in-app)
  if (isPublished) {
    await broadcastNotify({
      type: "sermon",
      title: `🎙 ${title}`,
      body: sermonBody(pastor),
      link: "/",
      exclude: userId,
    }).catch(() => {});
  }

  revalidatePath("/");
  revalidatePath("/admin/sermons");
  return { success: true };
}

export async function updateSermon(id: string, formData: FormData) {
  const cms = await getCmsUser();
  if (!cms.ok) return { error: cms.error };
  const { supabase, userId } = cms;

  const title       = formData.get("title") as string;
  const pastor      = (formData.get("pastor") as string) || null;
  const isPublished = formData.get("is_published") !== "off";

  // État de publication AVANT modification (pour détecter la mise en ligne)
  const { data: prev } = await supabase.from("sermons").select("is_published").eq("id", id).maybeSingle();

  const { error } = await supabase.from("sermons").update({
    title,
    pastor,
    reference:    formData.get("reference") as string || null,
    series:       formData.get("series")    as string || null,
    excerpt:      formData.get("excerpt")   as string || null,
    youtube_id:   formData.get("youtube_id") as string || null,
    date:         formData.get("date")      as string,
    is_featured:  formData.get("is_featured") === "on",
    is_published: isPublished,
  }).eq("id", id);

  if (error) return { error: error.message };

  // Transition non-publié → publié → diffuser à tous les membres
  if (isPublished && prev?.is_published === false) {
    await broadcastNotify({
      type: "sermon",
      title: `🎙 ${title}`,
      body: sermonBody(pastor),
      link: "/",
      exclude: userId,
    }).catch(() => {});
  }

  revalidatePath("/");
  revalidatePath("/admin/sermons");
  return { success: true };
}

export async function deleteSermon(id: string) {
  const cms = await getCmsUser();
  if (!cms.ok) return { error: cms.error };
  const { supabase, profile } = cms;
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
  const cms = await getCmsUser();
  if (!cms.ok) return { error: cms.error };
  const { supabase, userId } = cms;

  const tagsRaw = formData.get("tags") as string;
  const tags = tagsRaw ? tagsRaw.split(",").map((t) => t.trim()).filter(Boolean) : [];

  const recType = (formData.get("recurrence_type") as string) || "none";

  const imageFile = formData.get("image_file") as File | null;
  let image_url: string | null = (formData.get("image_url") as string) || null;
  if (imageFile && imageFile.size > 0) {
    const ext = imageFile.name.split(".").pop()?.toLowerCase() ?? "jpg";
    image_url = await uploadToStorage("media", `events/${Date.now()}.${ext}`, imageFile);
  }

  const evTitle = formData.get("title") as string;
  const evDate = formData.get("date") as string;
  const evLocation = formData.get("location") as string;
  const evPublished = formData.get("is_published") !== "off";

  const { error } = await supabase.from("events").insert({
    title:               evTitle,
    description:         formData.get("description") as string || null,
    date:                evDate,
    time_start:          formData.get("time_start")  as string,
    time_end:            formData.get("time_end")    as string || null,
    location:            evLocation,
    capacity:            formData.get("capacity")    ? Number(formData.get("capacity")) : null,
    price_chf:           formData.get("price_chf")   ? Number(formData.get("price_chf")) : 0,
    tags,
    image_url,
    is_public:           formData.get("is_public")    !== "off",
    is_published:        evPublished,
    recurrence_type:     recType,
    recurrence_interval: recType !== "none" ? (Number(formData.get("recurrence_interval")) || 1) : 1,
    recurrence_end_date: recType !== "none" && recType !== "indefinite" ? (formData.get("recurrence_end_date") as string || null) : null,
    created_by:          userId,
  });

  if (error) return { error: error.message };

  // Nouvel événement publié à venir → diffuser aux membres validés
  if (evPublished && evDate >= new Date().toISOString().slice(0, 10)) {
    await broadcastNotify({
      type: "event",
      title: `📅 Nouvel événement : ${evTitle}`,
      body: evLocation ? `${evDate} · ${evLocation}` : evDate,
      link: "/espace-membres/agenda",
      exclude: userId,
    }).catch(() => {});
  }

  revalidatePath("/");
  revalidatePath("/admin/evenements");
  revalidatePath("/espace-membres/agenda");
  revalidatePath("/espace-membres");
  return { success: true };
}

export async function updateEvent(id: string, formData: FormData) {
  const cms = await getCmsUser();
  if (!cms.ok) return { error: cms.error };
  const { supabase } = cms;

  const tagsRaw = formData.get("tags") as string;
  const tags = tagsRaw ? tagsRaw.split(",").map((t) => t.trim()).filter(Boolean) : [];
  const recType = (formData.get("recurrence_type") as string) || "none";

  const imageFile = formData.get("image_file") as File | null;
  let image_url: string | null = (formData.get("image_url") as string) || null;
  if (imageFile && imageFile.size > 0) {
    const ext = imageFile.name.split(".").pop()?.toLowerCase() ?? "jpg";
    image_url = await uploadToStorage("media", `events/${Date.now()}.${ext}`, imageFile);
  }

  const evTitle = formData.get("title") as string;
  const evDate = formData.get("date") as string;
  const evTime = formData.get("time_start") as string;
  const evLocation = formData.get("location") as string;
  const evPublished = formData.get("is_published") !== "off";

  // Valeurs AVANT modification (pour détecter un changement date/heure/lieu)
  const { data: prev } = await supabase
    .from("events").select("date, time_start, location, is_published").eq("id", id).maybeSingle();

  const { error } = await supabase.from("events").update({
    title:               evTitle,
    description:         formData.get("description") as string || null,
    date:                evDate,
    time_start:          evTime,
    time_end:            formData.get("time_end")    as string || null,
    location:            evLocation,
    capacity:            formData.get("capacity")    ? Number(formData.get("capacity")) : null,
    price_chf:           formData.get("price_chf")   ? Number(formData.get("price_chf")) : 0,
    tags,
    image_url,
    is_public:           formData.get("is_public")    !== "off",
    is_published:        evPublished,
    recurrence_type:     recType,
    recurrence_interval: recType !== "none" ? (Number(formData.get("recurrence_interval")) || 1) : 1,
    recurrence_end_date: recType !== "none" && recType !== "indefinite" ? (formData.get("recurrence_end_date") as string || null) : null,
  }).eq("id", id);

  if (error) return { error: error.message };

  // Date / heure / lieu / publication modifiés → prévenir les inscrits (présences)
  const changed = !!prev && evPublished && (
    prev.date !== evDate ||
    prev.time_start !== evTime ||
    prev.location !== evLocation ||
    prev.is_published !== evPublished
  );
  if (changed) {
    const admin = createAdminClient();
    const { data: attendees } = await admin
      .from("event_attendance").select("user_id").eq("event_id", id);
    const ids = Array.from(new Set((attendees ?? []).map((a: { user_id: string }) => a.user_id)));
    if (ids.length) {
      await notifyMany(ids, {
        type: "event",
        title: `📅 Événement modifié : ${evTitle}`,
        body: "Date, heure ou lieu mis à jour — vérifie les nouvelles informations.",
        link: "/espace-membres/agenda",
      });
    }
  }

  revalidatePath("/");
  revalidatePath("/admin/evenements");
  revalidatePath("/espace-membres/agenda");
  revalidatePath("/espace-membres");
  return { success: true };
}

export async function deleteEvent(id: string) {
  const cms = await getCmsUser();
  if (!cms.ok) return { error: cms.error };
  const { supabase } = cms;
  const { error } = await supabase.from("events").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/");
  revalidatePath("/admin/evenements");
  revalidatePath("/espace-membres/agenda");
  revalidatePath("/espace-membres");
  return { success: true };
}

// ── TEAM MEMBERS ───────────────────────────────────────────────

export async function createTeamMember(formData: FormData) {
  const cms = await getCmsUser();
  if (!cms.ok) return { error: cms.error };
  const { supabase } = cms;

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
    initials:   ((formData.get("initials") as string) || "").toUpperCase(),
    sort_order: Number(formData.get("sort_order") ?? 5),
    avatar_url,
  });

  if (error) return { error: error.message };
  revalidatePath("/");
  revalidatePath("/admin/equipe");
  revalidatePath("/espace-membres/equipe");
  return { success: true };
}

export async function updateTeamMember(id: string, formData: FormData) {
  const cms = await getCmsUser();
  if (!cms.ok) return { error: cms.error };
  const { supabase } = cms;

  const updateData: Record<string, unknown> = {
    name:       formData.get("name")       as string,
    role_label: formData.get("role_label") as string,
    bio:        formData.get("bio")        as string || null,
    initials:   ((formData.get("initials") as string) || "").toUpperCase(),
    sort_order: Number(formData.get("sort_order") ?? 5),
  };

  const photo = formData.get("photo") as File | null;
  if (photo && photo.size > 0) {
    const ext = photo.name.split(".").pop()?.toLowerCase() ?? "jpg";
    const newUrl = await uploadToStorage("team-photos", `team-${id}.${ext}`, photo);
    if (newUrl) updateData.avatar_url = newUrl;
  }

  const { error } = await supabase.from("team_members").update(updateData).eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/");
  revalidatePath("/admin/equipe");
  revalidatePath("/espace-membres/equipe");
  return { success: true };
}

export async function deleteTeamMember(id: string) {
  const cms = await getCmsUser();
  if (!cms.ok) return { error: cms.error };
  const { supabase } = cms;

  const { error } = await supabase.from("team_members").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/");
  revalidatePath("/admin/equipe");
  revalidatePath("/espace-membres/equipe");
  return { success: true };
}

// ── MEMBERS (validation) ────────────────────────────────────────

export async function validateMember(memberId: string) {
  const cms = await getCmsUser();
  if (!cms.ok) return { error: cms.error };
  const { profile, userId } = cms;
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
  const cms = await getCmsUser();
  if (!cms.ok) return { error: cms.error };
  const { profile } = cms;
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
  const cms = await getCmsUser();
  if (!cms.ok) return { error: cms.error };
  const { supabase, userId } = cms;

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
  const cms = await getCmsUser();
  if (!cms.ok) return { error: cms.error };
  const { supabase, profile } = cms;
  const canDelete =
    ["admin", "pasteur"].includes(profile.role as string) ||
    (profile.groups as string[] | null)?.includes("communication") ||
    (profile.groups as string[] | null)?.includes("support");
  if (!canDelete) return { error: "Non autorisé — réservé à Pasteur, Communication, Support ou Admin" };
  const { error } = await supabase.from("testimonials").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/");
  revalidatePath("/admin/temoignages");
  return { success: true };
}

export async function validateTestimonial(id: string) {
  const cms = await getCmsUser();
  if (!cms.ok) return { error: cms.error };
  const admin = createAdminClient();
  const { error } = await admin.from("testimonials")
    .update({ status: "approved", is_published: true })
    .eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/");
  revalidatePath("/admin/temoignages");
  revalidatePath("/espace-membres");
  return { success: true };
}

export async function rejectTestimonial(id: string) {
  const cms = await getCmsUser();
  if (!cms.ok) return { error: cms.error };
  const admin = createAdminClient();
  const { error } = await admin.from("testimonials")
    .update({ status: "rejected", is_published: false })
    .eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/admin/temoignages");
  revalidatePath("/espace-membres");
  return { success: true };
}

export async function submitMemberTestimonial(formData: FormData) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Non authentifié" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, validated, first_name, last_name")
    .eq("id", user.id)
    .single();

  const isAllowed =
    profile?.role === "admin" || profile?.role === "pasteur" ||
    (profile?.role === "membre" && profile?.validated === true);
  if (!isAllowed) return { error: "Accès réservé aux membres validés" };

  const content = ((formData.get("content") as string) ?? "").trim();
  if (content.length < 20) return { error: "Le témoignage est trop court (minimum 20 caractères)" };

  const authorName = ((formData.get("author_name") as string) ?? "").trim() ||
    [profile?.first_name, profile?.last_name].filter(Boolean).join(" ") || "Membre";
  const authorRole = ((formData.get("author_role") as string) ?? "").trim() || null;

  const admin = createAdminClient();
  const { error } = await admin.from("testimonials").insert({
    author_name:  authorName,
    author_role:  authorRole,
    content,
    sort_order:   999,
    is_published: false,
    status:       "pending",
    submitted_by: user.id,
  });

  if (error) return { error: error.message };
  revalidatePath("/espace-membres");
  return { success: true };
}

export async function savePlatformCardMedia(formData: FormData) {
  const cms = await getCmsUser();
  if (!cms.ok) return { error: cms.error };

  const file = formData.get("file") as File | null;
  if (!file || file.size === 0) return { error: "Aucun fichier sélectionné" };
  if (file.size > 10 * 1024 * 1024) return { error: "Fichier trop grand (max 10 Mo)" };

  const cardId  = (formData.get("cardId") as string) || "0";
  const ext     = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
  const url     = await uploadToStorage("media", `plateformes/card-${cardId}-${Date.now()}.${ext}`, file);
  if (!url) return { error: "Erreur lors de l'upload" };

  return { success: true, url };
}

export async function toggleTestimonialPublished(id: string, published: boolean) {
  const cms = await getCmsUser();
  if (!cms.ok) return { error: cms.error };
  const { supabase } = cms;
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
  "social_facebook", "social_instagram", "social_youtube", "social_whatsapp", "social_zoom",
  "social_custom_links",
  "histoire_p1", "histoire_p2", "histoire_citation",
  "histoire_titre", "histoire_titre_em",
  "valeur_1_icon", "valeur_1_titre", "valeur_1_texte",
  "valeur_2_icon", "valeur_2_titre", "valeur_2_texte",
  "valeur_3_icon", "valeur_3_titre", "valeur_3_texte",
  "valeur_4_icon", "valeur_4_titre", "valeur_4_texte",
  "votre_impact_intro",
  "decouvrir_1_text", "decouvrir_2_text", "decouvrir_3_text", "decouvrir_4_text",
  "stats_nations", "stats_touches",
  "about_photo_url", "about_photo_caption",
  // Bannière d'annonce (personnalisable par media/communication/support/admin)
  "announcement_enabled", "announcement_welcome",
  "announcement_show_schedules", "announcement_show_events", "announcement_show_verset",
  // Mode du verset du jour
  "verset_mode", "verset_auto_interval", "verset_manuel_expires_at", "verset_theme", "verset_theme_interval",
] as const;

export async function updateSiteSettings(formData: FormData) {
  const cms = await getCmsUser();
  if (!cms.ok) return { error: cms.error };

  const upserts = ALLOWED_SETTINGS
    .filter((key) => formData.has(key))
    .map((key) => ({ key, value: (formData.get(key) as string) ?? "" }));

  if (!upserts.length) return { error: "Aucun champ" };

  // adminClient pour contourner la RLS (réservée admin/pasteur en écriture)
  // L'autorisation métier est vérifiée par getCmsUser() ci-dessus
  const admin = createAdminClient();
  const { error } = await admin
    .from("site_settings")
    .upsert(upserts, { onConflict: "key" });

  if (error) return { error: error.message };
  revalidatePath("/");
  revalidatePath("/admin/site");
  revalidatePath("/espace-membres");
  return { success: true };
}

// ── PHOTO VITRINE (section À propos) ───────────────────────────

export async function saveVitrinePhoto(formData: FormData) {
  const cms = await getCmsUser();
  if (!cms.ok) return { error: cms.error };
  const { supabase, profile } = cms;

  const canPhoto =
    ["admin", "pasteur"].includes(profile.role as string) ||
    (profile.groups as string[] | null)?.includes("communication") ||
    (profile.groups as string[] | null)?.includes("media");
  if (!canPhoto) return { error: "Non autorisé" };

  const upserts: { key: string; value: string }[] = [];

  const file = formData.get("photo") as File | null;
  const existingUrl = formData.get("url") as string | null;

  if (file && file.size > 0) {
    if (file.size > 5 * 1024 * 1024) return { error: "Fichier trop grand (max 5 Mo)" };
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
    const url = await uploadToStorage("media", `vitrine/about-photo.${ext}`, file);
    if (!url) return { error: "Erreur lors de l'upload" };
    upserts.push({ key: "about_photo_url", value: url });
  } else if (existingUrl && existingUrl.trim()) {
    upserts.push({ key: "about_photo_url", value: existingUrl.trim() });
  }

  const caption = formData.get("caption") as string | null;
  if (caption !== null) {
    upserts.push({ key: "about_photo_caption", value: caption });
  }

  if (upserts.length === 0) return { error: "Aucune modification à enregistrer" };

  const { error } = await supabase
    .from("site_settings")
    .upsert(upserts, { onConflict: "key" });

  if (error) return { error: error.message };
  revalidatePath("/");
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

// ── CITATIONS ──────────────────────────────────────────────────

export async function saveCitation(
  id: string | null,
  payload: { texte: string; auteur: string; role_mention: string; ordre: number }
) {
  const cms = await getCmsUser();
  if (!cms.ok) return { error: cms.error };
  const { userId } = cms;
  const admin = createAdminClient();

  if (id) {
    const { error } = await admin.from("citations")
      .update({ ...payload, updated_at: new Date().toISOString(), updated_by: userId })
      .eq("id", id);
    if (error) return { error: error.message };
  } else {
    const { error } = await admin.from("citations")
      .insert({ ...payload, is_active: false, updated_by: userId });
    if (error) return { error: error.message };
  }

  revalidatePath("/connexion");
  return { success: true };
}

export async function deleteCitationAction(id: string) {
  const cms = await getCmsUser();
  if (!cms.ok) return { error: cms.error };
  const admin = createAdminClient();
  const { error } = await admin.from("citations").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/connexion");
  return { success: true };
}

export async function setActiveCitation(id: string) {
  const cms = await getCmsUser();
  if (!cms.ok) return { error: cms.error };
  const { userId } = cms;
  const admin = createAdminClient();
  await admin.from("citations").update({ is_active: false }).neq("id", id);
  const { error } = await admin.from("citations")
    .update({ is_active: true, updated_at: new Date().toISOString(), updated_by: userId })
    .eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/connexion");
  return { success: true };
}

// ── THEME OVERRIDE ─────────────────────────────────────────────

export async function saveThemeOverride(formData: FormData) {
  const cms = await getCmsUser();
  if (!cms.ok) return { error: cms.error };
  const { supabase } = cms;

  const color = (formData.get("theme_accent_color") as string || "").trim();
  const until = (formData.get("theme_accent_until") as string || "").trim();

  const { error } = await supabase.from("site_settings").upsert([
    { key: "theme_accent_color", value: color },
    { key: "theme_accent_until", value: until },
  ], { onConflict: "key" });

  if (error) return { error: error.message };
  revalidatePath("/");
  revalidatePath("/admin/site");
  revalidatePath("/espace-membres");
  return { success: true };
}
