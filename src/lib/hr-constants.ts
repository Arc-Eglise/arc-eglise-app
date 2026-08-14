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
