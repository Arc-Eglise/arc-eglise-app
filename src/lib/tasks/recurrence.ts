/**
 * RRULE simplifié (sous-ensemble iCal) — ADR-002 Phase 4.
 * Supporte FREQ=DAILY|WEEKLY|MONTHLY et INTERVAL=n.
 */
export const RECURRENCE_PRESETS: { value: string; label: string }[] = [
  { value: "",                    label: "Ne pas répéter" },
  { value: "FREQ=DAILY;INTERVAL=1",   label: "Chaque jour" },
  { value: "FREQ=WEEKLY;INTERVAL=1",  label: "Chaque semaine" },
  { value: "FREQ=WEEKLY;INTERVAL=2",  label: "Toutes les 2 semaines" },
  { value: "FREQ=MONTHLY;INTERVAL=1", label: "Chaque mois" },
];

export function recurrenceLabel(rrule: string | null | undefined): string | null {
  if (!rrule) return null;
  return RECURRENCE_PRESETS.find(p => p.value === rrule)?.label ?? rrule;
}

/** Calcule la prochaine occurrence à partir d'un ISO et d'une RRULE. */
export function nextOccurrence(iso: string, rrule: string): string | null {
  const parts = Object.fromEntries(
    rrule.split(";").map(p => p.split("=") as [string, string])
  );
  const interval = parseInt(parts.INTERVAL || "1", 10) || 1;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  switch (parts.FREQ) {
    case "DAILY":   d.setDate(d.getDate() + interval); break;
    case "WEEKLY":  d.setDate(d.getDate() + 7 * interval); break;
    case "MONTHLY": d.setMonth(d.getMonth() + interval); break;
    default: return null;
  }
  return d.toISOString();
}
