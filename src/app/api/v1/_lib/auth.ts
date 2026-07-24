import { createClient } from "@/lib/supabase/server"
import { UnauthorizedError } from "@arc/core"

export async function requireAuthV1(): Promise<string> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new UnauthorizedError()
  return user.id
}

const PROFILE_COLUMNS = "id, role, groups, pastoral_stage, display_name, avatar_url"

export async function getUserWithProfile() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new UnauthorizedError()

  const { data: profile } = await supabase
    .from("profiles")
    .select(PROFILE_COLUMNS)
    .eq("id", user.id)
    .single()

  return { user, profile }
}

/**
 * Variante non bloquante : renvoie `{ user: null, profile: null }` pour un appel
 * anonyme au lieu de lever. Utilisée par le wrapper `withApiV1`, qui décide
 * ensuite d'exiger l'authentification selon la route.
 */
export async function getOptionalUserWithProfile() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { user: null, profile: null }

  const { data: profile } = await supabase
    .from("profiles")
    .select(PROFILE_COLUMNS)
    .eq("id", user.id)
    .single()

  return { user, profile }
}

export type V1Profile = Awaited<ReturnType<typeof getOptionalUserWithProfile>>["profile"]
