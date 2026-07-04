import { NextRequest, NextResponse } from "next/server"
import { requireAuth, unauthorizedResponse, badRequestResponse } from "@/lib/bible-ai"
import { logActivityAsync, type ActivityAction } from "@/lib/activity"

const VALID_ACTIONS = new Set<ActivityAction>([
  "bible_read","ai_chat","journal_entry","plan_day_completed","prayer_request",
  "note_created","bookmark_added","meditation","theology_query","search",
  "media_saved","recommendation_clicked",
])

export async function POST(req: NextRequest) {
  let userId: string
  try { userId = await requireAuth() } catch { return unauthorizedResponse() }

  const body = await req.json().catch(() => null)
  if (!body?.action) return badRequestResponse("action requise")
  if (!VALID_ACTIONS.has(body.action)) return badRequestResponse("action invalide")

  logActivityAsync(userId, body.action, {
    resourceType:  body.resource_type,
    resourceId:    body.resource_id,
    resourceLabel: body.resource_label,
    durationSec:   body.duration_sec,
    metadata:      body.metadata,
  })

  return NextResponse.json({ ok: true })
}
