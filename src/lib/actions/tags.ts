"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

const PATH = "/espace-membres/notes-taches";

export const TAG_COLORS = ["gray", "blue", "green", "pink", "purple", "orange"] as const;
export type TagColor = (typeof TAG_COLORS)[number];

export type TagRow = { id: string; owner_id: string; label: string; color: string; created_at: string };

export async function listTags() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Non authentifié" as const };
  const { data, error } = await supabase
    .from("user_tags").select("*").eq("owner_id", user.id).order("label", { ascending: true });
  if (error) return { error: error.message };
  return { data: (data ?? []) as TagRow[] };
}

export async function createTag(label: string, color: TagColor = "gray") {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Non authentifié" as const };
  const clean = label.trim().slice(0, 40);
  if (!clean) return { error: "Libellé requis" as const };
  const safeColor = TAG_COLORS.includes(color) ? color : "gray";
  // upsert sur (owner_id, label) pour éviter les doublons
  const { data, error } = await supabase
    .from("user_tags")
    .upsert({ owner_id: user.id, label: clean, color: safeColor }, { onConflict: "owner_id,label" })
    .select("*").single();
  if (error) return { error: error.message };
  revalidatePath(PATH);
  return { data: data as TagRow };
}

export async function deleteTag(id: string) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Non authentifié" as const };
  const { error } = await supabase.from("user_tags").delete().eq("id", id).eq("owner_id", user.id);
  if (error) return { error: error.message };
  revalidatePath(PATH);
  return { success: true as const };
}

/** Attache/détache un tag à une note ou une tâche. RLS vérifie la propriété. */
export async function attachTag(kind: "note" | "task", resourceId: string, tagId: string) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Non authentifié" as const };
  const table = kind === "note" ? "note_tags" : "task_tags";
  const col   = kind === "note" ? "note_id"   : "task_id";
  const { error } = await supabase.from(table).upsert({ [col]: resourceId, tag_id: tagId });
  if (error) return { error: error.message };
  revalidatePath(PATH);
  return { success: true as const };
}

export async function detachTag(kind: "note" | "task", resourceId: string, tagId: string) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Non authentifié" as const };
  const table = kind === "note" ? "note_tags" : "task_tags";
  const col   = kind === "note" ? "note_id"   : "task_id";
  const { error } = await supabase.from(table).delete().eq(col, resourceId).eq("tag_id", tagId);
  if (error) return { error: error.message };
  revalidatePath(PATH);
  return { success: true as const };
}
