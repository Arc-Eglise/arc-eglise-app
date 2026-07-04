// Activity logging — server-side only, always fire-and-forget
import { createAdminClient } from "@/lib/supabase/admin"

export type ActivityAction =
  | "bible_read"
  | "ai_chat"
  | "journal_entry"
  | "plan_day_completed"
  | "prayer_request"
  | "note_created"
  | "bookmark_added"
  | "meditation"
  | "theology_query"
  | "search"
  | "media_saved"
  | "recommendation_clicked"

interface LogOptions {
  resourceType?:  string
  resourceId?:    string
  resourceLabel?: string
  durationSec?:   number
  metadata?:      Record<string, unknown>
}

const STREAK_ACTIONS = new Set<ActivityAction>([
  "bible_read", "ai_chat", "journal_entry", "plan_day_completed",
])

// Fire-and-forget — ne bloque jamais, toujours silencieux en cas d'erreur
export function logActivityAsync(
  userId: string,
  action: ActivityAction,
  opts: LogOptions = {},
): void {
  try {
    const admin = createAdminClient()
    void admin.from("user_activity_log").insert({
      user_id:        userId,
      action,
      resource_type:  opts.resourceType  ?? null,
      resource_id:    opts.resourceId    ?? null,
      resource_label: opts.resourceLabel ?? null,
      duration_sec:   opts.durationSec   ?? null,
      metadata:       opts.metadata      ?? {},
    })
    if (STREAK_ACTIONS.has(action)) updateStreakAsync(userId)
  } catch {
    // Toujours silencieux
  }
}

async function updateStreakAsync(userId: string): Promise<void> {
  try {
    const admin = createAdminClient()
    const today = new Date().toISOString().slice(0, 10)

    const { data: streak } = await admin
      .from("study_streaks")
      .select("current_streak, longest_streak, last_activity, total_days_active, freeze_remaining")
      .eq("user_id", userId)
      .maybeSingle()

    if (!streak) {
      await admin.from("study_streaks").upsert({
        user_id:           userId,
        current_streak:    1,
        longest_streak:    1,
        last_activity:     today,
        total_days_active: 1,
        freeze_remaining:  1,
      })
      return
    }

    if (streak.last_activity === today) return

    const last     = new Date(streak.last_activity ?? "2000-01-01")
    const now      = new Date(today)
    const diffDays = Math.round((now.getTime() - last.getTime()) / 86400000)

    let newStreak = 1
    let freeze    = streak.freeze_remaining

    if (diffDays === 1) {
      newStreak = streak.current_streak + 1
    } else if (diffDays === 2 && streak.freeze_remaining > 0) {
      newStreak = streak.current_streak + 1
      freeze    = streak.freeze_remaining - 1
    }

    // Réinitialiser les freezes le 1er du mois
    if (new Date().getDate() === 1) freeze = 1

    await admin.from("study_streaks").upsert({
      user_id:           userId,
      current_streak:    newStreak,
      longest_streak:    Math.max(newStreak, streak.longest_streak),
      last_activity:     today,
      total_days_active: streak.total_days_active + 1,
      freeze_remaining:  freeze,
    })
  } catch {
    // Non bloquant
  }
}

// ── Stats pour le tableau de bord ────────────────────────────────

export interface ActivitySummary {
  streak:       { current: number; longest: number; lastActivity: string | null }
  thisMonth:    { chapters: number; sessions: number; minutes: number }
  activityGrid: { date: string; count: number }[]
}

export async function getActivitySummary(userId: string): Promise<ActivitySummary> {
  try {
    const admin = createAdminClient()

    const firstOfMonth = new Date()
    firstOfMonth.setDate(1)
    firstOfMonth.setHours(0, 0, 0, 0)
    const monthStart = firstOfMonth.toISOString()

    // 30 jours pour la grille
    const gridStart = new Date(Date.now() - 30 * 86400000).toISOString()

    const [streakRes, monthRes, gridRes] = await Promise.all([
      admin.from("study_streaks")
        .select("current_streak, longest_streak, last_activity")
        .eq("user_id", userId)
        .maybeSingle(),
      admin.from("user_activity_log")
        .select("action, duration_sec")
        .eq("user_id", userId)
        .gte("created_at", monthStart),
      admin.from("user_activity_log")
        .select("created_at")
        .eq("user_id", userId)
        .gte("created_at", gridStart),
    ])

    const streak     = streakRes.data
    const monthActs  = monthRes.data ?? []
    const gridActs   = gridRes.data  ?? []

    const grid: Record<string, number> = {}
    gridActs.forEach(a => {
      const date = (a.created_at as string).slice(0, 10)
      grid[date] = (grid[date] ?? 0) + 1
    })

    return {
      streak: {
        current:      streak?.current_streak  ?? 0,
        longest:      streak?.longest_streak  ?? 0,
        lastActivity: streak?.last_activity   ?? null,
      },
      thisMonth: {
        chapters: monthActs.filter(a => a.action === "bible_read").length,
        sessions: monthActs.filter(a => a.action === "ai_chat").length,
        minutes:  monthActs.reduce((s, a) => s + (a.duration_sec ? Math.floor((a.duration_sec as number) / 60) : 0), 0),
      },
      activityGrid: Object.entries(grid)
        .map(([date, count]) => ({ date, count }))
        .sort((a, b) => a.date.localeCompare(b.date)),
    }
  } catch {
    return {
      streak:       { current: 0, longest: 0, lastActivity: null },
      thisMonth:    { chapters: 0, sessions: 0, minutes: 0 },
      activityGrid: [],
    }
  }
}
