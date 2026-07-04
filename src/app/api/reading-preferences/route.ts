import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { READING_DEFAULTS } from "@/types/reading-preferences"
import type { ReadingPreferences } from "@/types/reading-preferences"

const ALLOWED_KEYS: (keyof ReadingPreferences)[] = [
  "font_size_px", "line_height", "font_family", "high_contrast", "low_vision",
]

export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 })

  const { data } = await supabase
    .from("reading_preferences")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle()

  return NextResponse.json({
    prefs: data ? { ...READING_DEFAULTS, ...data } : { ...READING_DEFAULTS },
  })
}

export async function PATCH(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 })

  const body = await req.json().catch(() => null)
  if (!body) return NextResponse.json({ error: "JSON invalide" }, { status: 400 })

  const patch = Object.fromEntries(
    Object.entries(body).filter(([k]) => ALLOWED_KEYS.includes(k as keyof ReadingPreferences))
  )

  const { error } = await supabase
    .from("reading_preferences")
    .upsert({ user_id: user.id, ...patch })

  if (error) {
    // Table might not exist yet — fail silently, prefs stored only in localStorage
    return NextResponse.json({ ok: true, warn: error.message })
  }

  return NextResponse.json({ ok: true })
}
