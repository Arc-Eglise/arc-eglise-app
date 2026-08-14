"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import { notifyUser } from "@/lib/notify";
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
    .or(`owner_id.eq.${user.id},assignee_id.eq.${user.id}`)
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

/**
 * Attribue (ou retire, assigneeId=null) une tâche à un membre.
 * Réservé au propriétaire (RLS + garde owner_id). Notifie l'assigné.
 */
export async function assignTask(id: string, assigneeId: string | null) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Non authentifié" as const };

  // ── Contrôle directionnel des droits d'attribution (sécurité serveur) ──────
  //   • manager de groupe → membres de SES groupes ; • pasteur/support/admin → tous.
  if (assigneeId) {
    const { data: me } = await supabase
      .from("profiles").select("role, groups, managed_groups").eq("id", user.id).single();
    const role = me?.role ?? "visiteur";
    const myGroups: string[] = me?.groups ?? [];
    const managedGroups: string[] = me?.managed_groups ?? [];
    const canAssignAnyone = ["admin", "pasteur"].includes(role) || myGroups.includes("support");

    if (!canAssignAnyone) {
      if (managedGroups.length === 0) return { error: "Non autorisé à attribuer des tâches" as const };
      // Vérifie que la cible appartient à un groupe géré (lecture admin des groupes)
      const admin = createAdminClient();
      const { data: target } = await admin
        .from("profiles").select("groups").eq("id", assigneeId).maybeSingle();
      const targetGroups: string[] = (target?.groups as string[] | null) ?? [];
      const allowed = targetGroups.some((g) => managedGroups.includes(g));
      if (!allowed) return { error: "Vous ne pouvez attribuer qu'aux membres de vos groupes" as const };
    }
  }

  const { data: task, error } = await supabase
    .from("tasks")
    .update({ assignee_id: assigneeId })
    .eq("id", id)
    .eq("owner_id", user.id)
    .select("title")
    .single();

  if (error) return { error: error.message };

  // Notifie le membre nouvellement assigné (pas soi-même)
  if (assigneeId && assigneeId !== user.id) {
    await notifyUser({
      userId: assigneeId,
      type: "system",
      title: "📌 Tâche attribuée",
      body: `Une tâche vous a été attribuée : « ${(task?.title as string) ?? "tâche"} ».`,
      link: PATH,
    }).catch(() => {});
  }

  revalidatePath(PATH);
  return { success: true as const };
}

/**
 * Changement de statut par l'ASSIGNÉ (pas le propriétaire).
 * Passe par le service role après vérification stricte `assignee_id = auth.uid()`,
 * et se limite au statut/completion — l'assigné ne peut rien modifier d'autre.
 */
export async function setAssignedStatus(taskId: string, status: TaskStatus) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Non authentifié" as const };
  if (!TASK_STATUSES.includes(status)) return { error: "Statut invalide" as const };

  const admin = createAdminClient();
  const { data: task } = await admin
    .from("tasks").select("assignee_id, owner_id").eq("id", taskId).maybeSingle();
  if (!task) return { error: "Tâche introuvable" as const };
  if (task.assignee_id !== user.id) return { error: "Non autorisé" as const };

  const { error } = await admin
    .from("tasks")
    .update({
      status,
      completed_at: status === "termine" ? new Date().toISOString() : null,
      ...(status !== "termine" ? { reminded_at: null } : {}),
    })
    .eq("id", taskId)
    .eq("assignee_id", user.id);

  if (error) return { error: error.message };

  // Informe le propriétaire de l'avancement
  if (task.owner_id && task.owner_id !== user.id) {
    await notifyUser({
      userId: task.owner_id as string, type: "system",
      title: "🔄 Tâche mise à jour",
      body: `Une tâche que vous avez attribuée est passée à « ${status} ».`,
      link: PATH,
    }).catch(() => {});
  }

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
