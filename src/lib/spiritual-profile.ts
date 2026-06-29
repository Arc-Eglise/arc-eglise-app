// Spiritual Profile — server-side only
import { createClient }      from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import type { SpiritualProfile, SpiritualProfilePatch } from "@/types/spiritual-profile"
import { SPIRITUAL_PROFILE_DEFAULTS, PROFILE_TYPE_AI_CONTEXT } from "@/types/spiritual-profile"

// ── CRUD ────────────────────────────────────────────────────────────

export async function getSpiritualProfile(userId: string): Promise<SpiritualProfile> {
  try {
    const supabase = createClient()
    const { data } = await supabase
      .from("spiritual_profile")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle()

    if (data) return data as SpiritualProfile
    return {
      user_id:    userId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      ...SPIRITUAL_PROFILE_DEFAULTS,
    }
  } catch {
    return {
      user_id:    userId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      ...SPIRITUAL_PROFILE_DEFAULTS,
    }
  }
}

export async function upsertSpiritualProfile(
  userId: string,
  patch: SpiritualProfilePatch,
): Promise<void> {
  const supabase = createClient()
  await supabase.from("spiritual_profile").upsert({
    user_id: userId,
    ...patch,
  })
}

// Fire-and-forget — n'est jamais bloquant
export function updateSpiritualProfileAsync(
  userId: string,
  patch: Partial<SpiritualProfile>,
): void {
  try {
    const admin = createAdminClient()
    void admin.from("spiritual_profile").upsert({ user_id: userId, ...patch })
  } catch {
    // Non bloquant
  }
}

// ── Contexte IA ─────────────────────────────────────────────────────

export function buildSpiritualContextBlock(profile: SpiritualProfile): string {
  const lines: string[] = []

  // Mémo pré-calculé (priorité absolue si disponible)
  if (profile.ai_context_memo) {
    lines.push(profile.ai_context_memo)
  } else {
    // Construit à la volée depuis les données du profil
    const typeCtx = PROFILE_TYPE_AI_CONTEXT[profile.profile_type]
    if (typeCtx) lines.push(typeCtx)

    if (profile.theological_focus.length > 0)
      lines.push(`Intérets théologiques : ${profile.theological_focus.slice(0, 5).join(", ")}`)

    if (profile.study_themes.length > 0)
      lines.push(`Thèmes étudiés récemment : ${profile.study_themes.slice(0, 5).join(", ")}`)

    if (profile.prayer_topics.length > 0)
      lines.push(`Sujets de prière : ${profile.prayer_topics.slice(0, 3).join(", ")}`)

    const favBooks = [...profile.fav_nt_books, ...profile.fav_ot_books]
    if (favBooks.length > 0)
      lines.push(`Livres bibliques préférés : ${favBooks.slice(0, 5).join(", ")}`)

    if (profile.total_chapters > 0)
      lines.push(`Chapitres lus à ce jour : ${profile.total_chapters}`)
  }

  return lines.join("\n")
}

// Version async qui charge et construit en une étape — utilisée dans les routes API
export async function buildUserContextBlock(userId: string): Promise<string> {
  try {
    const profile = await getSpiritualProfile(userId)
    return buildSpiritualContextBlock(profile)
  } catch {
    return ""
  }
}

// ── Inférence automatique de thèmes depuis une conversation ────────

const OT_BOOKS = ["Genèse","Exode","Lévitique","Nombres","Deutéronome","Josué","Juges","Ruth","Samuel","Rois","Chroniques","Esdras","Néhémie","Esther","Job","Psaumes","Proverbes","Ecclésiaste","Cantique","Ésaïe","Jérémie","Lamentations","Ézéchiel","Daniel","Osée","Joël","Amos","Abdias","Jonas","Michée","Nahoum","Habacuc","Sophonie","Aggée","Zacharie","Malachie"]
const NT_BOOKS = ["Matthieu","Marc","Luc","Jean","Actes","Romains","Corinthiens","Galates","Éphésiens","Philippiens","Colossiens","Thessaloniciens","Timothée","Tite","Philémon","Hébreux","Jacques","Pierre","Jean","Jude","Apocalypse"]

function extractBooks(text: string): { ot: string[]; nt: string[] } {
  const ot = OT_BOOKS.filter(b => new RegExp(`\\b${b}`, "i").test(text))
  const nt = NT_BOOKS.filter(b => new RegExp(`\\b${b}`, "i").test(text))
  return { ot: Array.from(new Set(ot)), nt: Array.from(new Set(nt)) }
}

function mergeArrayMax<T>(existing: T[], newItems: T[], max = 20): T[] {
  return Array.from(new Set([...newItems, ...existing])).slice(0, max)
}

// Appelé après chaque session de chat (fire-and-forget)
export function inferAndUpdateProfileAsync(
  userId: string,
  userMessage: string,
  assistantResponse: string,
): void {
  try {
    const combined = `${userMessage} ${assistantResponse}`
    const { ot, nt } = extractBooks(combined)
    if (ot.length === 0 && nt.length === 0) return

    const admin = createAdminClient()
    // Charger le profil actuel pour merger les arrays
    admin.from("spiritual_profile")
      .select("fav_ot_books, fav_nt_books, total_sessions")
      .eq("user_id", userId)
      .maybeSingle()
      .then(({ data }) => {
        const existing = data ?? { fav_ot_books: [], fav_nt_books: [], total_sessions: 0 }
        void admin.from("spiritual_profile").upsert({
          user_id:        userId,
          fav_ot_books:   mergeArrayMax(existing.fav_ot_books ?? [], ot),
          fav_nt_books:   mergeArrayMax(existing.fav_nt_books ?? [], nt),
          total_sessions: (existing.total_sessions ?? 0) + 1,
        })
      })
      .then(() => {})
  } catch {
    // Non bloquant
  }
}
