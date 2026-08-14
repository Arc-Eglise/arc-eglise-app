// Constantes & types Formations — module NEUTRE (pas "use server"),
// importable côté client. (Un fichier "use server" ne peut exporter que des
// fonctions async.)

export const FORMATION_STATUSES = ["sera_present", "present", "sera_absent", "absent"] as const;
export type FormationStatus = (typeof FORMATION_STATUSES)[number];

export const WEEKDAYS = ["lun", "mar", "mer", "jeu", "ven", "sam", "dim"] as const;
export const DAY_LABELS: Record<string, string> = {
  lun: "Lun", mar: "Mar", mer: "Mer", jeu: "Jeu", ven: "Ven", sam: "Sam", dim: "Dim",
};

/** Lieu affiché : NULL/vide ⇒ Église ARC (siège par défaut). */
export const DEFAULT_FORMATION_LOCATION = "Église ARC";
export const formationLocation = (loc: string | null | undefined) =>
  (loc && loc.trim()) ? loc.trim() : DEFAULT_FORMATION_LOCATION;

export interface Formation {
  id: string;
  title: string;
  description: string | null;
  start_date: string | null;
  end_date: string | null;
  days: string[] | null;
  time_start: string | null;
  time_end: string | null;
  formateur_member_id: string | null;
  formateur_externe: string | null;
  recurring: boolean;
  total_days: number | null;
  location: string | null;
  created_at: string;
}
export const ENROLLMENT_STATUSES = ["pending", "active"] as const;
export type EnrollmentStatus = (typeof ENROLLMENT_STATUSES)[number];

export interface FormationEnrollment {
  id: string;
  formation_id: string;
  member_id: string;
  enrolled_at: string;
  days_completed: number;
  status: EnrollmentStatus;
  start_from_date: string | null;
}
export interface FormationAttendance {
  formation_id: string;
  member_id: string;
  status: FormationStatus;
}

/**
 * Calcule les dates de séances d'une formation à partir de son planning
 * (date de début + jours de la semaine choisis). Déterministe, pur (utilisable
 * client & serveur).
 *   • Récurrente OU total_days défini → on génère jusqu'à `total_days` séances.
 *   • Sinon → borné par end_date (ou 12 semaines de sécurité).
 * Renvoie des dates ISO "YYYY-MM-DD" triées croissantes.
 */
const ISO_WEEKDAY: Record<string, number> = { lun: 1, mar: 2, mer: 3, jeu: 4, ven: 5, sam: 6, dim: 7 };
const pad = (n: number) => String(n).padStart(2, "0");
const toISO = (d: Date) => `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;

export function computeSessionDates(
  f: Pick<Formation, "start_date" | "end_date" | "days" | "total_days" | "recurring">,
  opts: { from?: string } = {},
): string[] {
  const days = (f.days ?? []).map((d) => ISO_WEEKDAY[d]).filter(Boolean);
  if (!f.start_date || days.length === 0) return [];

  const wanted = new Set(days);
  const start = new Date(`${f.start_date}T00:00:00Z`);
  const hardCap = 366; // sécurité anti-boucle (1 an de jours parcourus)
  const target = f.total_days && f.total_days > 0 ? f.total_days : null;
  const end = f.end_date ? new Date(`${f.end_date}T00:00:00Z`) : null;

  const out: string[] = [];
  const cursor = new Date(start);
  let walked = 0;
  const maxSessions = target ?? 60; // si aucun objectif, borne raisonnable
  while (out.length < maxSessions && walked < (target ? hardCap * 2 : hardCap)) {
    if (end && cursor > end) break;
    // ISO weekday: dimanche = 7
    const wd = cursor.getUTCDay() === 0 ? 7 : cursor.getUTCDay();
    if (wanted.has(wd)) out.push(toISO(cursor));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
    walked++;
  }

  if (opts.from) return out.filter((d) => d >= opts.from!);
  return out;
}
