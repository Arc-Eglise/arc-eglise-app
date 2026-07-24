import { createAdminClient } from "@/lib/supabase/admin"
import type { QuotaCategory } from "@arc/core"

export interface ApiLogEntry {
  requestId:  string
  method:     string
  path:       string
  status:     number
  category:   QuotaCategory
  userId:     string | null
  ip:         string | null
  durationMs: number
}

/**
 * Journalise une requête du socle sur deux canaux :
 *  1. log structuré sur stdout (capté par Vercel) — fiable, latence nulle.
 *  2. insertion best-effort dans `arc_api_log` — durable, NON bloquante et jamais
 *     propagée en erreur (la journalisation ne doit jamais casser la requête).
 */
export function logApiRequest(entry: ApiLogEntry): void {
  console.log("[api/v1]", JSON.stringify(entry))

  void persist(entry).catch(err =>
    console.warn("[api/v1] journalisation DB échouée:", (err as Error)?.message)
  )
}

async function persist(entry: ApiLogEntry): Promise<void> {
  const supabase = createAdminClient()
  const { error } = await supabase.from("arc_api_log").insert({
    request_id:  entry.requestId,
    method:      entry.method,
    path:        entry.path,
    status:      entry.status,
    category:    entry.category,
    user_id:     entry.userId,
    ip:          entry.ip,
    duration_ms: entry.durationMs,
  })
  if (error) throw error
}
