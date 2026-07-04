import { NextRequest, NextResponse } from "next/server"
import { requireAuth, unauthorizedResponse, badRequestResponse } from "@/lib/bible-ai"
import { createClient }      from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

export async function POST(req: NextRequest) {
  let userId: string
  try { userId = await requireAuth() } catch { return unauthorizedResponse() }

  const body = await req.json().catch(() => null)
  if (!body) return badRequestResponse("JSON invalide")

  const { action } = body as { action: string }
  const supabase = createClient()
  const admin    = createAdminClient()

  switch (action) {

    case "list": {
      const { data: groups } = await supabase
        .from("ai_study_groups")
        .select("id, name, description, church_group, language, level, max_members, facilitator_id, created_at")
        .eq("is_active", true)
        .order("created_at", { ascending: false })

      const { data: memberships } = await supabase
        .from("ai_study_group_members")
        .select("group_id")
        .eq("user_id", userId)

      const memberSet  = new Set((memberships ?? []).map((m: any) => m.group_id))
      const groupIds   = (groups ?? []).map((g: any) => g.id)
      const counts: Record<string, number> = {}

      if (groupIds.length > 0) {
        const { data: mc } = await supabase
          .from("ai_study_group_members")
          .select("group_id")
          .in("group_id", groupIds)
        for (const m of mc ?? []) counts[(m as any).group_id] = (counts[(m as any).group_id] ?? 0) + 1
      }

      return NextResponse.json({
        groups: (groups ?? []).map((g: any) => ({
          ...g,
          member_count: counts[g.id] ?? 0,
          is_member: memberSet.has(g.id),
        })),
      })
    }

    case "create": {
      const { name, description, church_group, language = "fr", level = "intermediaire", max_members = 20 } = body
      if (!name?.trim()) return badRequestResponse("Nom requis")

      const { data: group, error } = await admin
        .from("ai_study_groups")
        .insert({
          name: name.trim(),
          description: description ?? null,
          facilitator_id: userId,
          church_group: church_group ?? null,
          language,
          level,
          max_members,
          is_active: true,
        })
        .select()
        .single()

      if (error) return NextResponse.json({ error: error.message }, { status: 400 })

      await admin.from("ai_study_group_members").insert({ group_id: group.id, user_id: userId })

      return NextResponse.json({ group })
    }

    case "join": {
      const { group_id } = body
      if (!group_id) return badRequestResponse("group_id requis")

      const { data: grp } = await supabase
        .from("ai_study_groups")
        .select("max_members, is_active")
        .eq("id", group_id)
        .single()

      if (!grp?.is_active) return NextResponse.json({ error: "Groupe inactif" }, { status: 400 })

      const { count } = await supabase
        .from("ai_study_group_members")
        .select("*", { count: "exact", head: true })
        .eq("group_id", group_id)

      if (count !== null && count >= (grp.max_members ?? 20)) {
        return NextResponse.json({ error: "Groupe complet" }, { status: 400 })
      }

      const { error } = await supabase
        .from("ai_study_group_members")
        .upsert({ group_id, user_id: userId })

      if (error) return NextResponse.json({ error: error.message }, { status: 400 })
      return NextResponse.json({ success: true })
    }

    case "leave": {
      const { group_id } = body
      if (!group_id) return badRequestResponse("group_id requis")
      await supabase
        .from("ai_study_group_members")
        .delete()
        .eq("group_id", group_id)
        .eq("user_id", userId)
      return NextResponse.json({ success: true })
    }

    case "get_messages": {
      const { group_id, limit: lim = 60 } = body
      if (!group_id) return badRequestResponse("group_id requis")

      const { data: msgs } = await supabase
        .from("ai_group_messages")
        .select("id, content, verse_refs, created_at, user_id, profiles(first_name, last_name)")
        .eq("group_id", group_id)
        .order("created_at", { ascending: true })
        .limit(lim)

      return NextResponse.json({ messages: msgs ?? [] })
    }

    case "post_message": {
      const { group_id, content, verse_refs } = body
      if (!group_id || !content?.trim()) return badRequestResponse("group_id et content requis")

      const { data: msg, error } = await supabase
        .from("ai_group_messages")
        .insert({
          group_id,
          user_id: userId,
          content: content.trim().slice(0, 2000),
          verse_refs: verse_refs ?? [],
        })
        .select("id, content, verse_refs, created_at, user_id")
        .single()

      if (error) return NextResponse.json({ error: error.message }, { status: 400 })
      return NextResponse.json({ message: msg })
    }

    case "share_plan": {
      const { plan_id, group_id } = body
      if (!plan_id || !group_id) return badRequestResponse("plan_id et group_id requis")

      const { error } = await admin
        .from("ai_reading_plans")
        .update({ is_shared: true, group_id })
        .eq("id", plan_id)
        .eq("user_id", userId)

      if (error) return NextResponse.json({ error: error.message }, { status: 400 })
      return NextResponse.json({ success: true })
    }

    case "get_group_plans": {
      const { group_id } = body
      if (!group_id) return badRequestResponse("group_id requis")

      const { data: plans } = await supabase
        .from("ai_reading_plans")
        .select("id, title, level, duration_days, language, focus, created_at, user_id")
        .eq("group_id", group_id)
        .eq("is_shared", true)
        .order("created_at", { ascending: false })

      if (!plans || plans.length === 0) return NextResponse.json({ plans: [] })

      const planIds = plans.map((p: any) => p.id)

      // Progress counts per plan
      const { data: progress } = await supabase
        .from("ai_plan_member_progress")
        .select("plan_id, user_id, day_number")
        .in("plan_id", planIds)

      const myProgress: Record<string, number[]> = {}
      const allProgress: Record<string, Set<string>> = {}
      for (const p of (progress ?? []) as any[]) {
        if (p.user_id === userId) {
          myProgress[p.plan_id] = [...(myProgress[p.plan_id] ?? []), p.day_number]
        }
        if (!allProgress[p.plan_id]) allProgress[p.plan_id] = new Set()
        allProgress[p.plan_id].add(p.user_id)
      }

      return NextResponse.json({
        plans: plans.map((p: any) => ({
          ...p,
          my_completed: (myProgress[p.id] ?? []).length,
          active_members: allProgress[p.id]?.size ?? 0,
        })),
      })
    }

    case "sync_progress": {
      const { plan_id, day_number } = body
      if (!plan_id || day_number == null) return badRequestResponse("plan_id et day_number requis")

      const { error } = await supabase
        .from("ai_plan_member_progress")
        .upsert({ plan_id, user_id: userId, day_number }, { onConflict: "plan_id,user_id,day_number" })

      if (error) return NextResponse.json({ error: error.message }, { status: 400 })
      return NextResponse.json({ success: true })
    }

    case "get_group_progress": {
      const { plan_id } = body
      if (!plan_id) return badRequestResponse("plan_id requis")

      const { data: progress } = await supabase
        .from("ai_plan_member_progress")
        .select("user_id, day_number, completed_at, profiles(first_name, last_name)")
        .eq("plan_id", plan_id)
        .order("completed_at", { ascending: false })

      // Aggregate: map userId → { name, completed_days }
      const byUser: Record<string, { name: string; days: number[] }> = {}
      for (const p of (progress ?? []) as any[]) {
        if (!byUser[p.user_id]) {
          const prof = p.profiles
          byUser[p.user_id] = {
            name: prof ? `${prof.first_name ?? ""} ${prof.last_name ?? ""}`.trim() || "Membre" : "Membre",
            days: [],
          }
        }
        byUser[p.user_id].days.push(p.day_number)
      }

      return NextResponse.json({
        members_progress: Object.entries(byUser).map(([uid, v]) => ({
          user_id: uid,
          name: v.name,
          completed_days: v.days.length,
          is_me: uid === userId,
        })),
      })
    }

    default:
      return NextResponse.json({ error: "Action inconnue" }, { status: 400 })
  }
}
