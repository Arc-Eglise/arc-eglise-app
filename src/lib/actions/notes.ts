"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { NOTE_COLORS, type NoteColor, type NoteRow, type CreateNoteInput } from "@/lib/notes-taches/types";

const PATH = "/espace-membres/notes-taches";

export async function listNotes() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Non authentifié" as const };

  const { data, error } = await supabase
    .from("notes")
    .select("*")
    .is("archived_at", null)
    .order("is_pinned", { ascending: false })
    .order("position", { ascending: true })
    .order("updated_at", { ascending: false });

  if (error) return { error: error.message };
  return { data: (data ?? []) as NoteRow[] };
}

export async function createNote(input: CreateNoteInput) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Non authentifié" as const };

  const color = (input.color && NOTE_COLORS.includes(input.color)) ? input.color : "yellow";

  const { data, error } = await supabase
    .from("notes")
    .insert({
      owner_id:        user.id,
      title:           (input.title ?? "").slice(0, 200),
      body:            (input.body ?? "").slice(0, 10000),
      color,
      reference:       input.reference?.slice(0, 100) || null,
      source_kind:     input.source_kind ?? null,
      source_ref_id:   input.source_ref_id ?? null,
      source_snapshot: input.source_snapshot ?? null,
    })
    .select("*")
    .single();

  if (error) return { error: error.message };
  revalidatePath(PATH);
  return { data: data as NoteRow };
}

export async function updateNote(
  id: string,
  patch: Partial<Pick<NoteRow, "title" | "body" | "color" | "reference" | "is_pinned" | "position">>,
) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Non authentifié" as const };

  const clean: Record<string, unknown> = {};
  if (patch.title     !== undefined) clean.title     = patch.title.slice(0, 200);
  if (patch.body      !== undefined) clean.body      = patch.body.slice(0, 10000);
  if (patch.reference !== undefined) clean.reference = patch.reference?.slice(0, 100) || null;
  if (patch.is_pinned !== undefined) clean.is_pinned = patch.is_pinned;
  if (patch.position  !== undefined) clean.position  = patch.position;
  if (patch.color     !== undefined && NOTE_COLORS.includes(patch.color as NoteColor)) {
    clean.color = patch.color;
  }
  if (Object.keys(clean).length === 0) return { data: null };

  const { error } = await supabase
    .from("notes")
    .update(clean)
    .eq("id", id)
    .eq("owner_id", user.id);

  if (error) return { error: error.message };
  revalidatePath(PATH);
  return { success: true as const };
}

export async function deleteNote(id: string) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Non authentifié" as const };

  const { error } = await supabase
    .from("notes")
    .delete()
    .eq("id", id)
    .eq("owner_id", user.id);

  if (error) return { error: error.message };
  revalidatePath(PATH);
  return { success: true as const };
}
