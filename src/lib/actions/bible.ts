"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function saveBibleNote(formData: FormData) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Non authentifié" };

  const verseRef  = (formData.get("verse_ref") as string)?.trim();
  const verseText = (formData.get("verse_text") as string)?.trim() ?? null;
  const note      = (formData.get("note") as string)?.trim();
  const bibleId   = (formData.get("bible_id") as string)?.trim() ?? null;

  if (!verseRef || !note) return { error: "Données manquantes" };

  const { error } = await supabase.from("bible_notes").upsert(
    { user_id: user.id, verse_ref: verseRef, verse_text: verseText, note, bible_id: bibleId, updated_at: new Date().toISOString() },
    { onConflict: "user_id,verse_ref" }
  );
  if (error) return { error: error.message };
  revalidatePath("/espace-membres/bible");
  return { success: true };
}

export async function deleteBibleNote(noteId: string) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Non authentifié" };
  const { error } = await supabase.from("bible_notes").delete().eq("id", noteId).eq("user_id", user.id);
  if (error) return { error: error.message };
  revalidatePath("/espace-membres/bible");
  return { success: true };
}

export async function saveBookmark(verseRef: string, label?: string) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Non authentifié" };
  const { error } = await supabase.from("bible_bookmarks").upsert(
    { user_id: user.id, verse_ref: verseRef, label: label ?? null },
    { onConflict: "user_id,verse_ref" }
  );
  if (error) return { error: error.message };
  return { success: true };
}

export async function removeBookmark(verseRef: string) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Non authentifié" };
  await supabase.from("bible_bookmarks").delete().eq("user_id", user.id).eq("verse_ref", verseRef);
  return { success: true };
}

export async function saveProgress(bibleId: string, chapterId: string) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from("bible_progress").upsert(
    { user_id: user.id, bible_id: bibleId, chapter_id: chapterId, updated_at: new Date().toISOString() },
    { onConflict: "user_id" }
  );
}
