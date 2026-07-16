// ARC AI — Church Engine
// Membres, groupes, ministères, événements, présences

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export interface ChurchMember {
  id: string
  firstName: string
  lastName: string
  email?: string
  phone?: string
  status: 'visiteur' | 'membre' | 'leader' | 'pasteur'
  groups: string[]
  ministries: string[]
  joinedAt?: string
}

export interface ChurchGroup {
  id: string
  name: string
  type: 'cellule' | 'ministère' | 'comité' | 'jeunes' | 'femmes' | 'hommes' | 'autre'
  leaderName?: string
  memberCount: number
  meetingSchedule?: string
}

export interface ChurchEvent {
  id: string
  title: string
  type: 'culte' | 'prière' | 'formation' | 'évangélisation' | 'célébration' | 'autre'
  startDate: string
  endDate?: string
  location?: string
  description?: string
  expectedAttendees?: number
}

// ── Membres ───────────────────────────────────────────────────────────────────

export async function searchMembers(
  query: string,
  options: { limit?: number; status?: ChurchMember['status'] } = {},
): Promise<ChurchMember[]> {
  const supabase = createAdminClient()
  const limit = options.limit ?? 10

  let q = supabase
    .from('members')
    .select('id, first_name, last_name, email, phone, status, joined_at')
    .or(`first_name.ilike.%${query}%,last_name.ilike.%${query}%,email.ilike.%${query}%`)
    .limit(limit)

  if (options.status) q = q.eq('status', options.status)

  const { data } = await q
  return (data ?? []).map(m => ({
    id: m.id as string,
    firstName: m.first_name as string,
    lastName: m.last_name as string,
    email: m.email as string | undefined,
    phone: m.phone as string | undefined,
    status: m.status as ChurchMember['status'],
    groups: [],
    ministries: [],
    joinedAt: m.joined_at as string | undefined,
  }))
}

export async function getMemberStats(): Promise<{
  total: number
  membres: number
  visiteurs: number
  leaders: number
}> {
  const supabase = createAdminClient()
  const { data } = await supabase.from('members').select('status')

  const stats = { total: 0, membres: 0, visiteurs: 0, leaders: 0 }
  for (const m of data ?? []) {
    stats.total++
    if (m.status === 'membre') stats.membres++
    else if (m.status === 'visiteur') stats.visiteurs++
    else if (m.status === 'leader' || m.status === 'pasteur') stats.leaders++
  }
  return stats
}

// ── Groupes ───────────────────────────────────────────────────────────────────

export async function getGroups(type?: ChurchGroup['type']): Promise<ChurchGroup[]> {
  const supabase = createAdminClient()
  let q = supabase
    .from('groups')
    .select('id, name, type, leader_name, member_count, meeting_schedule')
    .order('name')

  if (type) q = q.eq('type', type)

  const { data } = await q
  return (data ?? []).map(g => ({
    id: g.id as string,
    name: g.name as string,
    type: (g.type as ChurchGroup['type']) ?? 'autre',
    leaderName: g.leader_name as string | undefined,
    memberCount: (g.member_count as number) ?? 0,
    meetingSchedule: g.meeting_schedule as string | undefined,
  }))
}

// ── Événements ────────────────────────────────────────────────────────────────

export async function getUpcomingEvents(limit = 8): Promise<ChurchEvent[]> {
  const supabase = createClient()
  const { data } = await supabase
    .from('events')
    .select('id, title, type, start_date, end_date, location, description, expected_attendees')
    .gte('start_date', new Date().toISOString())
    .order('start_date')
    .limit(limit)

  return (data ?? []).map(e => ({
    id: e.id as string,
    title: e.title as string,
    type: (e.type as ChurchEvent['type']) ?? 'autre',
    startDate: e.start_date as string,
    endDate: e.end_date as string | undefined,
    location: e.location as string | undefined,
    description: e.description as string | undefined,
    expectedAttendees: e.expected_attendees as number | undefined,
  }))
}

export async function createEvent(data: Omit<ChurchEvent, 'id'>): Promise<ChurchEvent> {
  const supabase = createClient()
  const { data: result, error } = await supabase
    .from('events')
    .insert({
      title: data.title,
      type: data.type,
      start_date: data.startDate,
      end_date: data.endDate,
      location: data.location,
      description: data.description,
      expected_attendees: data.expectedAttendees,
    })
    .select()
    .single()

  if (error) throw new Error(`ChurchEngine.createEvent: ${error.message}`)
  return { ...data, id: result.id as string }
}

// Formatter pour prompt
export function formatEventsForPrompt(events: ChurchEvent[]): string {
  if (!events.length) return 'Aucun événement à venir.'
  return events.map(e => {
    const date = new Date(e.startDate).toLocaleDateString('fr-CH', { weekday: 'long', day: 'numeric', month: 'long' })
    return `- ${date} : ${e.title} (${e.type})${e.location ? ` @ ${e.location}` : ''}`
  }).join('\n')
}
