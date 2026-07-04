import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getSpiritualProfile, upsertSpiritualProfile } from "@/lib/spiritual-profile"
import type { SpiritualProfilePatch } from "@/types/spiritual-profile"

const ALLOWED_PATCH_FIELDS = new Set<string>([
  "profile_type", "profile_age_range", "theological_focus",
  "fav_ot_books", "fav_nt_books", "prayer_topics", "study_themes",
  "spiritual_maturity", "growth_areas", "show_dashboard",
  "enable_coach", "daily_goal_minutes",
])

export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 })

  const profile = await getSpiritualProfile(user.id)
  return NextResponse.json({ profile })
}

export async function PATCH(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 })

  let body: Record<string, unknown>
  try { body = await req.json() } catch {
    return NextResponse.json({ error: "JSON invalide" }, { status: 400 })
  }

  const patch = Object.fromEntries(
    Object.entries(body).filter(([k]) => ALLOWED_PATCH_FIELDS.has(k))
  ) as SpiritualProfilePatch

  if (Object.keys(patch).length === 0)
    return NextResponse.json({ error: "Aucun champ modifiable fourni" }, { status: 400 })

  await upsertSpiritualProfile(user.id, patch)
  return NextResponse.json({ ok: true })
}
