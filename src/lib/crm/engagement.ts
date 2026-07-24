// CRM pastoral — Scoring d'engagement & détection de désengagement (Phase 4)
// Logique PURE (aucune I/O) : prend des signaux d'activité, renvoie un score
// 0-100 + un statut. Réutilisable côté fiche membre et côté liste d'alertes.

export type EngagementStatus = "engage" | "a_surveiller" | "decrochage" | "inactif";

export interface EngagementSignals {
  lastAttendanceAt?: string | null;   // date de la dernière présence
  attendanceCount90d?: number;         // nb de présences sur 90 jours
  lastInteractionAt?: string | null;   // dernier contact pastoral (journal)
}

export interface EngagementResult {
  score: number;                       // 0-100
  status: EngagementStatus;
  reason: string;
  weeksSinceAttendance: number | null;
}

const WEEK_MS = 7 * 24 * 3600 * 1000;

function weeksSince(iso: string | null | undefined, nowMs: number): number | null {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return null;
  return Math.max(0, Math.floor((nowMs - t) / WEEK_MS));
}

/**
 * Calcule l'engagement d'un membre. Déterministe et pur.
 * La présence (récence) est le signal principal ; la fréquence et un contact
 * pastoral récent atténuent le risque.
 */
export function computeEngagement(s: EngagementSignals, nowMs: number = Date.now()): EngagementResult {
  const wAtt = weeksSince(s.lastAttendanceAt, nowMs);
  const wInt = weeksSince(s.lastInteractionAt, nowMs);
  const count90 = s.attendanceCount90d ?? 0;

  let score: number;
  if (wAtt === null)      score = 15;   // jamais vu en présence
  else if (wAtt <= 1)     score = 100;
  else if (wAtt <= 3)     score = 85;
  else if (wAtt <= 6)     score = 60;
  else if (wAtt <= 12)    score = 35;
  else                    score = 15;

  score += Math.min(15, count90 * 2);          // bonus fréquence (max +15)
  if (wInt !== null && wInt <= 4) score += 8;  // contact pastoral récent

  score = Math.max(0, Math.min(100, Math.round(score)));

  let status: EngagementStatus;
  if (score >= 70)      status = "engage";
  else if (score >= 45) status = "a_surveiller";
  else if (score >= 25) status = "decrochage";
  else                  status = "inactif";

  const reason =
    wAtt === null ? "Aucune présence enregistrée"
    : wAtt <= 1    ? "Présent cette semaine"
    : `Dernière présence il y a ${wAtt} sem.`;

  return { score, status, reason, weeksSinceAttendance: wAtt };
}

export const ENGAGEMENT_META: Record<EngagementStatus, { label: string; emoji: string; cls: string; dot: string }> = {
  engage:       { label: "Engagé",       emoji: "🟢", cls: "bg-green-50 text-green-700 border-green-200",  dot: "bg-green-500" },
  a_surveiller: { label: "À surveiller", emoji: "🟡", cls: "bg-amber-50 text-amber-700 border-amber-200",  dot: "bg-amber-500" },
  decrochage:   { label: "Décrochage",   emoji: "🟠", cls: "bg-orange-50 text-orange-700 border-orange-200", dot: "bg-orange-500" },
  inactif:      { label: "Inactif",      emoji: "🔴", cls: "bg-red-50 text-red-700 border-red-200",        dot: "bg-red-500" },
};

/** Statuts considérés comme « à risque » (nécessitant une action pastorale). */
export const AT_RISK_STATUSES: EngagementStatus[] = ["a_surveiller", "decrochage", "inactif"];
