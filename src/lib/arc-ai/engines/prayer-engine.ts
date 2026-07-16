// ARC AI — Prayer Engine
// Gestion des demandes de prière, intercession, suivi, notifications

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export interface PrayerRequest {
  id: string
  userId: string
  title: string
  description: string
  isPublic: boolean
  status: 'active' | 'answered' | 'closed'
  prayerCount: number
  createdAt: string
  answeredAt?: string
  answeredNote?: string
}

// Créer une demande de prière
export async function createPrayerRequest(
  userId: string,
  data: { title: string; description: string; isPublic?: boolean },
): Promise<PrayerRequest> {
  const supabase = createClient()
  const { data: result, error } = await supabase
    .from('prayer_requests')
    .insert({
      user_id: userId,
      title: data.title,
      description: data.description,
      is_public: data.isPublic ?? false,
      status: 'active',
    })
    .select()
    .single()

  if (error) throw new Error(`PrayerEngine.create: ${error.message}`)
  return mapPrayerRequest(result)
}

// Récupérer les demandes de prière d'un utilisateur
export async function getUserPrayerRequests(userId: string, status?: PrayerRequest['status']): Promise<PrayerRequest[]> {
  const supabase = createClient()
  let q = supabase
    .from('prayer_requests')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (status) q = q.eq('status', status)

  const { data } = await q
  return (data ?? []).map(mapPrayerRequest)
}

// Récupérer les demandes publiques (pour l'intercession communautaire)
export async function getPublicPrayerRequests(limit = 10): Promise<PrayerRequest[]> {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('prayer_requests')
    .select('*')
    .eq('is_public', true)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(limit)

  return (data ?? []).map(mapPrayerRequest)
}

// Incrémenter le compteur de prières
export async function prayForRequest(requestId: string): Promise<void> {
  const supabase = createAdminClient()
  try {
    await supabase.rpc('increment_prayer_count', { request_id: requestId })
  } catch {
    // Si RPC non définie, update manuel
    const { data } = await supabase.from('prayer_requests').select('prayer_count').eq('id', requestId).single()
    await supabase.from('prayer_requests').update({ prayer_count: ((data?.prayer_count as number) ?? 0) + 1 }).eq('id', requestId)
  }
}

// Marquer une prière comme répondue
export async function markAnswered(requestId: string, userId: string, note?: string): Promise<void> {
  const supabase = createClient()
  await supabase
    .from('prayer_requests')
    .update({
      status: 'answered',
      answered_at: new Date().toISOString(),
      answered_note: note,
    })
    .eq('id', requestId)
    .eq('user_id', userId)
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
    description: r.description as string,
    isPublic: r.is_public as boolean,
    status: r.status as PrayerRequest['status'],
    prayerCount: (r.prayer_count as number) ?? 0,
    createdAt: r.created_at as string,
    answeredAt: r.answered_at as string | undefined,
    answeredNote: r.answered_note as string | undefined,
  }
}
