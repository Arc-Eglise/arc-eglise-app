// CRM pastoral — Support & doléances : priorité, SLA, satisfaction (Phase 7)
// Logique PURE, partagée entre la page admin et la page membre.

export type Priority = "basse" | "normale" | "haute" | "urgente";

export const PRIORITY_META: Record<Priority, { label: string; cls: string; order: number; slaDays: number }> = {
  urgente: { label: "Urgente", cls: "text-red-700 bg-red-50 border-red-200",       order: 0, slaDays: 1  },
  haute:   { label: "Haute",   cls: "text-orange-700 bg-orange-50 border-orange-200", order: 1, slaDays: 3  },
  normale: { label: "Normale", cls: "text-sky-700 bg-sky-50 border-sky-200",        order: 2, slaDays: 7  },
  basse:   { label: "Basse",   cls: "text-gray-600 bg-gray-50 border-gray-200",     order: 3, slaDays: 14 },
};

export const PRIORITIES: Priority[] = ["urgente", "haute", "normale", "basse"];

export function priorityMeta(p: string | null | undefined) {
  return PRIORITY_META[(p as Priority) ?? "normale"] ?? PRIORITY_META.normale;
}

// Statuts considérés comme « résolus » (double vocabulaire toléré : fr + en).
const RESOLVED = new Set(["resolu", "resolved", "closed", "clos"]);
export function isResolvedStatus(status: string | null | undefined): boolean {
  return RESOLVED.has((status ?? "").toLowerCase());
}

const DAY_MS = 24 * 3600 * 1000;

export interface SlaResult {
  ageDays: number;
  targetDays: number;
  breached: boolean;      // délai SLA dépassé (ticket encore ouvert)
  remainingDays: number;  // jours restants avant échéance (négatif si dépassé)
}

/**
 * Calcule l'état SLA d'un ticket ouvert. Pour un ticket résolu, renvoie
 * breached=false (le SLA ne court plus).
 */
export function computeSla(
  createdAt: string,
  priority: string | null | undefined,
  status: string | null | undefined,
  nowMs: number = Date.now(),
): SlaResult {
  const target = priorityMeta(priority).slaDays;
  const ageMs = Math.max(0, nowMs - new Date(createdAt).getTime());
  const ageDays = Math.floor(ageMs / DAY_MS);
  const resolved = isResolvedStatus(status);
  const remainingDays = target - ageDays;
  return {
    ageDays,
    targetDays: target,
    breached: !resolved && ageDays > target,
    remainingDays,
  };
}
