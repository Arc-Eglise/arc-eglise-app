import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

export async function GET() {
  const checks: Record<string, "ok" | "error"> = { api: "ok", db: "error" }

  try {
    const supabase = createClient()
    const { error } = await supabase.from("profiles").select("id").limit(1)
    checks.db = error ? "error" : "ok"
  } catch {
    checks.db = "error"
  }

  const allOk = Object.values(checks).every(v => v === "ok")
  return NextResponse.json(
    { status: allOk ? "ok" : "degraded", version: "v1", checks },
    { status: allOk ? 200 : 503 }
  )
}
