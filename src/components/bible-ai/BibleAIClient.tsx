"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import LangSelector from "@/components/bible-ai/LangSelector"
import DictionaryPanel from "@/components/bible-ai/DictionaryPanel"
import type { BibleLevel } from "@/lib/bible-ai-prompts"
import type { AIUserPreferences } from "@/lib/bible-ai"

/* ─── Types ─────────────────────────────────────────────────── */
type Tab = "chat" | "search" | "plans" | "journal" | "events" | "media" | "groups" | "sermons" | "dictionary"

interface StudyGroup {
  id: string; name: string; description: string | null; church_group: string | null
  language: string; level: string; max_members: number; facilitator_id: string
  member_count: number; is_member: boolean; created_at: string
}
interface GroupMessage {
  id: string; content: string; verse_refs: string[]; created_at: string
  user_id: string; profiles: { first_name: string | null; last_name: string | null } | null
}
interface SermonItem {
  id: string; title: string; pastor: string | null; date: string; has_summary: boolean
}
interface SermonSummary {
  summary: string; key_verses: string[]; themes: string[]; cached?: boolean
}
type Msg = { id: string; role: "user" | "assistant"; content: string; streaming?: boolean }

interface ReadingPlan {
  id: string; title: string; level: string; duration_days: number
  language: string; focus: string | null; created_at: string; created_by_ai: boolean
  is_shared?: boolean; group_id?: string | null
  started_at?: string | null
}
interface TodayReading {
  plan_id: string; plan_title: string
  current_day: number; total_days: number; completed_days: number
  day_id: string; day_title: string | null
  passages: string[]; verse_texts: { reference: string; text: string }[]
  reflection: string | null; prayer_guide: string | null; is_completed: boolean
}
interface GroupPlan {
  id: string; title: string; level: string; duration_days: number; focus: string | null
  created_at: string; my_completed: number; active_members: number
}
interface MemberProgress { user_id: string; name: string; completed_days: number; is_me: boolean }
interface PlanDay {
  id: string; day_number: number; title: string | null; passages: string[]
  reflection: string | null; prayer_guide: string | null; is_completed: boolean
}
interface JournalEntry {
  id: string; date: string; content: string; verse_refs: string[]
  mood: string | null; ai_reflection: string | null; updated_at: string
}
interface SearchResult {
  reference: string; ref_id: string; text: string; relevance: number; explanation: string
}
interface EventItem {
  id: string; title: string; date: string; time_start: string | null
  location: string | null; description: string | null; price_chf: number | null; tags: string[] | null
}
interface MediaItem {
  title: string; author?: string; type: string; url?: string
  description: string; verse_refs: string[]; topics: string[]; language: string; saved: boolean; source?: string
}

/* ─── Helpers ───────────────────────────────────────────────── */
function uid() { return Math.random().toString(36).slice(2) }

const LEVEL_LABELS: Record<BibleLevel, string> = {
  enfant: "Enfant", debutant: "Débutant", intermediaire: "Intermédiaire",
  avance: "Avancé", enseignant: "Enseignant",
}

const SEARCH_MODES = [
  { id: "semantic",  label: "Sémantique",  icon: "🔍" },
  { id: "thematic",  label: "Thématique",  icon: "📚" },
  { id: "character", label: "Personnage",  icon: "👤" },
  { id: "location",  label: "Lieu",        icon: "📍" },
  { id: "event",     label: "Événement",   icon: "⚡" },
  { id: "keyword",   label: "Mot-clé",     icon: "🔤" },
]

const CHAT_SUGGESTIONS = [
  { icon: "📖", label: "Jean 3:16",       text: "Explique-moi Jean 3:16 dans son contexte historique et théologique." },
  { icon: "✝️", label: "La Grâce",        text: "Qu'est-ce que la grâce selon la Bible ? Donne-moi plusieurs passages clés." },
  { icon: "🙏", label: "La Prière",       text: "Comment prier efficacement selon la Bible ? Quelle est la méthode de Jésus ?" },
  { icon: "⛪", label: "La Trinité",      text: "Explique-moi la doctrine de la Trinité avec des références bibliques." },
  { icon: "💡", label: "Le Saint-Esprit", text: "Quel est le rôle du Saint-Esprit dans la vie du croyant ?" },
  { icon: "📜", label: "Confession",      text: "Résume la Confession de Westminster pour moi." },
]

/* ─── Sous-composants inline ────────────────────────────────── */
function SendIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  )
}

function Spinner() {
  return (
    <span className="flex gap-1 items-center">
      {[0, 1, 2].map(i => (
        <span key={i} className="h-1.5 w-1.5 rounded-full bg-arc-blue animate-bounce" style={{ animationDelay: `${i * 120}ms` }} />
      ))}
    </span>
  )
}

/* ─── Composant principal ───────────────────────────────────── */
interface Props {
  userId: string
  prefs: AIUserPreferences
  role: string
}

export default function BibleAIClient({ userId, prefs, role }: Props) {
  const supabase = createClient()
  const [tab, setTab]         = useState<Tab>("chat")
  const [language, setLang]   = useState(prefs.language)
  const [level, setLevel]     = useState<BibleLevel>(prefs.level)

  // Persister les changements de langue/niveau
  useEffect(() => {
    fetch("/api/bible-ai/preferences", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "update", data: { language, level } }),
    }).catch(() => {})
  }, [language, level])

  /* ══ CHAT ══════════════════════════════════════════════════ */
  const [messages, setMessages]   = useState<Msg[]>([])
  const [draft, setDraft]         = useState("")
  const [chatLoading, setChatLoading] = useState(false)
  const [chatMode, setChatMode]   = useState<"chat" | "theology">("chat")
  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 30)
  }, [messages])

  const sendChat = useCallback(async (override?: string) => {
    const text = (override ?? draft).trim()
    if (!text || chatLoading) return
    setDraft("")
    setChatLoading(true)
    const userMsg: Msg = { id: uid(), role: "user", content: text }
    const aiId = uid()
    setMessages(prev => [...prev, userMsg, { id: aiId, role: "assistant", content: "", streaming: true }])

    try {
      const endpoint = chatMode === "theology" ? "/api/bible-ai/theology" : "/api/bible-ai/chat"
      const body     = chatMode === "theology"
        ? { question: text, history: messages.map(m => ({ role: m.role, content: m.content })), language, level, stream: true }
        : { message: text, history: messages.map(m => ({ role: m.role, content: m.content })), context: { language, level }, stream: true }

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      if (!res.ok || !res.body) throw new Error("stream error")

      const reader = res.body.getReader()
      const dec = new TextDecoder()
      let buf = ""; let full = ""

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buf += dec.decode(value, { stream: true })
        const lines = buf.split("\n"); buf = lines.pop() ?? ""
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue
          try {
            const ev = JSON.parse(line.slice(6))
            if (ev.type === "chunk" && ev.content) {
              full += ev.content
              setMessages(prev => prev.map(m => m.id === aiId ? { ...m, content: full } : m))
            }
            if (ev.type === "end" || ev.type === "done") {
              setMessages(prev => prev.map(m => m.id === aiId ? { ...m, content: full || "…", streaming: false } : m))
            }
            if (ev.type === "error") {
              setMessages(prev => prev.map(m => m.id === aiId ? { ...m, content: "Le service IA est temporairement indisponible. Veuillez réessayer dans quelques minutes.", streaming: false } : m))
            }
          } catch { /* skip */ }
        }
      }
      // Fallback si le stream se termine sans événement "end"
      setMessages(prev => prev.map(m => m.id === aiId ? { ...m, content: m.content || "Service temporairement indisponible.", streaming: false } : m))
    } catch {
      setMessages(prev => prev.map(m => m.id === aiId ? { ...m, content: "Service temporairement indisponible.", streaming: false } : m))
    } finally {
      setChatLoading(false)
    }
  }, [draft, chatLoading, chatMode, language, level, messages])

  /* ══ SEARCH ════════════════════════════════════════════════ */
  const [searchQuery, setSearchQuery]     = useState("")
  const [searchMode, setSearchMode]       = useState("semantic")
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [searchInterp, setSearchInterp]   = useState("")

  const doSearch = async () => {
    if (!searchQuery.trim() || searchLoading) return
    setSearchLoading(true); setSearchResults([]); setSearchInterp("")
    try {
      const res = await fetch("/api/bible-ai/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: searchQuery.trim(), mode: searchMode, language }),
      })
      const data = await res.json()
      setSearchResults(data.results ?? [])
      setSearchInterp(data.query_interpretation ?? "")
    } finally { setSearchLoading(false) }
  }

  /* ══ PLANS ═════════════════════════════════════════════════ */
  const [plans, setPlans]               = useState<ReadingPlan[]>([])
  const [plansLoading, setPlansLoading] = useState(false)
  const [activePlan, setActivePlan]     = useState<ReadingPlan | null>(null)
  const [planDays, setPlanDays]         = useState<PlanDay[]>([])
  const [showNewPlan, setShowNewPlan]   = useState(false)
  const [newPlanFocus, setNewPlanFocus] = useState("")
  const [newPlanDays, setNewPlanDays]   = useState(30)
  const [planGenMsg, setPlanGenMsg]     = useState("")
  const [todayReading, setTodayReading] = useState<TodayReading | null>(null)
  const [todayLoading, setTodayLoading] = useState(false)
  const [expandedDay, setExpandedDay]   = useState<string | null>(null)
  const [dayVerseTexts, setDayVerseTexts] = useState<Record<string, { reference: string; text: string }[]>>({})
  const [verseLoadingKey, setVerseLoadingKey] = useState<string | null>(null)

  const loadTodayReading = useCallback(async () => {
    setTodayLoading(true)
    try {
      const res = await fetch("/api/bible-ai/plans", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "get_today" }) })
      const data = await res.json()
      setTodayReading(data.today ?? null)
    } finally { setTodayLoading(false) }
  }, [])

  const loadPlans = useCallback(async () => {
    setPlansLoading(true)
    try {
      const res = await fetch("/api/bible-ai/plans", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "list" }) })
      const data = await res.json()
      setPlans(data.plans ?? [])
    } finally { setPlansLoading(false) }
  }, [])

  useEffect(() => {
    if (tab === "plans") {
      loadPlans()
      loadTodayReading()
    }
  }, [tab, loadPlans, loadTodayReading])

  const loadPlanDays = async (planId: string) => {
    const res = await fetch("/api/bible-ai/plans", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "get_days", plan_id: planId }) })
    const data = await res.json()
    setPlanDays(data.days ?? [])
  }

  const startPlan = async (planId: string) => {
    await fetch("/api/bible-ai/plans", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "start_plan", plan_id: planId }) })
    setPlans(prev => prev.map(p => p.id === planId ? { ...p, started_at: new Date().toISOString() } : p))
    loadTodayReading()
  }

  const fetchDayVerseTexts = async (key: string, passages: string[], planId?: string, dayNum?: number) => {
    if (dayVerseTexts[key] || verseLoadingKey === key) return
    setVerseLoadingKey(key)
    try {
      // Si on a plan_id + day_number, utiliser l'action serveur avec fallback IA
      if (planId && dayNum) {
        const res = await fetch("/api/bible-ai/plans", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "get_day_verses", plan_id: planId, day_number: dayNum }),
        })
        const data = await res.json()
        setDayVerseTexts(prev => ({ ...prev, [key]: data.verse_texts ?? [] }))
      }
    } catch { /* skip */ } finally {
      setVerseLoadingKey(null)
    }
  }

  const toggleDay = (key: string, passages: string[], planId?: string, dayNum?: number) => {
    if (expandedDay === key) { setExpandedDay(null); return }
    setExpandedDay(key)
    fetchDayVerseTexts(key, passages, planId, dayNum)
  }

  const createPlan = async () => {
    setPlanGenMsg("Génération du plan en cours…")
    setShowNewPlan(false)
    try {
      const res = await fetch("/api/bible-ai/plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "create", level, language, duration_days: newPlanDays, focus: newPlanFocus || undefined, generate: true }),
      })
      if (!res.body) { setPlanGenMsg("Erreur"); return }
      const reader = res.body.getReader(); const dec = new TextDecoder(); let buf = ""
      while (true) {
        const { done, value } = await reader.read(); if (done) break
        buf += dec.decode(value, { stream: true })
        const lines = buf.split("\n"); buf = lines.pop() ?? ""
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue
          try {
            const ev = JSON.parse(line.slice(6))
            if (ev.type === "end") setPlanGenMsg(`✅ Plan créé (${ev.days_count} jours)`)
            if (ev.type === "error") setPlanGenMsg(`❌ Erreur : ${ev.error}`)
          } catch { /* skip */ }
        }
      }
    } catch { setPlanGenMsg("Erreur lors de la création") }
    setTimeout(() => { setPlanGenMsg(""); loadPlans() }, 2000)
  }

  const completeDay = async (planId: string, dayNum: number) => {
    await fetch("/api/bible-ai/plans", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "complete_day", plan_id: planId, day_number: dayNum }) })
    setPlanDays(prev => prev.map(d => d.day_number === dayNum ? { ...d, is_completed: true } : d))
    if (todayReading?.plan_id === planId && todayReading?.current_day === dayNum) {
      setTodayReading(prev => prev ? { ...prev, is_completed: true, completed_days: (prev.completed_days ?? 0) + 1 } : prev)
    }
  }

  /* ══ JOURNAL ═══════════════════════════════════════════════ */
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([])
  const [journalLoading, setJournalLoading] = useState(false)
  const [journalContent, setJournalContent] = useState("")
  const [journalMood, setJournalMood]       = useState("")
  const [journalSaving, setJournalSaving]   = useState(false)
  const [selectedEntry, setSelectedEntry]   = useState<JournalEntry | null>(null)
  const [reflectionLoading, setReflLoading] = useState(false)

  const loadJournal = useCallback(async () => {
    setJournalLoading(true)
    try {
      const res = await fetch("/api/bible-ai/journal", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "list" }) })
      const data = await res.json()
      setJournalEntries(data.entries ?? [])
    } finally { setJournalLoading(false) }
  }, [])

  useEffect(() => { if (tab === "journal") loadJournal() }, [tab, loadJournal])

  const saveJournal = async () => {
    if (!journalContent.trim()) return
    setJournalSaving(true)
    try {
      await fetch("/api/bible-ai/journal", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "upsert", content: journalContent, mood: journalMood || undefined, generate_reflection: true }) })
      setJournalContent(""); setJournalMood("")
      loadJournal()
    } finally { setJournalSaving(false) }
  }

  const generateReflection = async (id: string) => {
    setReflLoading(true)
    try {
      const res = await fetch("/api/bible-ai/journal", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "reflect", journal_id: id }) })
      const data = await res.json()
      if (data.reflection) {
        setJournalEntries(prev => prev.map(e => e.id === id ? { ...e, ai_reflection: data.reflection } : e))
        if (selectedEntry?.id === id) setSelectedEntry(prev => prev ? { ...prev, ai_reflection: data.reflection } : prev)
      }
    } finally { setReflLoading(false) }
  }

  /* ══ EVENTS ════════════════════════════════════════════════ */
  const [churchEvents, setChurchEvents] = useState<EventItem[]>([])
  const [webResults, setWebResults]     = useState<unknown[]>([])
  const [eventQuery, setEventQuery]     = useState("")
  const [eventsLoading, setEventsLoading] = useState(false)

  const loadEvents = useCallback(async (q = "") => {
    setEventsLoading(true)
    try {
      const res = await fetch("/api/bible-ai/events", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ query: q, scope: q ? "both" : "church", language }) })
      const data = await res.json()
      setChurchEvents(data.church_events ?? [])
      setWebResults(data.web_results ?? [])
    } finally { setEventsLoading(false) }
  }, [language])

  useEffect(() => { if (tab === "events") loadEvents() }, [tab, loadEvents])

  /* ══ MEDIA ═════════════════════════════════════════════════ */
  const [media, setMedia]           = useState<MediaItem[]>([])
  const [mediaLoading, setMediaLoading] = useState(false)
  const [mediaQuery, setMediaQuery] = useState("")

  const loadMedia = useCallback(async (q = "") => {
    setMediaLoading(true)
    try {
      const res = await fetch("/api/bible-ai/media", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "recommend", topic: q || undefined, language }) })
      const data = await res.json()
      setMedia(data.recommendations ?? [])
    } finally { setMediaLoading(false) }
  }, [language])

  useEffect(() => { if (tab === "media") loadMedia() }, [tab, loadMedia])

  /* ══ GROUPS ════════════════════════════════════════════════ */
  const [groups, setGroups]           = useState<StudyGroup[]>([])
  const [groupsLoading, setGroupsLoading] = useState(false)
  const [activeGroup, setActiveGroup] = useState<StudyGroup | null>(null)
  const [groupMsgs, setGroupMsgs]     = useState<GroupMessage[]>([])
  const [groupMsgsLoading, setGroupMsgsLoading] = useState(false)
  const [groupDraft, setGroupDraft]   = useState("")
  const [groupSending, setGroupSending] = useState(false)
  const [showNewGroup, setShowNewGroup] = useState(false)
  const [newGroupName, setNewGroupName] = useState("")
  const [newGroupDesc, setNewGroupDesc] = useState("")
  const groupBottomRef = useRef<HTMLDivElement>(null)
  const [groupSubTab, setGroupSubTab] = useState<"chat"|"plans">("chat")
  const [groupPlans, setGroupPlans]   = useState<GroupPlan[]>([])
  const [groupPlansLoading, setGroupPlansLoading] = useState(false)
  const [activePlanId, setActivePlanId] = useState<string|null>(null)
  const [memberProgress, setMemberProgress] = useState<MemberProgress[]>([])
  const [syncingDay, setSyncingDay]   = useState<number|null>(null)

  const loadGroups = useCallback(async () => {
    setGroupsLoading(true)
    try {
      const res = await fetch("/api/bible-ai/groups", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "list" }) })
      const data = await res.json()
      setGroups(data.groups ?? [])
    } finally { setGroupsLoading(false) }
  }, [])

  useEffect(() => { if (tab === "groups") loadGroups() }, [tab, loadGroups])

  const loadGroupMessages = async (groupId: string) => {
    setGroupMsgsLoading(true)
    try {
      const res = await fetch("/api/bible-ai/groups", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "get_messages", group_id: groupId }) })
      const data = await res.json()
      setGroupMsgs(data.messages ?? [])
    } finally { setGroupMsgsLoading(false) }
  }

  useEffect(() => {
    if (activeGroup && groupSubTab === "plans") loadGroupPlans(activeGroup.id)
  }, [groupSubTab, activeGroup]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (activePlanId) loadMemberProgress(activePlanId)
  }, [activePlanId]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!activeGroup) return
    const ch = supabase.channel(`ag:${activeGroup.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "ai_group_messages",
        filter: `group_id=eq.${activeGroup.id}` }, ({ new: msg }: any) => {
        setGroupMsgs(prev => prev.some(m => m.id === msg.id) ? prev : [...prev, { ...msg, profiles: null }])
      }).subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [activeGroup]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    setTimeout(() => groupBottomRef.current?.scrollIntoView({ behavior: "smooth" }), 30)
  }, [groupMsgs])

  const sendGroupMessage = async () => {
    const text = groupDraft.trim()
    if (!text || !activeGroup || groupSending) return
    setGroupDraft("")
    setGroupSending(true)
    const tempId = `tmp-${Date.now()}`
    const tempMsg: GroupMessage = { id: tempId, content: text, verse_refs: [], created_at: new Date().toISOString(), user_id: userId, profiles: null }
    setGroupMsgs(prev => [...prev, tempMsg])
    try {
      await fetch("/api/bible-ai/groups", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "post_message", group_id: activeGroup.id, content: text }) })
    } catch {
      setGroupMsgs(prev => prev.filter(m => m.id !== tempId))
    } finally { setGroupSending(false) }
  }

  const joinLeaveGroup = async (group: StudyGroup) => {
    const action = group.is_member ? "leave" : "join"
    await fetch("/api/bible-ai/groups", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, group_id: group.id }) })
    setGroups(prev => prev.map(g => g.id === group.id ? { ...g, is_member: !g.is_member, member_count: g.member_count + (g.is_member ? -1 : 1) } : g))
  }

  const createGroup = async () => {
    if (!newGroupName.trim()) return
    const res = await fetch("/api/bible-ai/groups", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "create", name: newGroupName.trim(), description: newGroupDesc || undefined, language }) })
    const data = await res.json()
    if (data.group) { setShowNewGroup(false); setNewGroupName(""); setNewGroupDesc(""); loadGroups() }
  }

  const loadGroupPlans = async (groupId: string) => {
    setGroupPlansLoading(true)
    try {
      const res = await fetch("/api/bible-ai/groups", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "get_group_plans", group_id: groupId }) })
      const data = await res.json()
      setGroupPlans(data.plans ?? [])
    } finally { setGroupPlansLoading(false) }
  }

  const loadMemberProgress = async (planId: string) => {
    const res = await fetch("/api/bible-ai/groups", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "get_group_progress", plan_id: planId }) })
    const data = await res.json()
    setMemberProgress(data.members_progress ?? [])
  }

  const syncProgress = async (planId: string, dayNum: number, duration: number) => {
    setSyncingDay(dayNum)
    await fetch("/api/bible-ai/groups", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "sync_progress", plan_id: planId, day_number: dayNum }) })
    setGroupPlans(prev => prev.map(p => p.id === planId ? { ...p, my_completed: Math.min(p.my_completed + 1, duration) } : p))
    setSyncingDay(null)
  }

  // Share plan with group — called from Plans tab
  const [showShareModal, setShowShareModal] = useState<string|null>(null)
  const sharePlanWithGroup = async (planId: string, groupId: string) => {
    await fetch("/api/bible-ai/groups", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "share_plan", plan_id: planId, group_id: groupId }) })
    setPlans(prev => prev.map(p => p.id === planId ? { ...p, is_shared: true, group_id: groupId } : p))
    setShowShareModal(null)
  }

  /* ══ SERMONS ═══════════════════════════════════════════════ */
  const [dbSermons, setDbSermons]       = useState<SermonItem[]>([])
  const [sermonsLoading, setSermsLoading] = useState(false)
  const [activeSermon, setActiveSermon] = useState<SermonItem | null>(null)
  const [sermonSummary, setSermonSummary] = useState<SermonSummary | null>(null)
  const [summaryLoading, setSummaryLoading] = useState(false)

  const [versePopup, setVersePopup]   = useState<{ ref: string; text: string | null } | null>(null)
  const [verseLoading, setVerseLoading] = useState(false)
  const [themePopup, setThemePopup]   = useState<{ theme: string; result: string | null } | null>(null)
  const [themeLoading, setThemeLoading] = useState(false)

  const openVersePopup = async (ref: string) => {
    setVersePopup({ ref, text: null })
    setVerseLoading(true)
    try {
      const res = await fetch("/api/bible-ai/sermons", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "get_verse", ref }) })
      const data = await res.json()
      setVersePopup({ ref, text: data.text ?? "Verset non trouvé." })
    } catch {
      setVersePopup({ ref, text: "Impossible de charger le verset." })
    } finally {
      setVerseLoading(false)
    }
  }

  const openThemePopup = async (theme: string) => {
    setThemePopup({ theme, result: null })
    setThemeLoading(true)
    try {
      const res = await fetch("/api/bible-ai/sermons", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "search_theme", theme }) })
      const data = await res.json()
      setThemePopup({ theme, result: data.result ?? "Résultat non disponible." })
    } catch {
      setThemePopup({ theme, result: "Service temporairement indisponible." })
    } finally {
      setThemeLoading(false)
    }
  }

  const loadDbSermons = useCallback(async () => {
    setSermsLoading(true)
    try {
      const res = await fetch("/api/bible-ai/sermons", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "list_sermons" }) })
      const data = await res.json()
      setDbSermons(data.sermons ?? [])
    } finally { setSermsLoading(false) }
  }, [])

  useEffect(() => { if (tab === "sermons") loadDbSermons() }, [tab, loadDbSermons])

  const openSermon = async (sermon: SermonItem) => {
    setActiveSermon(sermon)
    setSermonSummary(null)
    setSummaryLoading(true)
    try {
      const res = await fetch("/api/bible-ai/sermons", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "get_summary", sermon_id: sermon.id }) })
      const data = await res.json()
      if (data.summary) setSermonSummary(data)
    } finally { setSummaryLoading(false) }
  }

  const generateSermonSummary = async () => {
    if (!activeSermon) return
    setSummaryLoading(true)
    try {
      const res = await fetch("/api/bible-ai/sermons", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "summarize", sermon_id: activeSermon.id, title: activeSermon.title, pastor: activeSermon.pastor, language }) })
      const data = await res.json()
      if (data.summary) {
        setSermonSummary(data)
        setDbSermons(prev => prev.map(s => s.id === activeSermon.id ? { ...s, has_summary: true } : s))
      }
    } finally { setSummaryLoading(false) }
  }

  const TABS: { id: Tab; label: string; icon: string }[] = [
    { id: "chat",       label: "Étude",       icon: "💬" },
    { id: "search",     label: "Recherche",   icon: "🔍" },
    { id: "dictionary", label: "Dictionnaire", icon: "📚" },
    { id: "plans",      label: "Plans",       icon: "📅" },
    { id: "journal",    label: "Journal",     icon: "📓" },
    { id: "events",     label: "Événements",  icon: "🗓" },
    { id: "media",      label: "Médias",      icon: "🎵" },
    { id: "groups",     label: "Groupes",     icon: "👥" },
    { id: "sermons",    label: "Résumés",     icon: "🎙" },
  ]

  /* ══ RENDER ════════════════════════════════════════════════ */
  return (
    <div className="flex flex-col h-full min-h-0">

      {/* ── Header ─────────────────────────────────────────── */}
      <div className="shrink-0 px-4 md:px-6 py-3 border-b border-arc-navy/10 bg-white/80 backdrop-blur">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-arc-blue">ARC Église</p>
            <h1 className="text-base font-serif font-semibold text-arc-navy leading-tight">Assistant Biblique IA</h1>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={level}
              onChange={e => setLevel(e.target.value as BibleLevel)}
              className="text-xs border border-arc-border rounded-lg px-2 py-1.5 text-arc-navy bg-white outline-none focus:border-arc-navy"
            >
              {(Object.entries(LEVEL_LABELS) as [BibleLevel, string][]).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
            <LangSelector value={language} onChange={setLang} />
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mt-3 overflow-x-auto no-scrollbar">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                tab === t.id
                  ? "bg-arc-navy text-white"
                  : "text-arc-text2 hover:text-arc-navy hover:bg-arc-blueBg"
              }`}
            >
              <span>{t.icon}</span>
              <span className="hidden sm:inline">{t.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── CHAT ────────────────────────────────────────────── */}
      {tab === "chat" && (
        <div className="flex flex-col flex-1 min-h-0">
          {/* Mode selector */}
          <div className="shrink-0 px-4 py-2 flex gap-2 border-b border-arc-navy/5">
            <button onClick={() => setChatMode("chat")} className={`text-xs px-3 py-1 rounded-full font-semibold transition-colors ${chatMode === "chat" ? "bg-arc-navy text-white" : "text-arc-text2 hover:text-arc-navy"}`}>
              💬 Chat biblique
            </button>
            <button onClick={() => setChatMode("theology")} className={`text-xs px-3 py-1 rounded-full font-semibold transition-colors ${chatMode === "theology" ? "bg-arc-navy text-white" : "text-arc-text2 hover:text-arc-navy"}`}>
              ⛪ Théologie
            </button>
          </div>

          {/* Messages */}
          <div className="em-reading-zone flex-1 overflow-y-auto px-4 md:px-6 py-4 space-y-4">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full min-h-[280px] text-center gap-5 pb-6">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-arc-blue to-arc-navy flex items-center justify-center text-2xl shadow-lg">✦</div>
                <div>
                  <p className="font-serif text-lg font-semibold text-arc-navy">ARC Église AI</p>
                  <p className="text-sm text-slate-500 mt-1 max-w-xs">Assistant biblique spécialisé · Sourcing strict · {LEVEL_LABELS[level]}</p>
                </div>
                <div className="grid grid-cols-2 gap-2 w-full max-w-sm">
                  {CHAT_SUGGESTIONS.map(s => (
                    <button key={s.label} onClick={() => sendChat(s.text)}
                      className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-left text-xs text-slate-700 hover:border-arc-blue transition shadow-sm">
                      <span className="text-base">{s.icon}</span>
                      <span className="font-medium">{s.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            ) : messages.map(m => (
              <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                {m.role === "assistant" && (
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-arc-blue to-arc-navy flex items-center justify-center text-white text-[10px] font-bold mr-2 mt-0.5 shrink-0">✦</div>
                )}
                <div className={`max-w-[80%] rounded-2xl px-4 py-3 em-ai-msg ${m.role === "user" ? "bg-arc-navy text-white rounded-br-sm" : "bg-slate-50 border border-slate-200 text-slate-800 rounded-bl-sm"}`}>
                  {m.content || (m.streaming && <Spinner />)}
                  {m.streaming && m.content && <span className="ml-0.5 inline-block h-4 w-0.5 animate-pulse bg-arc-blue align-middle" />}
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="shrink-0 border-t border-arc-navy/10 bg-white px-4 md:px-6 py-3">
            {messages.length > 0 && (
              <div className="flex gap-2 mb-2 overflow-x-auto pb-1 no-scrollbar">
                {CHAT_SUGGESTIONS.slice(0, 3).map(s => (
                  <button key={s.label} onClick={() => sendChat(s.text)} disabled={chatLoading}
                    className="shrink-0 flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-600 hover:border-arc-blue hover:text-arc-navy transition disabled:opacity-40">
                    <span>{s.icon}</span> {s.label}
                  </button>
                ))}
              </div>
            )}
            <div className="flex items-end gap-3">
              <textarea
                ref={textareaRef} value={draft} rows={2}
                onChange={e => setDraft(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendChat() } }}
                placeholder="Posez votre question biblique ou théologique… (Entrée pour envoyer)"
                className="flex-1 resize-none rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-800 placeholder-slate-400 outline-none focus:border-arc-blue focus:bg-white transition"
              />
              <button onClick={() => sendChat()} disabled={!draft.trim() || chatLoading}
                className="h-10 w-10 shrink-0 flex items-center justify-center rounded-xl bg-arc-navy text-white hover:bg-arc-blue disabled:opacity-40 disabled:cursor-not-allowed transition">
                <SendIcon />
              </button>
            </div>
            <p className="mt-1.5 text-center text-[10px] text-slate-400">
              ARC Église AI · Toute affirmation doit être sourcée · {chatMode === "theology" ? "Mode théologique" : "Mode biblique"}
            </p>
          </div>
        </div>
      )}

      {/* ── SEARCH ──────────────────────────────────────────── */}
      {tab === "search" && (
        <div className="flex-1 overflow-y-auto px-4 md:px-6 py-5">
          <div className="mb-4">
            <p className="text-sm font-semibold text-arc-navy mb-3">Mode de recherche</p>
            <div className="flex gap-2 flex-wrap mb-4">
              {SEARCH_MODES.map(m => (
                <button key={m.id} onClick={() => setSearchMode(m.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                    searchMode === m.id ? "bg-arc-navy text-white border-arc-navy" : "border-arc-border text-arc-text2 hover:border-arc-navy hover:text-arc-navy bg-white"
                  }`}>
                  {m.icon} {m.label}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onKeyDown={e => e.key === "Enter" && doSearch()}
                placeholder={searchMode === "character" ? "Ex: Abraham, David, Marie…" : searchMode === "location" ? "Ex: Jérusalem, Galilée…" : "Rechercher dans la Bible…"}
                className="flex-1 px-4 py-2.5 rounded-xl border border-arc-border text-sm outline-none focus:border-arc-navy transition"
              />
              <button onClick={doSearch} disabled={!searchQuery.trim() || searchLoading}
                className="px-4 py-2.5 rounded-xl bg-arc-navy text-white text-sm font-semibold hover:bg-arc-blue disabled:opacity-40 transition">
                {searchLoading ? "…" : "Chercher"}
              </button>
            </div>
          </div>

          {searchInterp && (
            <div className="mb-4 px-4 py-3 bg-arc-blueBg border border-arc-bluePale rounded-xl text-sm text-arc-navy">
              <span className="font-semibold">Interprétation : </span>{searchInterp}
            </div>
          )}

          <div className="space-y-3">
            {searchLoading && <div className="text-center py-8 text-arc-text2 text-sm">Recherche en cours…</div>}
            {!searchLoading && searchResults.map((r, i) => (
              <div key={i} className="bg-white border border-arc-border rounded-xl p-4">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <span className="font-bold text-arc-navy text-sm">{r.reference}</span>
                  <span className="text-xs text-arc-blue font-semibold shrink-0">{Math.round(r.relevance * 100)}%</span>
                </div>
                <p className="text-sm text-slate-700 italic mb-2">&ldquo;{r.text}&rdquo;</p>
                {r.explanation && <p className="text-xs text-arc-text2">{r.explanation}</p>}
                <div className="mt-2 flex gap-2">
                  <button onClick={() => { setDraft(`Explique ${r.reference}`); setTab("chat") }}
                    className="text-xs text-arc-blue hover:underline">
                    Expliquer → Chat
                  </button>
                  <button onClick={() => { setDraft(`Explique ${r.reference} au niveau ${level}`); sendChat(`Explique ${r.reference} au niveau ${level} en ${language}`) }}
                    className="text-xs text-arc-blue hover:underline">
                    Explication rapide
                  </button>
                </div>
              </div>
            ))}
            {!searchLoading && searchResults.length === 0 && searchQuery && !searchLoading && (
              <div className="text-center py-8 text-arc-text2 text-sm">Lance une recherche pour voir les résultats</div>
            )}
          </div>
        </div>
      )}

      {/* ── DICTIONARY ──────────────────────────────────────── */}
      {tab === "dictionary" && (
        <div className="flex-1 min-h-0 overflow-hidden">
          <DictionaryPanel
            language={language}
            onCiteVerse={(ref) => {
              setTab("chat")
              sendChat(`Explique-moi le verset ${ref} dans son contexte théologique et historique.`)
            }}
          />
        </div>
      )}

      {/* ── PLANS ───────────────────────────────────────────── */}
      {tab === "plans" && (
        <div className="flex-1 overflow-y-auto px-4 md:px-6 py-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-arc-navy">Plans de lecture</h2>
            <button onClick={() => setShowNewPlan(v => !v)}
              className="px-4 py-2 rounded-xl bg-arc-navy text-white text-sm font-semibold hover:bg-arc-blue transition">
              + Nouveau plan
            </button>
          </div>

          {planGenMsg && (
            <div className="mb-4 px-4 py-3 bg-arc-blueBg border border-arc-bluePale rounded-xl text-sm text-arc-navy">{planGenMsg}</div>
          )}

          {showNewPlan && (
            <div className="mb-5 bg-white border border-arc-border rounded-2xl p-5 space-y-3">
              <p className="font-semibold text-arc-navy text-sm">Nouveau plan</p>
              <input value={newPlanFocus} onChange={e => setNewPlanFocus(e.target.value)}
                placeholder="Focus : Évangile de Jean, Psaumes, épîtres de Paul… (optionnel)"
                className="w-full px-3 py-2 rounded-lg border border-arc-border text-sm outline-none focus:border-arc-navy" />
              <div className="flex gap-3 items-center">
                <label className="text-xs text-arc-text2 shrink-0">Durée :</label>
                <select value={newPlanDays} onChange={e => setNewPlanDays(+e.target.value)}
                  className="text-sm border border-arc-border rounded-lg px-2 py-1.5 outline-none">
                  {[7, 14, 21, 30, 45, 60, 90].map(d => <option key={d} value={d}>{d} jours</option>)}
                </select>
              </div>
              <div className="flex gap-2">
                <button onClick={createPlan}
                  className="flex-1 py-2 rounded-xl bg-arc-navy text-white text-sm font-semibold hover:bg-arc-blue transition">
                  Générer avec l'IA
                </button>
                <button onClick={() => setShowNewPlan(false)}
                  className="px-4 py-2 rounded-xl border border-arc-border text-sm text-arc-text2 hover:text-arc-navy transition">
                  Annuler
                </button>
              </div>
            </div>
          )}

          {/* ── Lecture du jour ───────────────────────────────── */}
          {!activePlan && (todayLoading ? (
            <div className="mb-4 bg-arc-blueBg border border-arc-bluePale rounded-2xl p-4 animate-pulse">
              <div className="h-3 w-32 bg-arc-bluePale rounded mb-2" />
              <div className="h-4 w-48 bg-arc-bluePale rounded" />
            </div>
          ) : todayReading && (
            <div className="mb-5 bg-gradient-to-br from-arc-navy to-arc-blue rounded-2xl p-5 text-white shadow-lg">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/60">Lecture du jour</p>
                  <p className="font-semibold text-sm text-white/90 mt-0.5">{todayReading.plan_title}</p>
                </div>
                <div className="text-right shrink-0 ml-3">
                  <p className="text-2xl font-bold leading-none">{todayReading.current_day}</p>
                  <p className="text-[10px] text-white/60">/ {todayReading.total_days}</p>
                </div>
              </div>

              {/* Barre de progression */}
              <div className="w-full bg-white/20 rounded-full h-1.5 mb-4">
                <div className="bg-arc-gold h-1.5 rounded-full transition-all"
                  style={{ width: `${Math.round((todayReading.completed_days / todayReading.total_days) * 100)}%` }} />
              </div>

              {/* Titre du jour */}
              {todayReading.day_title && (
                <p className="font-semibold text-white mb-3">{todayReading.day_title}</p>
              )}

              {/* Textes des versets */}
              {todayReading.verse_texts.length > 0 ? (
                <div className="space-y-3 mb-4">
                  {todayReading.verse_texts.map((v, i) => (
                    <div key={i} className="bg-white/10 rounded-xl p-3">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-arc-gold mb-1">{v.reference}</p>
                      <p className="text-sm text-white/95 leading-relaxed italic">&ldquo;{v.text}&rdquo;</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="mb-4 space-y-1">
                  {todayReading.passages.map((p, i) => (
                    <p key={i} className="text-sm font-semibold text-arc-gold">{p}</p>
                  ))}
                </div>
              )}

              {/* Réflexion */}
              {todayReading.reflection && (
                <div className="bg-white/10 rounded-xl p-3 mb-3">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-white/60 mb-1">Réflexion</p>
                  <p className="text-xs text-white/80 italic">{todayReading.reflection}</p>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2 mt-2">
                {!todayReading.is_completed ? (
                  <button onClick={() => completeDay(todayReading.plan_id, todayReading.current_day)}
                    className="flex-1 py-2 rounded-xl bg-white text-arc-navy text-xs font-bold hover:bg-white/90 transition">
                    ✓ Marquer comme fait
                  </button>
                ) : (
                  <div className="flex-1 py-2 rounded-xl bg-white/20 text-white/70 text-xs font-bold text-center">
                    ✓ Complété
                  </div>
                )}
                <button onClick={() => { const p = plans.find(pl => pl.id === todayReading.plan_id); if (p) { setActivePlan(p); loadPlanDays(p.id) } }}
                  className="px-4 py-2 rounded-xl bg-white/20 text-white text-xs font-semibold hover:bg-white/30 transition">
                  Voir le plan →
                </button>
              </div>
            </div>
          ))}

          {plansLoading && <div className="text-center py-8 text-arc-text2 text-sm">Chargement…</div>}

          {!activePlan ? (
            <div className="space-y-3">
              {plans.map(p => {
                const isStarted = !!p.started_at
                return (
                  <div key={p.id} className="bg-white border border-arc-border rounded-xl p-4 hover:border-arc-navy transition">
                    <div className="flex items-start justify-between cursor-pointer" onClick={() => { setActivePlan(p); loadPlanDays(p.id) }}>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold text-arc-navy text-sm">{p.title}</p>
                          {isStarted && <span className="text-[10px] bg-arc-blueBg text-arc-blue px-2 py-0.5 rounded-full font-semibold">En cours</span>}
                          {p.is_shared && <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-semibold">📤 Partagé</span>}
                        </div>
                        <p className="text-xs text-arc-text2 mt-0.5">{p.duration_days} jours · {p.level}{p.focus ? ` · ${p.focus}` : ""}</p>
                      </div>
                      <span className="text-xs text-arc-blue ml-2 shrink-0">→</span>
                    </div>

                    {!isStarted && (
                      <div className="mt-3 pt-3 border-t border-arc-border/50">
                        <button onClick={e => { e.stopPropagation(); startPlan(p.id) }}
                          className="w-full py-2 rounded-lg bg-arc-navy text-white text-xs font-semibold hover:bg-arc-blue transition">
                          Commencer ce plan
                        </button>
                      </div>
                    )}

                    {!p.is_shared && groups.filter(g => g.is_member).length > 0 && (
                      <div className="mt-2 pt-2 border-t border-arc-border/50">
                        {showShareModal === p.id ? (
                          <div className="flex items-center gap-2">
                            <select className="flex-1 text-xs border border-arc-border rounded-lg px-2 py-1 outline-none" id={`share-sel-${p.id}`}>
                              {groups.filter(g => g.is_member).map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                            </select>
                            <button onClick={() => {
                              const sel = document.getElementById(`share-sel-${p.id}`) as HTMLSelectElement
                              if (sel?.value) sharePlanWithGroup(p.id, sel.value)
                            }} className="text-xs px-2 py-1 rounded-lg bg-arc-navy text-white hover:bg-arc-blue transition">Partager</button>
                            <button onClick={() => setShowShareModal(null)} className="text-xs text-arc-text2 hover:text-arc-navy">✕</button>
                          </div>
                        ) : (
                          <button onClick={e => { e.stopPropagation(); loadGroups(); setShowShareModal(p.id) }}
                            className="text-xs text-arc-text2 hover:text-arc-navy transition">🔗 Partager avec un groupe</button>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
              {!plansLoading && plans.length === 0 && (
                <div className="text-center py-12 text-arc-text2">
                  <p className="text-4xl mb-3">📅</p>
                  <p className="font-semibold">Aucun plan de lecture</p>
                  <p className="text-sm mt-1">Créez votre premier plan avec l'IA</p>
                </div>
              )}
            </div>
          ) : (
            <div>
              <button onClick={() => { setActivePlan(null); setPlanDays([]); setExpandedDay(null) }}
                className="mb-4 text-sm text-arc-blue hover:underline">
                ← Retour aux plans
              </button>
              <h3 className="font-bold text-arc-navy mb-1">{activePlan.title}</h3>
              <p className="text-xs text-arc-text2 mb-2">{activePlan.duration_days} jours · Niveau {activePlan.level}</p>

              {/* Barre de progression dans la vue détail */}
              {(() => {
                const completed = planDays.filter(d => d.is_completed).length
                const pct = planDays.length ? Math.round((completed / planDays.length) * 100) : 0
                return planDays.length > 0 ? (
                  <div className="mb-4">
                    <div className="flex justify-between text-xs text-arc-text2 mb-1">
                      <span>{completed} / {planDays.length} jours complétés</span>
                      <span>{pct}%</span>
                    </div>
                    <div className="w-full bg-arc-border rounded-full h-2">
                      <div className="bg-arc-navy h-2 rounded-full transition-all" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                ) : null
              })()}

              {/* Lien Commencer si pas encore démarré */}
              {!activePlan.started_at && (
                <button onClick={() => startPlan(activePlan.id)}
                  className="w-full mb-4 py-2.5 rounded-xl bg-arc-navy text-white text-sm font-semibold hover:bg-arc-blue transition">
                  Commencer ce plan
                </button>
              )}

              <div className="space-y-2">
                {planDays.map(d => {
                  const key = `${activePlan.id}_${d.day_number}`
                  const isToday = todayReading?.plan_id === activePlan.id && todayReading?.current_day === d.day_number
                  const isExpanded = expandedDay === key
                  const vTexts = dayVerseTexts[key]
                  const loadingVerse = verseLoadingKey === key

                  return (
                    <div key={d.id} className={`border rounded-xl transition-colors ${
                      isToday ? "bg-arc-blueBg border-arc-blue shadow-sm" :
                      d.is_completed ? "bg-green-50 border-green-200" : "bg-white border-arc-border hover:border-arc-navy"
                    }`}>
                      <div className="flex items-center justify-between p-4 cursor-pointer" onClick={() => toggleDay(key, d.passages ?? [], activePlan.id, d.day_number)}>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            {isToday && <span className="text-[10px] bg-arc-blue text-white px-2 py-0.5 rounded-full font-bold shrink-0">Aujourd'hui</span>}
                            <p className={`font-semibold text-sm ${isToday ? "text-arc-blue" : "text-arc-navy"}`}>
                              Jour {d.day_number}{d.title ? ` — ${d.title}` : ""}
                            </p>
                          </div>
                          <p className="text-xs text-arc-blue/80 mt-0.5">{(d.passages ?? []).join(" · ")}</p>
                        </div>
                        <div className="flex items-center gap-2 ml-3 shrink-0">
                          {d.is_completed && <span className="text-green-600 text-sm">✓</span>}
                          <span className={`text-xs text-arc-text2 transition-transform ${isExpanded ? "rotate-90" : ""}`}>›</span>
                        </div>
                      </div>

                      {/* Contenu expandé avec versets */}
                      {isExpanded && (
                        <div className="px-4 pb-4 border-t border-arc-border/40 pt-3 space-y-3">
                          {loadingVerse ? (
                            <div className="flex items-center gap-2 text-xs text-arc-text2 py-2">
                              <Spinner /> Chargement des versets…
                            </div>
                          ) : vTexts && vTexts.length > 0 ? (
                            vTexts.map((v, i) => (
                              <div key={i} className="bg-white rounded-xl p-3 border border-arc-border">
                                <p className="text-[10px] font-bold uppercase tracking-wider text-arc-blue mb-1">{v.reference}</p>
                                {v.text ? (
                                  <p className="text-sm text-slate-700 leading-relaxed italic">&ldquo;{v.text}&rdquo;</p>
                                ) : (
                                  <p className="text-xs text-arc-text2">Verset non disponible — ouvrez la Bible pour lire.</p>
                                )}
                              </div>
                            ))
                          ) : (
                            <div className="space-y-1">
                              {(d.passages ?? []).map((p, i) => (
                                <p key={i} className="text-sm font-semibold text-arc-blue">{p}</p>
                              ))}
                            </div>
                          )}

                          {d.reflection && (
                            <div className="bg-arc-blueBg rounded-xl p-3">
                              <p className="text-[10px] font-bold uppercase tracking-wider text-arc-navy mb-1">Réflexion</p>
                              <p className="text-xs text-slate-700 italic">{d.reflection}</p>
                            </div>
                          )}

                          {d.prayer_guide && (
                            <div className="bg-amber-50 rounded-xl p-3">
                              <p className="text-[10px] font-bold uppercase tracking-wider text-amber-700 mb-1">Guide de prière</p>
                              <p className="text-xs text-slate-700">{d.prayer_guide}</p>
                            </div>
                          )}

                          {!d.is_completed && (
                            <button onClick={() => completeDay(activePlan.id, d.day_number)}
                              className="w-full py-2 rounded-xl bg-green-600 text-white text-xs font-bold hover:bg-green-700 transition">
                              ✓ Marquer comme fait
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── JOURNAL ─────────────────────────────────────────── */}
      {tab === "journal" && (
        <div className="flex-1 overflow-y-auto px-4 md:px-6 py-5">
          {!selectedEntry ? (
            <>
              <div className="mb-5 bg-white border border-arc-border rounded-2xl p-5">
                <h2 className="font-bold text-arc-navy mb-3">Nouvelle entrée</h2>
                <div className="space-y-3">
                  <textarea value={journalContent} onChange={e => setJournalContent(e.target.value)}
                    placeholder="Ce que Dieu m'a parlé aujourd'hui…"
                    rows={4}
                    className="w-full px-3 py-2.5 rounded-xl border border-arc-border text-sm resize-none outline-none focus:border-arc-navy transition" />
                  <div className="flex gap-2 items-center">
                    <label className="text-xs text-arc-text2 shrink-0">Humeur :</label>
                    <select value={journalMood} onChange={e => setJournalMood(e.target.value)}
                      className="text-sm border border-arc-border rounded-lg px-2 py-1.5 outline-none">
                      <option value="">—</option>
                      {["Serein(e)","Reconnaissant(e)","Inquiet(e)","En deuil","Joyeux(se)","Confiant(e)","Questionneur(se)"].map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>
                  <button onClick={saveJournal} disabled={!journalContent.trim() || journalSaving}
                    className="w-full py-2.5 rounded-xl bg-arc-navy text-white text-sm font-semibold hover:bg-arc-blue disabled:opacity-40 transition">
                    {journalSaving ? "Enregistrement…" : "Enregistrer + Réflexion IA 🙏"}
                  </button>
                </div>
              </div>

              {journalLoading && <div className="text-center py-6 text-arc-text2 text-sm">Chargement…</div>}
              <div className="space-y-3">
                {journalEntries.map(e => (
                  <div key={e.id} className="bg-white border border-arc-border rounded-xl p-4 cursor-pointer hover:border-arc-navy transition"
                    onClick={() => setSelectedEntry(e)}>
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-xs font-semibold text-arc-blue">{new Date(e.date).toLocaleDateString("fr-CH", { weekday: "long", day: "numeric", month: "long" })}</p>
                        <p className="text-sm text-slate-700 mt-1 line-clamp-2">{e.content}</p>
                      </div>
                      {e.mood && <span className="text-xs text-arc-text3 shrink-0 ml-2">{e.mood}</span>}
                    </div>
                    {e.ai_reflection && (
                      <div className="mt-2 pt-2 border-t border-arc-border">
                        <p className="text-xs text-arc-text2 italic line-clamp-1">✦ {e.ai_reflection}</p>
                      </div>
                    )}
                  </div>
                ))}
                {!journalLoading && journalEntries.length === 0 && (
                  <div className="text-center py-12 text-arc-text2">
                    <p className="text-4xl mb-3">📓</p>
                    <p className="font-semibold">Journal vide</p>
                    <p className="text-sm mt-1">Commencez à noter vos pensées et réflexions spirituelles</p>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div>
              <button onClick={() => setSelectedEntry(null)} className="mb-4 text-sm text-arc-blue hover:underline">← Retour</button>
              <p className="text-xs font-semibold text-arc-blue mb-2">{new Date(selectedEntry.date).toLocaleDateString("fr-CH", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</p>
              {selectedEntry.mood && <p className="text-xs text-arc-text3 mb-3">Humeur : {selectedEntry.mood}</p>}
              <div className="bg-white border border-arc-border rounded-xl p-4 mb-4">
                <p className="em-reading-zone em-reading-text text-slate-700 whitespace-pre-wrap">{selectedEntry.content}</p>
              </div>
              {selectedEntry.ai_reflection ? (
                <div className="bg-arc-blueBg border border-arc-bluePale rounded-xl p-4">
                  <p className="text-xs font-bold text-arc-navy mb-2">✦ Réflexion IA</p>
                  <p className="em-reading-zone em-reading-text text-slate-700 italic">{selectedEntry.ai_reflection}</p>
                </div>
              ) : (
                <button onClick={() => generateReflection(selectedEntry.id)} disabled={reflectionLoading}
                  className="w-full py-2.5 rounded-xl border border-arc-border text-sm font-semibold text-arc-navy hover:bg-arc-blueBg disabled:opacity-40 transition">
                  {reflectionLoading ? "Génération…" : "✦ Générer une réflexion IA"}
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── EVENTS ──────────────────────────────────────────── */}
      {tab === "events" && (
        <div className="flex-1 overflow-y-auto px-4 md:px-6 py-5">
          <div className="flex gap-2 mb-5">
            <input value={eventQuery} onChange={e => setEventQuery(e.target.value)}
              onKeyDown={e => e.key === "Enter" && loadEvents(eventQuery)}
              placeholder="Rechercher des événements chrétiens…"
              className="flex-1 px-4 py-2.5 rounded-xl border border-arc-border text-sm outline-none focus:border-arc-navy transition" />
            <button onClick={() => loadEvents(eventQuery)} disabled={eventsLoading}
              className="px-4 py-2.5 rounded-xl bg-arc-navy text-white text-sm font-semibold hover:bg-arc-blue disabled:opacity-40 transition">
              {eventsLoading ? "…" : "🔍"}
            </button>
          </div>

          {churchEvents.length > 0 && (
            <div className="mb-5">
              <p className="text-xs font-bold text-arc-navy uppercase tracking-wider mb-3">🏛️ Église ARC</p>
              <div className="space-y-2">
                {churchEvents.map(ev => (
                  <div key={ev.id} className="bg-white border border-arc-border rounded-xl p-4">
                    <div className="flex items-start gap-3">
                      <div className="text-center shrink-0">
                        <p className="font-serif text-2xl font-bold text-arc-navy leading-none">{new Date(ev.date).getDate()}</p>
                        <p className="text-xs text-arc-blue font-bold uppercase">{new Date(ev.date).toLocaleDateString("fr-CH", { month: "short" })}</p>
                      </div>
                      <div>
                        <p className="font-semibold text-arc-navy text-sm">{ev.title}</p>
                        <p className="text-xs text-arc-text2">{ev.time_start?.slice(0, 5)} · {ev.location}</p>
                        {ev.price_chf !== null && ev.price_chf > 0 && <p className="text-xs text-arc-text3 mt-0.5">CHF {ev.price_chf}</p>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {(webResults as { title: string; url: string; snippet: string; source?: string }[]).length > 0 && (
            <div>
              <p className="text-xs font-bold text-arc-navy uppercase tracking-wider mb-3">🌐 Région / Web</p>
              <p className="text-xs text-arc-text3 mb-3">⚠️ Informations issues du web — vérifiez auprès des organisateurs</p>
              <div className="space-y-2">
                {(webResults as { title: string; url: string; snippet: string; source?: string }[]).map((r, i) => (
                  <a key={i} href={r.url} target="_blank" rel="noopener noreferrer"
                    className="block bg-white border border-arc-border rounded-xl p-4 hover:border-arc-navy transition">
                    <p className="font-semibold text-arc-navy text-sm">{r.title}</p>
                    {r.snippet && <p className="text-xs text-arc-text2 mt-1 line-clamp-2">{r.snippet}</p>}
                    <p className="text-xs text-arc-blue mt-1">{r.source ?? r.url}</p>
                  </a>
                ))}
              </div>
            </div>
          )}

          {eventsLoading && <div className="text-center py-8 text-arc-text2 text-sm">Chargement…</div>}
          {!eventsLoading && churchEvents.length === 0 && webResults.length === 0 && (
            <div className="text-center py-12 text-arc-text2">
              <p className="text-4xl mb-3">📅</p>
              <p className="font-semibold">Aucun événement trouvé</p>
              <p className="text-sm mt-1">Essayez une recherche comme "conférence évangélique 2026"</p>
            </div>
          )}
        </div>
      )}

      {/* ── MEDIA ───────────────────────────────────────────── */}
      {tab === "media" && (
        <div className="flex-1 overflow-y-auto px-4 md:px-6 py-5">
          <div className="flex gap-2 mb-5">
            <input value={mediaQuery} onChange={e => setMediaQuery(e.target.value)}
              onKeyDown={e => e.key === "Enter" && loadMedia(mediaQuery)}
              placeholder="Thème ou passage (ex: grâce, Jean 3…)"
              className="flex-1 px-4 py-2.5 rounded-xl border border-arc-border text-sm outline-none focus:border-arc-navy transition" />
            <button onClick={() => loadMedia(mediaQuery)} disabled={mediaLoading}
              className="px-4 py-2.5 rounded-xl bg-arc-navy text-white text-sm font-semibold hover:bg-arc-blue disabled:opacity-40 transition">
              {mediaLoading ? "…" : "Trouver"}
            </button>
          </div>

          {mediaLoading && <div className="text-center py-8 text-arc-text2 text-sm">Recherche en cours…</div>}

          <div className="space-y-3">
            {media.map((m, i) => {
              const typeIcon: Record<string, string> = {
                sermon: "🎙", sermon_ext: "🎙", video: "🎬", podcast: "🎧",
                article: "📄", book: "📚", audio_bible: "🔊", commentary: "📖", course: "🎓",
              }
              return (
                <div key={i} className={`bg-white border rounded-xl p-4 ${m.saved ? "border-arc-gold/40 bg-arc-gold/5" : "border-arc-border"}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-lg">{typeIcon[m.type] ?? "📄"}</span>
                        <span className="text-xs font-bold text-arc-blue uppercase tracking-wide">{m.type}</span>
                        {m.source === "arc" && <span className="text-xs bg-arc-navy/10 text-arc-navy px-2 py-0.5 rounded-full font-semibold">ARC</span>}
                      </div>
                      <p className="font-semibold text-arc-navy text-sm">{m.title}</p>
                      {m.author && <p className="text-xs text-arc-text2 mt-0.5">{m.author}</p>}
                      <p className="text-xs text-slate-600 mt-1 line-clamp-2">{m.description}</p>
                    </div>
                    <div className="shrink-0 flex flex-col gap-2">
                      {m.url && (
                        <a href={m.url} target="_blank" rel="noopener noreferrer"
                          className="text-xs px-2 py-1 rounded-lg bg-arc-navy text-white hover:bg-arc-blue transition">
                          Voir →
                        </a>
                      )}
                      {!m.saved && (
                        <button onClick={async () => {
                          await fetch("/api/bible-ai/media", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "save", recommendation: m }) })
                          setMedia(prev => prev.map((r, j) => j === i ? { ...r, saved: true } : r))
                        }} className="text-xs px-2 py-1 rounded-lg border border-arc-border text-arc-text2 hover:text-arc-navy transition">
                          Sauver
                        </button>
                      )}
                    </div>
                  </div>
                  {m.verse_refs.length > 0 && (
                    <div className="mt-2 flex gap-1 flex-wrap">
                      {m.verse_refs.slice(0, 3).map(ref => (
                        <span key={ref} className="text-[10px] bg-arc-blueBg text-arc-navy px-2 py-0.5 rounded-full">{ref}</span>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}

            {!mediaLoading && media.length === 0 && (
              <div className="text-center py-12 text-arc-text2">
                <p className="text-4xl mb-3">🎵</p>
                <p className="font-semibold">Aucune recommandation</p>
                <p className="text-sm mt-1">Entrez un thème ou cliquez sur Trouver</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── GROUPS ──────────────────────────────────────────── */}
      {tab === "groups" && !activeGroup && (
        <div className="flex-1 overflow-y-auto px-4 md:px-6 py-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="font-serif font-semibold text-arc-navy">Groupes d&apos;étude biblique</p>
              <p className="text-xs text-arc-text2 mt-0.5">Rejoignez un groupe pour étudier la Bible ensemble</p>
            </div>
            <button onClick={() => setShowNewGroup(v => !v)} className="text-xs px-3 py-1.5 rounded-lg bg-arc-navy text-white hover:bg-arc-blue transition">+ Nouveau</button>
          </div>

          {showNewGroup && (
            <div className="bg-arc-blueBg border border-arc-navy/20 rounded-xl p-4 mb-4 space-y-2">
              <p className="text-sm font-semibold text-arc-navy">Créer un groupe</p>
              <input value={newGroupName} onChange={e => setNewGroupName(e.target.value)}
                placeholder="Nom du groupe *" className="w-full px-3 py-2 rounded-lg border border-arc-border text-sm outline-none focus:border-arc-navy" />
              <input value={newGroupDesc} onChange={e => setNewGroupDesc(e.target.value)}
                placeholder="Description (optionnelle)" className="w-full px-3 py-2 rounded-lg border border-arc-border text-sm outline-none focus:border-arc-navy" />
              <div className="flex gap-2">
                <button onClick={createGroup} disabled={!newGroupName.trim()} className="px-4 py-1.5 rounded-lg bg-arc-navy text-white text-xs font-semibold disabled:opacity-40 hover:bg-arc-blue transition">Créer</button>
                <button onClick={() => setShowNewGroup(false)} className="px-4 py-1.5 rounded-lg border border-arc-border text-xs text-arc-text2 hover:text-arc-navy transition">Annuler</button>
              </div>
            </div>
          )}

          {groupsLoading && <div className="text-center py-8 text-arc-text2 text-sm">Chargement…</div>}
          {!groupsLoading && groups.length === 0 && (
            <div className="text-center py-12 text-arc-text2">
              <p className="text-4xl mb-3">👥</p>
              <p className="font-semibold">Aucun groupe actif</p>
              <p className="text-sm mt-1">Créez le premier groupe d&apos;étude !</p>
            </div>
          )}

          <div className="space-y-3">
            {groups.map(g => (
              <div key={g.id} className="bg-white border border-arc-border rounded-xl p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-arc-navy text-sm">{g.name}</span>
                      {g.is_member && <span className="text-[10px] bg-arc-blue/10 text-arc-blue px-2 py-0.5 rounded-full font-bold">Membre</span>}
                    </div>
                    {g.description && <p className="text-xs text-slate-500 mb-1.5 line-clamp-2">{g.description}</p>}
                    <div className="flex items-center gap-3 text-[10px] text-arc-text2">
                      <span>👤 {g.member_count}/{g.max_members}</span>
                      <span>🌐 {g.language.toUpperCase()}</span>
                      <span>📚 {g.level}</span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5 shrink-0">
                    {g.is_member && (
                      <button onClick={() => { setActiveGroup(g); loadGroupMessages(g.id) }}
                        className="text-xs px-3 py-1 rounded-lg bg-arc-navy text-white hover:bg-arc-blue transition">
                        Ouvrir →
                      </button>
                    )}
                    <button onClick={() => joinLeaveGroup(g)}
                      className={`text-xs px-3 py-1 rounded-lg border transition ${g.is_member ? "border-red-200 text-red-500 hover:bg-red-50" : "border-arc-navy text-arc-navy hover:bg-arc-blueBg"}`}>
                      {g.is_member ? "Quitter" : "Rejoindre"}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === "groups" && activeGroup && (
        <div className="flex flex-col flex-1 min-h-0">
          <div className="shrink-0 px-4 py-2 border-b border-arc-navy/10 bg-white">
            <div className="flex items-center gap-3 mb-2">
              <button onClick={() => { setActiveGroup(null); setGroupMsgs([]); setGroupPlans([]); setActivePlanId(null); setGroupSubTab("chat") }} className="text-arc-text2 hover:text-arc-navy text-lg">←</button>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-arc-navy text-sm truncate">{activeGroup.name}</p>
                <p className="text-[10px] text-arc-text2">{activeGroup.member_count} membre{activeGroup.member_count !== 1 ? "s" : ""}</p>
              </div>
            </div>
            <div className="flex gap-1">
              {(["chat","plans"] as const).map(st => (
                <button key={st} onClick={() => setGroupSubTab(st)}
                  className={`text-xs px-3 py-1 rounded-full font-semibold transition ${groupSubTab === st ? "bg-arc-navy text-white" : "text-arc-text2 hover:text-arc-navy"}`}>
                  {st === "chat" ? "💬 Chat" : "📅 Plans partagés"}
                </button>
              ))}
            </div>
          </div>

          {groupSubTab === "chat" && (<>
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
              {groupMsgsLoading && <div className="text-center py-6 text-arc-text2 text-sm">Chargement…</div>}
              {!groupMsgsLoading && groupMsgs.length === 0 && (
                <div className="text-center py-10 text-arc-text2">
                  <p className="text-3xl mb-2">👋</p>
                  <p className="text-sm">Soyez le premier à écrire dans ce groupe !</p>
                </div>
              )}
              {groupMsgs.map(m => {
                const isMine = m.user_id === userId
                const name = m.profiles ? `${m.profiles.first_name ?? ""} ${m.profiles.last_name ?? ""}`.trim() || "Membre" : isMine ? "Moi" : "Membre"
                return (
                  <div key={m.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[78%] rounded-2xl px-4 py-2.5 text-sm ${isMine ? "bg-arc-navy text-white rounded-br-sm" : "bg-slate-50 border border-slate-200 text-slate-800 rounded-bl-sm"}`}>
                      {!isMine && <p className="text-[10px] font-bold text-arc-blue mb-1">{name}</p>}
                      <p>{m.content}</p>
                      {m.verse_refs.length > 0 && <p className="text-[10px] mt-1 opacity-70">{m.verse_refs.join(" · ")}</p>}
                      <p className={`text-[10px] mt-1 ${isMine ? "text-white/60" : "text-slate-400"}`}>{new Date(m.created_at).toLocaleTimeString("fr-CH", { hour: "2-digit", minute: "2-digit" })}</p>
                    </div>
                  </div>
                )
              })}
              <div ref={groupBottomRef} />
            </div>
            <div className="shrink-0 border-t border-arc-navy/10 bg-white px-4 py-3">
              <div className="flex items-end gap-2">
                <textarea value={groupDraft} rows={2} onChange={e => setGroupDraft(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendGroupMessage() } }}
                  placeholder="Message au groupe… (Entrée pour envoyer)"
                  className="flex-1 resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-arc-blue focus:bg-white transition" />
                <button onClick={sendGroupMessage} disabled={!groupDraft.trim() || groupSending}
                  className="h-10 w-10 shrink-0 flex items-center justify-center rounded-xl bg-arc-navy text-white hover:bg-arc-blue disabled:opacity-40 transition">
                  <SendIcon />
                </button>
              </div>
            </div>
          </>)}

          {groupSubTab === "plans" && (
            <div className="flex-1 overflow-y-auto px-4 py-4">
              {activePlanId ? (() => {
                const plan = groupPlans.find(p => p.id === activePlanId)
                if (!plan) return null
                const me = memberProgress.find(m => m.is_me)
                return (
                  <div>
                    <button onClick={() => { setActivePlanId(null); setMemberProgress([]) }} className="text-sm text-arc-blue hover:underline mb-3">← Plans du groupe</button>
                    <p className="font-semibold text-arc-navy mb-1">{plan.title}</p>
                    <p className="text-xs text-arc-text2 mb-3">{plan.duration_days} jours · Niveau {plan.level}</p>

                    {/* Ma progression */}
                    <div className="mb-4 bg-arc-blueBg rounded-xl p-3">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-xs font-semibold text-arc-navy">Ma progression</p>
                        <p className="text-xs text-arc-text2">{plan.my_completed}/{plan.duration_days} jours</p>
                      </div>
                      <div className="w-full bg-white rounded-full h-2">
                        <div className="bg-arc-navy h-2 rounded-full transition-all" style={{ width: `${Math.round((plan.my_completed / plan.duration_days) * 100)}%` }} />
                      </div>
                    </div>

                    {/* Progressions des membres */}
                    {memberProgress.length > 0 && (
                      <div className="mb-4 space-y-2">
                        <p className="text-xs font-semibold text-arc-navy">Progression du groupe</p>
                        {memberProgress.sort((a, b) => b.completed_days - a.completed_days).map((m, i) => (
                          <div key={i} className="flex items-center gap-3">
                            <p className="text-xs text-arc-text2 w-24 truncate">{m.is_me ? "Moi" : m.name}</p>
                            <div className="flex-1 bg-slate-100 rounded-full h-1.5">
                              <div className="bg-arc-blue h-1.5 rounded-full" style={{ width: `${Math.round((m.completed_days / plan.duration_days) * 100)}%` }} />
                            </div>
                            <p className="text-[10px] text-arc-text2 w-10 text-right">{m.completed_days}j</p>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Jours à compléter */}
                    <p className="text-xs font-semibold text-arc-navy mb-2">Marquer les jours</p>
                    <div className="grid grid-cols-7 gap-1.5">
                      {Array.from({ length: plan.duration_days }, (_, i) => i + 1).map(day => {
                        const me2 = memberProgress.find(m => m.is_me)
                        const done = me2 ? me2.completed_days >= day : (plan.my_completed >= day)
                        return (
                          <button key={day} disabled={done || syncingDay === day}
                            onClick={() => syncProgress(plan.id, day, plan.duration_days)}
                            className={`aspect-square rounded-lg text-xs font-semibold transition ${done ? "bg-green-500 text-white" : "bg-slate-100 text-arc-navy hover:bg-arc-blueBg"} ${syncingDay === day ? "opacity-50" : ""}`}>
                            {day}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )
              })() : (
                <>
                  {groupPlansLoading && <div className="text-center py-8 text-arc-text2 text-sm">Chargement…</div>}
                  {!groupPlansLoading && groupPlans.length === 0 && (
                    <div className="text-center py-10 text-arc-text2">
                      <p className="text-3xl mb-2">📅</p>
                      <p className="text-sm font-semibold">Aucun plan partagé</p>
                      <p className="text-xs mt-1">Partagez un plan depuis l&apos;onglet Plans</p>
                    </div>
                  )}
                  <div className="space-y-3">
                    {groupPlans.map(p => (
                      <div key={p.id} className="bg-white border border-arc-border rounded-xl p-4 cursor-pointer hover:border-arc-navy transition"
                        onClick={() => { setActivePlanId(p.id); loadMemberProgress(p.id) }}>
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <p className="font-semibold text-arc-navy text-sm">{p.title}</p>
                            <p className="text-xs text-arc-text2 mt-0.5">{p.duration_days} jours · {p.level}{p.focus ? ` · ${p.focus}` : ""}</p>
                          </div>
                          <span className="text-xs text-arc-blue">→</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="flex-1 bg-slate-100 rounded-full h-1.5">
                            <div className="bg-arc-navy h-1.5 rounded-full" style={{ width: `${Math.round((p.my_completed / p.duration_days) * 100)}%` }} />
                          </div>
                          <p className="text-[10px] text-arc-text2 shrink-0">{p.my_completed}/{p.duration_days}j</p>
                          <p className="text-[10px] text-arc-text2 shrink-0">👥 {p.active_members}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── SERMONS ─────────────────────────────────────────── */}
      {tab === "sermons" && (
        <div className="flex-1 overflow-y-auto px-4 md:px-6 py-5">
          <div className="mb-4">
            <p className="font-serif font-semibold text-arc-navy">Résumés IA de sermons</p>
            <p className="text-xs text-arc-text2 mt-0.5">Générez un résumé structuré et les versets clés pour chaque sermon</p>
          </div>

          {sermonsLoading && <div className="text-center py-8 text-arc-text2 text-sm">Chargement des sermons…</div>}
          {!sermonsLoading && dbSermons.length === 0 && (
            <div className="text-center py-12 text-arc-text2">
              <p className="text-4xl mb-3">🎙</p>
              <p className="font-semibold">Aucun sermon publié</p>
              <p className="text-sm mt-1">Publiez des sermons depuis l&apos;espace admin</p>
            </div>
          )}

          <div className={`${activeSermon ? "grid md:grid-cols-2 gap-4" : "space-y-2"}`}>
            <div className={activeSermon ? "space-y-2" : "space-y-2"}>
              {dbSermons.map(s => (
                <button key={s.id} onClick={() => openSermon(s)}
                  className={`w-full text-left rounded-xl border px-4 py-3 transition ${activeSermon?.id === s.id ? "border-arc-navy bg-arc-blueBg" : "border-arc-border bg-white hover:border-arc-navy/40"}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold text-arc-navy text-sm truncate">{s.title}</p>
                      <p className="text-xs text-arc-text2 mt-0.5">{s.pastor ?? ""} · {new Date(s.date).toLocaleDateString("fr-CH")}</p>
                    </div>
                    {s.has_summary && <span className="shrink-0 text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-semibold">✓ Résumé</span>}
                  </div>
                </button>
              ))}
            </div>

            {activeSermon && (
              <div className="bg-white border border-arc-border rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="font-semibold text-arc-navy text-sm">{activeSermon.title}</p>
                  <button onClick={() => { setActiveSermon(null); setSermonSummary(null) }} className="text-arc-text2 hover:text-arc-navy text-lg leading-none">✕</button>
                </div>

                {summaryLoading && (
                  <div className="text-center py-8 text-arc-text2 text-sm">
                    <Spinner /> <span className="ml-2">Génération en cours…</span>
                  </div>
                )}

                {!summaryLoading && !sermonSummary && (
                  <div className="text-center py-6">
                    <p className="text-sm text-arc-text2 mb-4">Aucun résumé disponible pour ce sermon.</p>
                    <button onClick={generateSermonSummary} className="px-4 py-2 rounded-lg bg-arc-navy text-white text-sm font-semibold hover:bg-arc-blue transition">
                      ✦ Générer avec l&apos;IA
                    </button>
                  </div>
                )}

                {!summaryLoading && sermonSummary && (
                  <div className="space-y-4">
                    {sermonSummary.cached && <p className="text-[10px] text-arc-text2 italic">Résumé en cache</p>}
                    <div>
                      <p className="text-xs font-bold text-arc-navy uppercase tracking-wide mb-2">Résumé</p>
                      <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">{sermonSummary.summary}</p>
                    </div>
                    {sermonSummary.key_verses.length > 0 && (
                      <div>
                        <p className="text-xs font-bold text-arc-navy uppercase tracking-wide mb-2">Versets clés</p>
                        <div className="flex flex-wrap gap-1.5">
                          {sermonSummary.key_verses.map((v, i) => (
                            <button key={i} onClick={() => openVersePopup(v)}
                              className="text-xs bg-arc-gold/10 text-arc-navy border border-arc-gold/30 px-2.5 py-1 rounded-full hover:bg-arc-gold/20 transition cursor-pointer">
                              📖 {v}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                    {sermonSummary.themes.length > 0 && (
                      <div>
                        <p className="text-xs font-bold text-arc-navy uppercase tracking-wide mb-2">Thèmes</p>
                        <div className="flex flex-wrap gap-1.5">
                          {sermonSummary.themes.map((t, i) => (
                            <button key={i} onClick={() => openThemePopup(t)}
                              className="text-xs bg-arc-blueBg text-arc-navy px-2.5 py-1 rounded-full hover:bg-arc-navy/10 transition cursor-pointer border border-transparent hover:border-arc-navy/20">
                              🔍 {t}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                    <button onClick={generateSermonSummary} className="text-xs text-arc-text2 hover:text-arc-navy underline">↺ Régénérer</button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── POPUP VERSET ────────────────────────────────────── */}
      {versePopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setVersePopup(null)}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div className="relative bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-arc-blue mb-1">Verset</p>
                <p className="font-serif font-semibold text-arc-navy text-base">{versePopup.ref}</p>
              </div>
              <button onClick={() => setVersePopup(null)} className="text-arc-text2 hover:text-arc-navy text-xl leading-none ml-4">✕</button>
            </div>
            {verseLoading && !versePopup.text ? (
              <div className="flex items-center gap-2 py-4 text-arc-text2 text-sm"><Spinner /> Chargement…</div>
            ) : (
              <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">{versePopup.text}</p>
            )}
            <button onClick={() => { setVersePopup(null); sendChat(`Explique-moi ${versePopup.ref} dans son contexte`) }}
              className="mt-4 w-full py-2 rounded-xl bg-arc-navy text-white text-xs font-semibold hover:bg-arc-blue transition">
              💬 Étudier ce verset
            </button>
          </div>
        </div>
      )}

      {/* ── POPUP THÈME ─────────────────────────────────────── */}
      {themePopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setThemePopup(null)}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div className="relative bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-4 shrink-0">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-arc-blue mb-1">Thème biblique</p>
                <p className="font-serif font-semibold text-arc-navy text-base">{themePopup.theme}</p>
              </div>
              <button onClick={() => setThemePopup(null)} className="text-arc-text2 hover:text-arc-navy text-xl leading-none ml-4">✕</button>
            </div>
            {themeLoading && !themePopup.result ? (
              <div className="flex items-center gap-2 py-4 text-arc-text2 text-sm"><Spinner /> Recherche en cours…</div>
            ) : (
              <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line overflow-y-auto">{themePopup.result}</p>
            )}
            <button onClick={() => { setThemePopup(null); sendChat(`Approfondis le thème "${themePopup.theme}" avec des références bibliques`) }}
              className="mt-4 shrink-0 w-full py-2 rounded-xl bg-arc-navy text-white text-xs font-semibold hover:bg-arc-blue transition">
              💬 Approfondir ce thème
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
