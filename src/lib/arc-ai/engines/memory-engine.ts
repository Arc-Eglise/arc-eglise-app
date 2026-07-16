// ARC AI — Memory Engine
// Mémoire utilisateur (progression, cours, préférences) + mémoire église (sermons, événements)

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// ── Types ────────────────────────────────────────────────────────────────────

export interface UserMemory {
  userId: string
  bibleReadingProgress: Record<string, number>  // book → last chapter read
  completedCourses: string[]
  favTopics: string[]
  prayerCount: number
  lastActivity: string
  spiritualProfile?: string
}

export interface ChurchMemory {
  recentSermons: Array<{ date: string; title: string; passage: string; summary: string }>
  upcomingEvents: Array<{ date: string; title: string; type: string }>
  activePrayerRequests: number
  currentSermonSeries?: string
}

// ── Mémoire utilisateur ───────────────────────────────────────────────────────

export async function getUserMemory(userId: string): Promise<UserMemory> {
  const supabase = createClient()
  const { data } = await supabase
    .from('ai_user_preferences')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()

  return {
    userId,
    bibleReadingProgress: (data?.bible_reading_progress as Record<string, number>) ?? {},
    completedCourses: (data?.completed_courses as string[]) ?? [],
    favTopics: (data?.fav_topics as string[]) ?? [],
    prayerCount: (data?.prayer_count as number) ?? 0,
    lastActivity: (data?.updated_at as string) ?? new Date().toISOString(),
    spiritualProfile: data?.spiritual_profile as string | undefined,
  }
}

export async function updateUserProgress(
  userId: string,
  update: Partial<{
    bibleBook: string
    chapter: number
    courseCompleted: string
    prayerMade: boolean
  }>,
): Promise<void> {
  const supabase = createClient()
  const current = await getUserMemory(userId)

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }

  if (update.bibleBook && update.chapter) {
    patch.bible_reading_progress = { ...current.bibleReadingProgress, [update.bibleBook]: update.chapter }
  }
  if (update.courseCompleted && !current.completedCourses.includes(update.courseCompleted)) {
    patch.completed_courses = [...current.completedCourses, update.courseCompleted]
  }
  if (update.prayerMade) {
    patch.prayer_count = current.prayerCount + 1
  }

  await supabase.from('ai_user_preferences').upsert({ user_id: userId, ...patch })
}

// Sessions de conversation
export async function getRecentSessions(userId: string, limit = 3): Promise<string[]> {
  const supabase = createClient()
  const { data } = await supabase
    .from('ai_bible_sessions')
    .select('summary')
    .eq('user_id', userId)
    .not('summary', 'is', null)
    .order('updated_at', { ascending: false })
    .limit(limit)

  return (data ?? []).map(s => s.summary as string).filter(Boolean)
}

// ── Mémoire église ────────────────────────────────────────────────────────────

export async function getChurchMemory(): Promise<ChurchMemory> {
  const supabase = createAdminClient()
  const now = new Date().toISOString()

  const [sermonsRes, eventsRes, prayersRes] = await Promise.all([
    supabase
      .from('sermons')
      .select('preached_at, title, passage, summary')
      .order('preached_at', { ascending: false })
      .limit(5),
    supabase
      .from('events')
      .select('start_date, title, type')
      .gte('start_date', now)
      .order('start_date')
      .limit(5),
    supabase
      .from('prayer_requests')
      .select('id', { count: 'exact' })
      .eq('status', 'active'),
  ])

  return {
    recentSermons: (sermonsRes.data ?? []).map(s => ({
      date: s.preached_at as string,
      title: s.title as string,
      passage: s.passage as string,
      summary: ((s.summary as string) ?? '').slice(0, 200),
    })),
    upcomingEvents: (eventsRes.data ?? []).map(e => ({
      date: e.start_date as string,
      title: e.title as string,
      type: e.type as string,
    })),
    activePrayerRequests: prayersRes.count ?? 0,
  }
}

// Formatter la mémoire utilisateur pour injection dans un prompt
export function formatMemoryForPrompt(memory: UserMemory, sessions: string[]): string {
  const parts: string[] = []

  if (sessions.length > 0) {
    parts.push(`SESSIONS PRÉCÉDENTES :\n${sessions.map(s => `- ${s}`).join('\n')}`)
  }
  if (memory.favTopics.length > 0) {
    parts.push(`Centres d'intérêt : ${memory.favTopics.join(', ')}`)
  }
  if (memory.completedCourses.length > 0) {
    parts.push(`Cours complétés : ${memory.completedCourses.join(', ')}`)
  }
  if (memory.prayerCount > 0) {
    parts.push(`Prières enregistrées : ${memory.prayerCount}`)
  }

  return parts.join('\n')
}
