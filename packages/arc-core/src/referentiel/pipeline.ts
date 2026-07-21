// Référentiel officiel — Pipeline pastoral (ADR-001 v2.1)
// Source de vérité unique : 5 étapes, ordre de progression

export const PIPELINE_STAGES = [
  "visiteur",
  "integration",
  "actif",
  "formation",
  "responsable",
] as const

export type PipelineStage = typeof PIPELINE_STAGES[number]

export const PIPELINE_LABELS: Record<PipelineStage, string> = {
  visiteur:     "Visiteur",
  integration:  "Intégration",
  actif:        "Actif",
  formation:    "Formation",
  responsable:  "Responsable",
}

export const PIPELINE_ORDER: Record<PipelineStage, number> = {
  visiteur:    0,
  integration: 1,
  actif:       2,
  formation:   3,
  responsable: 4,
}

export function isPipelineStageValide(value: unknown): value is PipelineStage {
  return PIPELINE_STAGES.includes(value as PipelineStage)
}

/** Retourne vrai si `from` peut progresser vers `to` (sens unique) */
export function peutProgresserVers(from: PipelineStage, to: PipelineStage): boolean {
  return PIPELINE_ORDER[to] > PIPELINE_ORDER[from]
}
