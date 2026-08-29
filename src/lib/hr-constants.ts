// Constantes RH partagées (module NEUTRE — pas "use server").
// Un fichier "use server" ne peut exporter que des fonctions async ; ces
// constantes doivent donc vivre ici pour être importables côté client.

/** Statuts RH — miroir de la contrainte CHECK de public.hr_attendance. */
export const HR_STATUSES = [
  "present", "absent", "conge", "vacances", "maladie", "distance", "retard",
] as const;
export type HrStatus = (typeof HR_STATUSES)[number];

/** Types déclarables par un membre lui-même (miroir du CHECK hr_declarations). */
export const HR_DECLARABLE_TYPES = ["retard", "absent", "conge", "vacances", "maladie", "distance"] as const;
export type HrDeclarationType = (typeof HR_DECLARABLE_TYPES)[number];

/**
 * Statuts qui doivent être VALIDÉS par un membre de fonction pasteur.
 * (Congé = autorisation officielle de s'absenter ; Vacances = période de repos.)
 */
export const HR_VALIDATED_STATUSES: readonly HrStatus[] = ["conge", "vacances"];
export const needsValidation = (s: string): boolean =>
  (HR_VALIDATED_STATUSES as readonly string[]).includes(s);

/** Le statut « présent » est le seul sans période Départ/Retour. */
export const hasPeriodDates = (s: string): boolean => s !== "present" && s !== "";

/** Distinction pédagogique Congé vs Vacances (affichée en aide). */
export const HR_STATUS_HELP: Partial<Record<HrStatus, string>> = {
  conge:    "Autorisation officielle de s'absenter (ex. maternité, maladie, sans solde). Doit être validé par le pasteur.",
  vacances: "Période de repos / congés payés. Doit être validée par le pasteur.",
};

/** État de validation. */
export type ValidationStatus = "pending" | "approved" | "rejected";
export const VALIDATION_META: Record<ValidationStatus, { label: string; color: string; bg: string }> = {
  pending:  { label: "En attente", color: "#b45309", bg: "#fef3c7" },
  approved: { label: "Validé",     color: "#15803d", bg: "#dcfce7" },
  rejected: { label: "Refusé",     color: "#dc2626", bg: "#fee2e2" },
};
