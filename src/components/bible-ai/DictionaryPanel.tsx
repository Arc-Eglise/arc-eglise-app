"use client"
import { useState, useEffect, useCallback } from "react"

/* ── Types ── */
interface TheologicalTerm {
  id: string; term: string; slug: string; short_def: string
  definition?: string; extended?: string; category: string
  key_verses: string[]; related_terms: string[]
}

interface BiblePersonCandidate {
  id: string; name: string; brief: string; testament: string; era: string; main_book?: string
}

interface BiblePersonBook {
  book: string; chapters: string; key_verses: string[]
}

interface BiblePerson {
  name: string; identifier: string; era: string; testament: string
  short_bio: string; full_story: string; character: string; legacy: string
  books: BiblePersonBook[]; related_persons: string[]; themes: string[]
}

const CATEGORY_LABELS: Record<string, string> = {
  "soteriologie": "Sotériologie", "christologie": "Christologie",
  "pneumatologie": "Pneumatologie", "ecclesiologie": "Ecclésiologie",
  "eschatologie": "Eschatologie", "theologie-fondamentale": "Fondamental",
  "bibliologie": "Bibliologie", "anthropologie": "Anthropologie",
  "vie-chretienne": "Vie chrétienne", "general": "Général",
}
const CATEGORY_ICONS: Record<string, string> = {
  "soteriologie": "✝️", "christologie": "👑", "pneumatologie": "🕊️",
  "ecclesiologie": "⛪", "eschatologie": "🌅", "theologie-fondamentale": "📖",
  "bibliologie": "📜", "anthropologie": "👤", "vie-chretienne": "🙏", "general": "📚",
}
const TESTAMENT_COLORS: Record<string, { bg: string; color: string }> = {
  "AT":    { bg: "#fef9ed", color: "#92400e" },
  "NT":    { bg: "#eff6ff", color: "#1d4ed8" },
  "AT+NT": { bg: "#f0fdf4", color: "#166534" },
}

interface DictionaryPanelProps {
  language?: string
  onCiteVerse?: (ref: string) => void
}

/* ══════════════════════════════════════════════════════════════════ */
export default function DictionaryPanel({ language = "fr", onCiteVerse }: DictionaryPanelProps) {
  const [mode, setMode] = useState<"terms" | "persons">("terms")

  return (
    <div className="h-full flex flex-col">
      {/* Toggle mode */}
      <div className="flex gap-1 p-2 border-b border-gray-100 shrink-0">
        <button onClick={() => setMode("terms")}
          className={`flex-1 text-xs py-1.5 rounded-lg font-semibold transition-colors ${mode === "terms" ? "bg-indigo-600 text-white" : "text-gray-500 hover:bg-gray-100"}`}>
          📚 Termes théologiques
        </button>
        <button onClick={() => setMode("persons")}
          className={`flex-1 text-xs py-1.5 rounded-lg font-semibold transition-colors ${mode === "persons" ? "bg-arc-navy text-white" : "text-gray-500 hover:bg-gray-100"}`}>
          👤 Personnes bibliques
        </button>
      </div>

      {mode === "terms"
        ? <TermsPanel language={language} onCiteVerse={onCiteVerse} />
        : <PersonsPanel language={language} onCiteVerse={onCiteVerse} />
      }
    </div>
  )
}

/* ══ TERMES THÉOLOGIQUES ══════════════════════════════════════════ */
function TermsPanel({ language, onCiteVerse }: DictionaryPanelProps) {
  const [terms, setTerms]           = useState<TheologicalTerm[]>([])
  const [filtered, setFiltered]     = useState<TheologicalTerm[]>([])
  const [selected, setSelected]     = useState<TheologicalTerm | null>(null)
  const [search, setSearch]         = useState("")
  const [category, setCategory]     = useState("all")
  const [loading, setLoading]       = useState(true)
  const [detailLoading, setDetailLoading] = useState(false)

  useEffect(() => {
    fetch(`/api/bible-ai/dictionary?lang=${language}`)
      .then(r => r.json())
      .then(d => { setTerms(d.results ?? []); setFiltered(d.results ?? []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [language])

  const doFilter = useCallback((q: string, cat: string, list: TheologicalTerm[]) => {
    let r = list
    if (cat !== "all") r = r.filter(t => t.category === cat)
    if (q.trim()) r = r.filter(t => t.term.toLowerCase().includes(q.toLowerCase()) || t.short_def.toLowerCase().includes(q.toLowerCase()))
    setFiltered(r)
  }, [])

  const handleSearch = (q: string) => { setSearch(q); doFilter(q, category, terms) }
  const handleCat    = (cat: string) => { setCategory(cat); doFilter(search, cat, terms) }

  const handleSelect = async (t: TheologicalTerm) => {
    if (t.definition) { setSelected(t); return }
    setDetailLoading(true)
    const r = await fetch("/api/bible-ai/dictionary", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ term: t.term, lang: language }),
    }).then(res => res.json())
    if (r.term) setSelected(r.term)
    setDetailLoading(false)
  }

  const cats = ["all", ...Array.from(new Set(terms.map(t => t.category)))]

  if (loading) return <div className="flex items-center justify-center h-48 text-gray-400 text-sm">Chargement du dictionnaire…</div>

  if (selected) return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      <button onClick={() => setSelected(null)} className="flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-800">
        ← Retour au dictionnaire
      </button>
      <div className="bg-indigo-50 rounded-xl p-4 border border-indigo-100">
        <div className="flex items-start justify-between mb-1">
          <h2 className="text-xl font-bold text-indigo-900">{selected.term}</h2>
          <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded-full">{CATEGORY_LABELS[selected.category] ?? selected.category}</span>
        </div>
        <p className="text-indigo-700 italic text-sm">{selected.short_def}</p>
      </div>

      {detailLoading
        ? <div className="text-gray-400 text-sm text-center py-8">Génération de la définition…</div>
        : <>
          {selected.definition && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Définition</h3>
              <p className="text-gray-800 leading-relaxed text-sm">{selected.definition}</p>
            </div>
          )}
          {selected.extended && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Approfondissement</h3>
              <p className="text-gray-700 leading-relaxed text-sm">{selected.extended}</p>
            </div>
          )}
          {selected.key_verses?.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Versets clés</h3>
              <div className="flex flex-wrap gap-2">
                {selected.key_verses.map((v, i) => (
                  <button key={i} onClick={() => onCiteVerse?.(v)}
                    className="text-xs bg-blue-50 text-blue-700 border border-blue-200 px-3 py-1 rounded-full hover:bg-blue-100 transition-colors">
                    📖 {v}
                  </button>
                ))}
              </div>
            </div>
          )}
          {selected.related_terms?.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Termes liés</h3>
              <div className="flex flex-wrap gap-2">
                {selected.related_terms.map((t, i) => {
                  const found = terms.find(term => term.term.toLowerCase() === t.toLowerCase())
                  return (
                    <button key={i} onClick={() => found ? handleSelect(found) : handleSearch(t)}
                      className="text-xs bg-purple-50 text-purple-700 border border-purple-200 px-3 py-1 rounded-full hover:bg-purple-100 transition-colors">
                      {t}
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </>
      }
    </div>
  )

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="p-3 border-b border-gray-100 shrink-0">
        <input type="text" value={search} onChange={e => handleSearch(e.target.value)}
          placeholder="Rechercher un terme théologique…"
          className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-300" />
      </div>
      <div className="flex gap-1.5 p-2 border-b border-gray-100 overflow-x-auto no-scrollbar shrink-0">
        {cats.map(cat => (
          <button key={cat} onClick={() => handleCat(cat)}
            className={`shrink-0 text-xs px-2.5 py-1 rounded-full transition-colors ${category === cat ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
            {cat === "all" ? "Tous" : `${CATEGORY_ICONS[cat] ?? ""} ${CATEGORY_LABELS[cat] ?? cat}`}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {filtered.length === 0
          ? <div className="text-center text-gray-400 text-sm py-8">{search ? `Aucun terme pour "${search}"` : "Aucun terme dans cette catégorie"}</div>
          : filtered.map(t => (
            <button key={t.id} onClick={() => handleSelect(t)}
              className="w-full text-left p-3 rounded-lg border border-gray-100 hover:border-indigo-200 hover:bg-indigo-50 transition-colors">
              <div className="flex items-center justify-between mb-1">
                <span className="font-semibold text-sm text-gray-900">{t.term}</span>
                <span className="text-xs text-gray-400">{CATEGORY_ICONS[t.category] ?? ""} {CATEGORY_LABELS[t.category] ?? t.category}</span>
              </div>
              <p className="text-xs text-gray-600 line-clamp-2">{t.short_def}</p>
            </button>
          ))
        }
      </div>
      <div className="p-2 border-t border-gray-100 text-center shrink-0">
        <p className="text-xs text-gray-400">{filtered.length} terme{filtered.length !== 1 ? "s" : ""} · Tradition évangélique réformée</p>
      </div>
    </div>
  )
}

/* ══ PERSONNES BIBLIQUES ═════════════════════════════════════════ */
function PersonsPanel({ language, onCiteVerse }: DictionaryPanelProps) {
  const [search, setSearch]             = useState("")
  const [searching, setSearching]       = useState(false)
  const [candidates, setCandidates]     = useState<BiblePersonCandidate[] | null>(null)
  const [selected, setSelected]         = useState<BiblePerson | null>(null)
  const [profileLoading, setProfileLoading] = useState(false)
  const [searchedName, setSearchedName] = useState("")

  const doSearch = async (name: string) => {
    if (!name.trim()) return
    setSearching(true); setCandidates(null); setSelected(null); setSearchedName(name)
    const r = await fetch("/api/bible-ai/dictionary", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "person", name, lang: language }),
    }).then(res => res.json())
    const list = (r.candidates ?? []) as BiblePersonCandidate[]
    setSearching(false)
    if (list.length === 1) {
      // Direct profile
      await loadProfile(name, list[0].id)
    } else {
      setCandidates(list)
    }
  }

  const loadProfile = async (name: string, identifier: string) => {
    setProfileLoading(true); setSearchedName(name)
    const r = await fetch("/api/bible-ai/dictionary", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "person", action: "get", name, identifier, lang: language }),
    }).then(res => res.json())
    setSelected(r.person ?? null)
    setCandidates(null)
    setProfileLoading(false)
  }

  const reset = () => { setSearch(""); setCandidates(null); setSelected(null); setSearchedName("") }

  /* ── Profil complet ── */
  if (profileLoading) return (
    <div className="flex-1 flex items-center justify-center flex-col gap-3">
      <div className="w-8 h-8 border-2 border-arc-navy border-t-transparent rounded-full animate-spin" />
      <p className="text-sm text-gray-500">Chargement du profil…</p>
    </div>
  )

  if (selected) {
    const tc = TESTAMENT_COLORS[selected.testament] ?? TESTAMENT_COLORS["AT"]
    return (
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <button onClick={reset} className="flex items-center gap-1 text-sm text-arc-blue hover:text-arc-navy">
          ← Nouvelle recherche
        </button>

        {/* Header */}
        <div className="bg-gradient-to-br from-arc-navy to-arc-blue rounded-xl p-5 text-white">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/50 mb-1">Personnage biblique</p>
              <h2 className="text-xl font-serif font-bold">{selected.name}</h2>
              <p className="text-white/70 text-xs mt-1">{selected.era}</p>
            </div>
            <span className="shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full" style={{ background: tc.bg, color: tc.color }}>
              {selected.testament}
            </span>
          </div>
          <p className="text-white/80 text-sm mt-3 leading-relaxed">{selected.short_bio}</p>
        </div>

        {/* Histoire */}
        <section>
          <h3 className="text-xs font-bold text-arc-navy uppercase tracking-wide mb-2">Histoire</h3>
          <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">{selected.full_story}</p>
        </section>

        {/* Livres & versets */}
        {selected.books?.length > 0 && (
          <section>
            <h3 className="text-xs font-bold text-arc-navy uppercase tracking-wide mb-3">Livres & versets</h3>
            <div className="space-y-3">
              {selected.books.map((b, i) => (
                <div key={i} className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-sm text-arc-navy">📖 {b.book}</span>
                    {b.chapters && <span className="text-xs text-gray-400">{b.chapters}</span>}
                  </div>
                  {b.key_verses?.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {b.key_verses.map((v, j) => (
                        <button key={j} onClick={() => onCiteVerse?.(v)}
                          className="text-xs bg-arc-gold/10 text-arc-navy border border-arc-gold/30 px-2 py-0.5 rounded-full hover:bg-arc-gold/20 transition">
                          {v}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Personnalité & héritage */}
        {selected.character && (
          <section>
            <h3 className="text-xs font-bold text-arc-navy uppercase tracking-wide mb-2">Personnalité & relation avec Dieu</h3>
            <p className="text-sm text-slate-700 leading-relaxed">{selected.character}</p>
          </section>
        )}
        {selected.legacy && (
          <section>
            <h3 className="text-xs font-bold text-arc-navy uppercase tracking-wide mb-2">Héritage & enseignement</h3>
            <p className="text-sm text-slate-700 leading-relaxed">{selected.legacy}</p>
          </section>
        )}

        {/* Thèmes */}
        {selected.themes?.length > 0 && (
          <section>
            <h3 className="text-xs font-bold text-arc-navy uppercase tracking-wide mb-2">Thèmes principaux</h3>
            <div className="flex flex-wrap gap-1.5">
              {selected.themes.map((t, i) => (
                <span key={i} className="text-xs bg-arc-blueBg text-arc-navy px-2.5 py-1 rounded-full">{t}</span>
              ))}
            </div>
          </section>
        )}

        {/* Personnes liées */}
        {selected.related_persons?.length > 0 && (
          <section>
            <h3 className="text-xs font-bold text-arc-navy uppercase tracking-wide mb-2">Personnes liées</h3>
            <div className="flex flex-wrap gap-1.5">
              {selected.related_persons.map((p, i) => (
                <button key={i} onClick={() => { reset(); setSearch(p); doSearch(p) }}
                  className="text-xs bg-purple-50 text-purple-700 border border-purple-200 px-2.5 py-1 rounded-full hover:bg-purple-100 transition">
                  👤 {p}
                </button>
              ))}
            </div>
          </section>
        )}
      </div>
    )
  }

  /* ── Sélection entre homonymes ── */
  if (candidates !== null) return (
    <div className="flex-1 overflow-y-auto p-4">
      <button onClick={reset} className="flex items-center gap-1 text-sm text-arc-blue hover:text-arc-navy mb-4">
        ← Retour
      </button>
      <p className="text-sm text-gray-500 mb-4">
        {candidates.length === 0
          ? `Aucun personnage biblique trouvé pour "${searchedName}".`
          : `${candidates.length} personnage${candidates.length > 1 ? "s" : ""} nommé${candidates.length > 1 ? "s" : ""} "${searchedName}" — lequel cherchez-vous ?`
        }
      </p>
      <div className="space-y-3">
        {candidates.map((c) => {
          const tc = TESTAMENT_COLORS[c.testament] ?? TESTAMENT_COLORS["AT"]
          return (
            <button key={c.id} onClick={() => loadProfile(searchedName, c.id)}
              className="w-full text-left rounded-xl border border-arc-border bg-white p-4 hover:border-arc-navy hover:bg-arc-blueBg transition">
              <div className="flex items-start justify-between gap-2 mb-1">
                <span className="font-serif font-semibold text-arc-navy text-base">{c.name}</span>
                <span className="shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: tc.bg, color: tc.color }}>{c.testament}</span>
              </div>
              <p className="text-xs text-gray-600 leading-relaxed">{c.brief}</p>
              {(c.era || c.main_book) && (
                <p className="text-[10px] text-gray-400 mt-1.5">{[c.era, c.main_book].filter(Boolean).join(" · ")}</p>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )

  /* ── Barre de recherche ── */
  return (
    <div className="flex-1 flex flex-col">
      <div className="p-4 border-b border-gray-100">
        <div className="flex gap-2">
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={e => e.key === "Enter" && doSearch(search)}
            placeholder="Nom d'un personnage biblique…"
            className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-arc-navy"
          />
          <button onClick={() => doSearch(search)} disabled={searching || !search.trim()}
            className="px-4 py-2 rounded-lg bg-arc-navy text-white text-sm font-semibold hover:bg-arc-blue transition disabled:opacity-50">
            {searching ? "…" : "🔍"}
          </button>
        </div>
        <p className="text-xs text-gray-400 mt-2">Ex : Abraham, Marie, Paul, Jean, Moïse, Ruth…</p>
      </div>

      {searching && (
        <div className="flex-1 flex items-center justify-center flex-col gap-3">
          <div className="w-8 h-8 border-2 border-arc-navy border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-500">Recherche en cours…</p>
        </div>
      )}

      {!searching && (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-6">
          <p className="text-5xl mb-4">👤</p>
          <p className="font-serif font-semibold text-arc-navy text-lg mb-2">Encyclopédie biblique</p>
          <p className="text-sm text-gray-500 max-w-xs">Recherchez n&apos;importe quel personnage biblique pour découvrir son histoire, les livres où il apparaît et ses versets clés.</p>
          <div className="flex flex-wrap gap-2 mt-4 justify-center">
            {["Abraham", "Moïse", "David", "Marie", "Paul", "Pierre", "Ruth", "Esther"].map(n => (
              <button key={n} onClick={() => { setSearch(n); doSearch(n) }}
                className="text-xs bg-arc-blueBg text-arc-navy px-3 py-1.5 rounded-full hover:bg-arc-navy hover:text-white transition">
                {n}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
