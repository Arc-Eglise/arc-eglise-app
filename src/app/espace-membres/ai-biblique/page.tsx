import { createClient }    from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { redirect }          from "next/navigation"
import BibleAIClient         from "@/components/bible-ai/BibleAIClient"
import type { AIUserPreferences } from "@/lib/bible-ai"
import type { BibleLevel }        from "@/lib/bible-ai-prompts"

export const metadata = { title: "ARC Église AI · Espace Membres" }

const DEFAULT_PREFS: AIUserPreferences = {
  user_id:            "",
  language:           "fr",
  level:              "debutant",
  default_bible:      "61fd76eafa1ef5f7-01",
  fav_books:          [],
  fav_topics:         [],
  memory_enabled:     true,
  notification_plans: false,
}

export default async function AIBibliquePage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/connexion")

  const admin = createAdminClient()

  // Load user preferences (may not exist yet)
  const { data: prefsRow } = await admin
    .from("ai_user_preferences")
    .select("language, level, default_bible, fav_books, fav_topics, memory_enabled, notification_plans")
    .eq("user_id", user.id)
    .maybeSingle()

  const prefs: AIUserPreferences = prefsRow
    ? {
        user_id:            user.id,
        language:           prefsRow.language           ?? "fr",
        level:              (prefsRow.level as BibleLevel) ?? "debutant",
        default_bible:      prefsRow.default_bible      ?? "61fd76eafa1ef5f7-01",
        fav_books:          prefsRow.fav_books           ?? [],
        fav_topics:         prefsRow.fav_topics          ?? [],
        memory_enabled:     prefsRow.memory_enabled      ?? true,
        notification_plans: prefsRow.notification_plans  ?? false,
      }
    : { ...DEFAULT_PREFS, user_id: user.id }

  // User role (for future admin-only features)
  const { data: profile } = await admin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle()

  const role = profile?.role ?? "membre"

  return (
    <div className="flex flex-col h-screen bg-arc-bg">
      {/* Mobile top bar */}
      <div className="md:hidden shrink-0 flex items-center gap-3 px-4 py-3 bg-arc-navy text-white border-b border-white/10">
        <a href="/espace-membres" className="text-white/60 hover:text-white text-sm">←</a>
        <span className="font-bold text-sm">ARC Église AI</span>
      </div>

      {/* Main layout */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Desktop sidebar */}
        <aside className="hidden md:flex flex-col w-56 shrink-0 bg-arc-navy text-white">
          <div className="px-6 pt-6 pb-4">
            <a href="/espace-membres" className="text-white/50 hover:text-white text-xs">← Espace Membres</a>
          </div>
          <div className="px-4 flex-1">
            {[
              { href: "/espace-membres",             label: "Accueil",        icon: "🏠" },
              { href: "/espace-membres/assistant",   label: "Assistant IA",   icon: "✨" },
              { href: "/espace-membres/ai-biblique", label: "ARC Église AI",  icon: "✦" },
              { href: "/espace-membres/annuaire",    label: "Annuaire",       icon: "👥" },
              { href: "/espace-membres/agenda",      label: "Agenda",         icon: "📅" },
              { href: "/espace-membres/messagerie",  label: "Messages",       icon: "💬" },
              { href: "/espace-membres/priere",      label: "Prière",         icon: "🙏" },
              { href: "/espace-membres/streaming",   label: "Streaming",      icon: "📺" },
              { href: "/espace-membres/bible",       label: "Bible",          icon: "📖" },
            ].map(item => (
              <a
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors ${
                  item.href === "/espace-membres/ai-biblique"
                    ? "bg-white/15 text-white font-semibold"
                    : "text-white/60 hover:text-white hover:bg-white/10"
                }`}
              >
                <span className="text-base w-5 text-center">{item.icon}</span>
                <span>{item.label}</span>
              </a>
            ))}
          </div>
        </aside>

        {/* Content */}
        <main className="flex-1 min-w-0 flex flex-col overflow-hidden">
          <BibleAIClient userId={user.id} prefs={prefs} role={role} />
        </main>
      </div>
    </div>
  )
}
