"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { nextOccurrence } from "@/lib/tasks/recurrence";
import {
  TASK_STATUSES, TASK_PRIORITIES,
  type TaskStatus, type TaskPriority, type TaskRow, type CreateTaskInput,
} from "@/lib/notes-taches/types";

const PATH = "/espace-membres/notes-taches";

export async function listTasks() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Non authentifié" as const };

  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .eq("owner_id", user.id)
    .order("position", { ascending: true })
    .order("created_at", { ascending: false });

  if (error) return { error: error.message };
  return { data: (data ?? []) as TaskRow[] };
}

export async function createTask(input: CreateTaskInput) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Non authentifié" as const };

  const title = (input.title ?? "").trim();
  if (!title) return { error: "Titre requis" as const };

  const status   = TASK_STATUSES.includes(input.status as TaskStatus)     ? input.status   : "a_faire";
  const priority = TASK_PRIORITIES.includes(input.priority as TaskPriority) ? input.priority : "moyenne";

  const { data, error } = await supabase
    .from("tasks")
    .insert({
      owner_id:        user.id,
      title:           title.slice(0, 300),
      description:     (input.description ?? "").slice(0, 5000),
      status,
      priority,
      due_at:          input.due_at ?? null,
      remind_at:       input.remind_at ?? null,
      recurrence:      input.recurrence || null,
      parent_task_id:  input.parent_task_id ?? null,
      source_kind:     input.source_kind ?? null,
      source_ref_id:   input.source_ref_id ?? null,
      source_snapshot: input.source_snapshot ?? null,
      completed_at:    status === "termine" ? new Date().toISOString() : null,
    })
    .select("*")
    .single();

  if (error) return { error: error.message };
  revalidatePath(PATH);
  return { data: data as TaskRow };
}

export async function updateTask(
  id: string,
  patch: Partial<Pick<TaskRow, "title" | "description" | "status" | "priority" | "due_at" | "remind_at" | "recurrence" | "position">>,
) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Non authentifié" as const };

  const clean: Record<string, unknown> = {};
  if (patch.title       !== undefined) clean.title       = patch.title.slice(0, 300);
  if (patch.description !== undefined) clean.description = patch.description.slice(0, 5000);
  if (patch.due_at      !== undefined) clean.due_at      = patch.due_at || null;
  if (patch.remind_at   !== undefined) clean.remind_at   = patch.remind_at || null;
  if (patch.recurrence  !== undefined) clean.recurrence  = patch.recurrence || null;
  if (patch.position    !== undefined) clean.position    = patch.position;
  if (patch.priority    !== undefined && TASK_PRIORITIES.includes(patch.priority as TaskPriority)) {
    clean.priority = patch.priority;
  }
  if (patch.status !== undefined && TASK_STATUSES.includes(patch.status as TaskStatus)) {
    // Tâche récurrente marquée terminée → on reporte à la prochaine occurrence
    if (patch.status === "termine") {
      const { data: cur } = await supabase
        .from("tasks").select("recurrence, due_at, remind_at")
        .eq("id", id).eq("owner_id", user.id).maybeSingle();
      const rec = cur?.recurrence as string | null;
      if (rec) {
        const base = (cur?.due_at as string | null) ?? new Date().toISOString();
        const nextDue = nextOccurrence(base, rec);
        if (nextDue) {
          const nextRemind = cur?.remind_at
            ? nextOccurrence(cur.remind_at as string, rec)
            : null;
          const { error: rErr } = await supabase.from("tasks").update({
            status: "a_faire", completed_at: null,
            due_at: nextDue, remind_at: nextRemind, reminded_at: null,
          }).eq("id", id).eq("owner_id", user.id);
          if (rErr) return { error: rErr.message };
          revalidatePath(PATH);
          return { success: true as const, recurred: true, nextDue };
        }
      }
    }
    clean.status = patch.status;
    clean.completed_at = patch.status === "termine" ? new Date().toISOString() : null;
    if (patch.status !== "termine") clean.reminded_at = null; // réactive le rappel si on rouvre
  }
  if (Object.keys(clean).length === 0) return { data: null };

  const { error } = await supabase
    .from("tasks")
    .update(clean)
    .eq("id", id)
    .eq("owner_id", user.id);

  if (error) return { error: error.message };
  revalidatePath(PATH);
  return { success: true as const };
}

export async function deleteTask(id: string) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Non authentifié" as const };

  // les sous-tâches partent en cascade (FK on delete cascade)
  const { error } = await supabase
    .from("tasks")
    .delete()
    .eq("id", id)
    .eq("owner_id", user.id);

  if (error) return { error: error.message };
  revalidatePath(PATH);
  return { success: true as const };
}
