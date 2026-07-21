import { NextResponse } from "next/server"
import {
  ROLES, ROLE_LABELS,
  FONCTIONS, FONCTION_LABELS,
  PIPELINE_STAGES, PIPELINE_LABELS, PIPELINE_ORDER,
} from "@arc/core"

export const dynamic = "force-static"

export function GET() {
  return NextResponse.json({
    data: {
      roles: ROLES.map(r => ({ slug: r, label: ROLE_LABELS[r] })),
      fonctions: FONCTIONS.map(f => ({ slug: f, label: FONCTION_LABELS[f] })),
      pipeline: PIPELINE_STAGES
        .slice()
        .sort((a, b) => PIPELINE_ORDER[a] - PIPELINE_ORDER[b])
        .map(s => ({ slug: s, label: PIPELINE_LABELS[s], order: PIPELINE_ORDER[s] })),
    },
    meta: {
      version: "v1",
      source:  "@arc/core",
      counts:  { roles: ROLES.length, fonctions: FONCTIONS.length, pipeline: PIPELINE_STAGES.length },
    },
  })
}
