import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import BackButton from "@/components/ui/BackButton";
import NotesTachesClient from "./NotesTachesClient";
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

  return (
    <div>
      <BackButton href="/espace-membres" label="Espace membres" className="mb-6" />
      {/* En-tête éditorial (charte Sacred Modernity) */}
      <header className="mb-10">
        <h1 className="font-serif text-[40px] md:text-[48px] leading-tight font-bold text-arc-navy tracking-tight">
          Notes et Tâches
        </h1>
        {citation ? (
          <div className="border-l-4 border-arc-gold pl-6 py-1 mt-5 max-w-2xl">
            <p className="font-serif text-xl md:text-2xl italic text-arc-ink/90 leading-snug">
              &ldquo;{citation.texte}&rdquo;
            </p>
            {citation.auteur && (
              <p className="text-[11px] font-semibold uppercase tracking-widest text-arc-text3 mt-2">{citation.auteur}</p>
            )}
          </div>
        ) : (
          <p className="text-sm text-arc-text2 mt-2">Tes pense-bêtes et ta liste de tâches, au même endroit.</p>
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
      />
    </div>
  );
}
