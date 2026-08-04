/**
 * Constantes & types partagés client/serveur pour Notes & Tâches (ADR-002).
 *
 * ⚠️ Ce module N'EST PAS "use server" : les fichiers d'actions (`notes.ts`,
 * `tasks.ts`, `tags.ts`, `shares.ts`) sont "use server" et ne peuvent donc
 * exporter QUE des fonctions async. Toute constante/type consommé par un
 * composant client doit vivre ici, sinon Next.js transforme l'export en
 * référence serveur (ex. NOTE_COLORS devient un proxy → `.map is not a function`).
 */

/* ── Notes ─────────────────────────────────────────────────────────────── */
export const NOTE_COLORS = [
  "yellow", "green", "pink", "blue", "purple", "orange", "gray", "white",
] as const;
export type NoteColor = (typeof NOTE_COLORS)[number];

export type NoteRow = {
  id: string;
  owner_id: string;
  title: string;
  body: string;
  color: string;
  is_pinned: boolean;
  position: number;
  reference: string | null;
  source_kind: string | null;
  source_snapshot: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
};

export type CreateNoteInput = {
  title?: string;
  body?: string;
  color?: NoteColor;
  reference?: string | null;
  source_kind?: string | null;
  source_ref_id?: string | null;
  source_snapshot?: Record<string, unknown> | null;
};

/* ── Tâches ────────────────────────────────────────────────────────────── */
export const TASK_STATUSES   = ["a_faire", "en_cours", "bloque", "termine"] as const;
export const TASK_PRIORITIES = ["haute", "moyenne", "basse"] as const;
export type TaskStatus   = (typeof TASK_STATUSES)[number];
export type TaskPriority = (typeof TASK_PRIORITIES)[number];

export type TaskRow = {
  id: string;
  owner_id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  due_at: string | null;
  remind_at: string | null;
  reminded_at: string | null;
  recurrence: string | null;
  parent_task_id: string | null;
  position: number;
  source_kind: string | null;
  source_snapshot: Record<string, unknown> | null;
  assignee_id: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
};

export type CreateTaskInput = {
  title: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  due_at?: string | null;
  remind_at?: string | null;
  recurrence?: string | null;
  parent_task_id?: string | null;
  source_kind?: string | null;
  source_ref_id?: string | null;
  source_snapshot?: Record<string, unknown> | null;
};

/* ── Étiquettes ────────────────────────────────────────────────────────── */
export const TAG_COLORS = ["gray", "blue", "green", "pink", "purple", "orange"] as const;
export type TagColor = (typeof TAG_COLORS)[number];
export type TagRow = { id: string; owner_id: string; label: string; color: string; created_at: string };

/* ── Partage ───────────────────────────────────────────────────────────── */
export type ResourceType = "note" | "task";
export type ShareRow = {
  id: string;
  resource_type: ResourceType;
  resource_id: string;
  shared_by: string;
  target_kind: "user" | "function";
  shared_with_id: string | null;
  shared_with_function: string | null;
  permission: string;
  status: string;
  message: string | null;
  created_at: string;
  responded_at: string | null;
};

/** Libellés des 13 fonctions (référentiel ADR-001). */
export const FUNCTION_LABELS: Record<string, string> = {
  pasteur: "Pasteur", chorale: "Chorale", media: "Équipe Média",
  social: "Social & Hospitalité", hospitalite: "Hospitalité",
  sanitaire: "Sanitaire & Propreté", finance: "Finance", support: "Support",
  jeunesse: "La Jeunesse", femmes: "Groupe des Femmes", ecodim: "Écodim",
  suivi: "Suivi", communication: "Communication",
};
