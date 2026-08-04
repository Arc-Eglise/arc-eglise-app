import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import BackButton from "@/components/ui/BackButton";
import NotesTachesClient from "./NotesTachesClient";
import type { NoteRow } from "@/lib/actions/notes";
import type { TaskRow } from "@/lib/actions/tasks";
import type { TagRow } from "@/lib/actions/tags";

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

  const initialTab =
    searchParams?.tab === "taches"   ? "taches" :
    searchParams?.tab === "partages" ? "partages" : "notes";

  return (
    <div>
      <BackButton href="/espace-membres" label="Espace membres" className="mb-5" />
      <div className="mb-4">
        <h1 className="font-serif text-3xl font-bold text-arc-navy">Notes &amp; Tâches</h1>
        <p className="text-sm text-arc-text2 mt-0.5">
          Tes pense-bêtes et ta liste de tâches, au même endroit.
        </p>
      </div>
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
