import { NextResponse } from "next/server"
import { requireAuth, unauthorizedResponse } from "@/lib/bible-ai"
import { getActivitySummary } from "@/lib/activity"

export async function GET() {
  let userId: string
  try { userId = await requireAuth() } catch { return unauthorizedResponse() }

  const summary = await getActivitySummary(userId)
  return NextResponse.json(summary)
}
