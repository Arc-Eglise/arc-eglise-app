// ARC AI — Prayer Engine
// Gestion des demandes de prière, intercession, suivi, notifications
// Schéma aligné sur la table live `prayer_requests` (cf. actions/membres.ts).

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { notifyUser } from '@/lib/notify'
import { notifyPrayerAudience } from '@/lib/notify-prayer'

export interface PrayerRequest {
  id: string
  userId: string
  title: string
  description: string
  visibility: string           // all | pasteur | groups | members
  isAnonymous: boolean
  targetGroups: string[]
  targetMembers: string[]
  isAnswered: boolean
  prayerCount: number
  createdAt: string
}

const PRAYER_MILESTONES = [1, 5, 10, 25, 50, 100]

// Créer une demande de prière → notifie l'audience (push + in-app)
export async function createPrayerRequest(
  userId: string,
  data: {
    title: string
    description?: string
    visibility?: string
    isAnonymous?: boolean
    targetGroups?: string[]
    targetMembers?: string[]
  },
): Promise<PrayerRequest> {
  const supabase = createClient()
  const visibility = data.visibility ?? 'all'
  const isAnonymous = !!data.isAnonymous
  const targetGroups = data.targetGroups ?? []
  const targetMembers = data.targetMembers ?? []

  const { data: result, error } = await supabase
    .from('prayer_requests')
    .insert({
      user_id: userId,
      title: data.title,
      description: data.description ?? null,
      is_anonymous: isAnonymous,
      visibility,
      target_groups: targetGroups,
      target_members: targetMembers,
    })
    .select()
    .single()

  if (error) throw new Error(`PrayerEngine.create: ${error.message}`)

  // Notif : prévenir l'audience selon la visibilité (service unifié notify.ts).
  await notifyPrayerAudience({
    userId, title: data.title, isAnonymous, visibility, targetGroups, targetMembers,
  }).catch(() => {})

  return mapPrayerRequest(result)
}

// Récupérer les demandes de prière d'un utilisateur
export async function getUserPrayerRequests(userId: string, answered?: boolean): Promise<PrayerRequest[]> {
  const supabase = createClient()
  let q = supabase
    .from('prayer_requests')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (answered !== undefined) q = q.eq('is_answered', answered)

  const { data } = await q
  return (data ?? []).map(mapPrayerRequest)
}

// Récupérer les demandes publiques (visibilité "all", non exaucées)
export async function getPublicPrayerRequests(limit = 10): Promise<PrayerRequest[]> {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('prayer_requests')
    .select('*')
    .eq('visibility', 'all')
    .eq('is_answered', false)
    .order('created_at', { ascending: false })
    .limit(limit)

  return (data ?? []).map(mapPrayerRequest)
}

// Incrémenter le compteur de prières → notif jalon à l'auteur
export async function prayForRequest(requestId: string): Promise<void> {
  const admin = createAdminClient()
  const { data } = await admin
    .from('prayer_requests')
    .select('prayer_count, user_id, title')
    .eq('id', requestId)
    .single()

  const newCount = ((data?.prayer_count as number) ?? 0) + 1
  await admin.from('prayer_requests').update({ prayer_count: newCount }).eq('id', requestId)

  if (data?.user_id && PRAYER_MILESTONES.includes(newCount)) {
    const who = newCount > 1 ? `${newCount} frères prient` : `${newCount} frère prie`
    await notifyUser({
      userId: data.user_id as string,
      type: 'prayer',
      title: `🙏 ${who} pour toi !`,
      body: (data.title as string | null)?.slice(0, 80) ?? null,
      link: '/espace-membres?p=priere',
    }).catch(() => {})
  }
}

// Marquer une prière comme exaucée → notif à l'auteur
export async function markAnswered(requestId: string, userId: string): Promise<void> {
  const supabase = createClient()
  const { data: pr } = await supabase
    .from('prayer_requests')
    .update({ is_answered: true })
    .eq('id', requestId)
    .eq('user_id', userId)
    .select('title')
    .maybeSingle()

  if (pr) {
    await notifyUser({
      userId,
      type: 'prayer',
      title: '✨ Ta prière a été exaucée !',
      body: (pr.title as string | null)?.slice(0, 90) ?? null,
      link: '/espace-membres?p=priere',
    }).catch(() => {})
  }
}

// Formater pour prompt IA
export function formatPrayerRequestsForPrompt(requests: PrayerRequest[]): string {
  if (!requests.length) return 'Aucune demande de prière active.'
  return requests.map(r => `- ${r.title}: ${r.description.slice(0, 150)} (${r.prayerCount} prières)`).join('\n')
}

function mapPrayerRequest(r: Record<string, unknown>): PrayerRequest {
  return {
    id: r.id as string,
    userId: r.user_id as string,
    title: r.title as string,
    description: (r.description as string) ?? '',
    visibility: (r.visibility as string) ?? 'all',
    isAnonymous: (r.is_anonymous as boolean) ?? false,
    targetGroups: (r.target_groups as string[]) ?? [],
    targetMembers: (r.target_members as string[]) ?? [],
    isAnswered: (r.is_answered as boolean) ?? false,
    prayerCount: (r.prayer_count as number) ?? 0,
    createdAt: r.created_at as string,
  }
}
