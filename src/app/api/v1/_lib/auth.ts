import { createClient } from "@/lib/supabase/server"
import { UnauthorizedError } from "@arc/core"

export async function requireAuthV1(): Promise<string> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new UnauthorizedError()
  return user.id
}

export async function getUserWithProfile() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new UnauthorizedError()

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role, groups, pastoral_stage, display_name, avatar_url")
    .eq("id", user.id)
    .single()

  return { user, profile }
}
