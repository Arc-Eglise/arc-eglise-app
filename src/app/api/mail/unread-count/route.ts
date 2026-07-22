import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getAuthorizedMailboxes } from "@/lib/mail/mailbox-config"
import { listMessages } from "@/lib/mail/graph-client"

export async function GET() {
  if (!process.env.GRAPH_TENANT_ID || !process.env.GRAPH_CLIENT_ID || !process.env.GRAPH_CLIENT_SECRET) {
    return NextResponse.json({ count: 0 })
  }

  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ count: 0 })

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, groups")
    .eq("id", user.id)
    .single()

  const authorized = getAuthorizedMailboxes(profile?.role ?? "", profile?.groups ?? [])
  if (!authorized.length) return NextResponse.json({ count: 0 })

  try {
    const data = await listMessages(authorized[0], "inbox", 50, 0)
    const unread = (data?.value ?? []).filter((m) => !m.isRead).length
    return NextResponse.json({ count: unread })
  } catch {
    return NextResponse.json({ count: 0 })
  }
}
