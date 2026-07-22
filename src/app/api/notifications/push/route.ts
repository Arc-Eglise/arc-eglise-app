import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 })

  const body = await req.json().catch(() => null)
  if (!body?.action) return NextResponse.json({ error: "action requis" }, { status: 400 })

  const admin = createAdminClient()

  // ── broadcast : envoyer à tous les membres validés (stream, annonce globale) ──
  if (body.action === "broadcast") {
    const { type, title, body: notifBody, link } = body as { type:string; title:string; body?:string; link?:string }
    if (!type || !title) return NextResponse.json({ error: "type et title requis" }, { status: 400 })

    // Vérifier que l'utilisateur a les droits
    const { data: profile } = await admin
      .from("profiles")
      .select("role, groups")
      .eq("id", user.id)
      .single()
    const role   = (profile?.role  ?? "") as string
    const groups = (profile?.groups ?? []) as string[]
    const allowed = ["admin","pasteur"].includes(role) ||
      groups.some(g => ["media","communication","support"].includes(g))
    if (!allowed) return NextResponse.json({ error: "Accès refusé" }, { status: 403 })

    const { data: members } = await admin
      .from("profiles")
      .select("id")
      .eq("validated", true)
      .neq("id", user.id)

    if (!members?.length) return NextResponse.json({ ok: true, sent: 0 })

    const rows = members.map((m: { id: string }) => ({
      user_id: m.id, type, title,
      body:    notifBody ?? null,
      link:    link ?? null,
    }))

    for (let i = 0; i < rows.length; i += 100) {
      await admin.from("notifications").insert(rows.slice(i, i + 100))
    }
    return NextResponse.json({ ok: true, sent: rows.length })
  }

  // ── self : notif pour l'utilisateur lui-même (événement du jour, mail, etc.) ──
  if (body.action === "self") {
    const { type, title, body: notifBody, link, dedup_hours = 20 } = body as {
      type:string; title:string; body?:string; link?:string; dedup_hours?:number
    }
    if (!type || !title) return NextResponse.json({ error: "type et title requis" }, { status: 400 })

    // Dédupliquer : pas de notif similaire dans les dernières N heures
    const since = new Date(Date.now() - dedup_hours * 3600 * 1000).toISOString()
    const { data: existing } = await supabase
      .from("notifications")
      .select("id")
      .eq("user_id", user.id)
      .eq("type", type)
      .eq("title", title)
      .gte("created_at", since)
      .maybeSingle()

    if (existing) return NextResponse.json({ ok: true, skipped: true })

    await supabase.from("notifications").insert({
      user_id: user.id, type, title,
      body:    notifBody ?? null,
      link:    link ?? null,
    })
    return NextResponse.json({ ok: true, created: true })
  }

  return NextResponse.json({ error: "action inconnue" }, { status: 400 })
}
