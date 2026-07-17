"use client"
import { useState, useEffect, useCallback } from "react"

interface TheologicalTerm {
  id: string
  term: string
  slug: string
  short_def: string
  definition?: string
  extended?: string
  category: string
  key_verses: string[]
  related_terms: string[]
}

const CATEGORY_LABELS: Record<string, string> = {
  "soteriologie": "Sotériologie",
  "christologie": "Christologie",
  "pneumatologie": "Pneumatologie",
  "ecclesiologie": "Ecclésiologie",
  "eschatologie": "Eschatologie",
  "theologie-fondamentale": "Fondamental",
  "bibliologie": "Bibliologie",
  "anthropologie": "Anthropologie",
  "vie-chretienne": "Vie chrétienne",
  "general": "Général",
}

const CATEGORY_ICONS: Record<string, string> = {
  "soteriologie": "✝️",
  "christologie": "👑",
  "pneumatologie": "🕊️",
  "ecclesiologie": "⛪",
  "eschatologie": "🌅",
  "theologie-fondamentale": "📖",
  "bibliologie": "📜",
  "anthropologie": "👤",
  "vie-chretienne": "🙏",
  "general": "📚",
}

interface DictionaryPanelProps {
  language?: string
  onCiteVerse?: (ref: string) => void
}

export default function DictionaryPanel({ language = "fr", onCiteVerse }: DictionaryPanelProps) {
  const [terms, setTerms] = useState<TheologicalTerm[]>([])
  const [filteredTerms, setFilteredTerms] = useState<TheologicalTerm[]>([])
  const [selectedTerm, setSelectedTerm] = useState<TheologicalTerm | null>(null)
  const [search, setSearch] = useState("")
  const [activeCategory, setActiveCategory] = useState<string>("all")
  const [loading, setLoading] = useState(true)
  const [detailLoading, setDetailLoading] = useState(false)

  useEffect(() => {
    fetch(`/api/bible-ai/dictionary?lang=${language}`)
      .then(r => r.json())
      .then(d => {
        setTerms(d.results ?? [])
        setFilteredTerms(d.results ?? [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [language])

  const filterTerms = useCallback((q: string, cat: string) => {
    let result = terms
    if (cat !== "all") result = result.filter(t => t.category === cat)
    if (q.trim()) result = result.filter(t =>
      t.term.toLowerCase().includes(q.toLowerCase()) ||
      t.short_def.toLowerCase().includes(q.toLowerCase())
    )
    setFilteredTerms(result)
  }, [terms])

  const handleSearch = (q: string) => {
    setSearch(q)
    filterTerms(q, activeCategory)
  }

  const handleCategory = (cat: string) => {
    setActiveCategory(cat)
    filterTerms(search, cat)
  }

  const handleSelectTerm = async (term: TheologicalTerm) => {
    if (term.definition) {
      setSelectedTerm(term)
      return
    }
    setDetailLoading(true)
    const resp = await fetch("/api/bible-ai/dictionary", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ term: term.term, lang: language }),
    })
    const data = await resp.json()
    if (data.term) setSelectedTerm(data.term)
    setDetailLoading(false)
  }

  const categories = ["all", ...Array.from(new Set(terms.map(t => t.category)))]

  if (loading) return (
    <div className="flex items-center justify-center h-48 text-gray-400 text-sm">
      Chargement du dictionnaire…
    </div>
  )

  if (selectedTerm) return (
    <div className="h-full overflow-y-auto p-4 space-y-4">
      <button onClick={() => setSelectedTerm(null)}
        className="flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-800 mb-2">
        ← Retour au dictionnaire
      </button>

      <div className="bg-indigo-50 rounded-xl p-4 border border-indigo-100">
        <div className="flex items-start justify-between mb-1">
          <h2 className="text-xl font-bold text-indigo-900">{selectedTerm.term}</h2>
          <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded-full">
            {CATEGORY_LABELS[selectedTerm.category] ?? selectedTerm.category}
          </span>
        </div>
        <p className="text-indigo-700 italic text-sm">{selectedTerm.short_def}</p>
      </div>

      {detailLoading ? (
        <div className="text-gray-400 text-sm text-center py-8">Génération de la définition…</div>
      ) : (
        <>
          {selectedTerm.definition && (
            <div className="prose prose-sm max-w-none">
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Définition</h3>
              <p className="text-gray-800 leading-relaxed text-sm">{selectedTerm.definition}</p>
            </div>
          )}

          {selectedTerm.extended && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Approfondissement</h3>
              <p className="text-gray-700 leading-relaxed text-sm">{selectedTerm.extended}</p>
            </div>
          )}

          {selectedTerm.key_verses?.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Versets clés</h3>
              <div className="flex flex-wrap gap-2">
                {selectedTerm.key_verses.map((v, i) => (
                  <button key={i}
                    onClick={() => onCiteVerse?.(v)}
                    className="text-xs bg-blue-50 text-blue-700 border border-blue-200 px-3 py-1 rounded-full hover:bg-blue-100 transition-colors">
                    📖 {v}
                  </button>
                ))}
              </div>
            </div>
          )}

          {selectedTerm.related_terms?.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Termes liés</h3>
              <div className="flex flex-wrap gap-2">
                {selectedTerm.related_terms.map((t, i) => {
                  const found = terms.find(term => term.term.toLowerCase() === t.toLowerCase())
                  return (
                    <button key={i}
                      onClick={() => found ? handleSelectTerm(found) : handleSearch(t)}
                      className="text-xs bg-purple-50 text-purple-700 border border-purple-200 px-3 py-1 rounded-full hover:bg-purple-100 transition-colors">
                      {t}
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )

  return (
    <div className="h-full flex flex-col">
      {/* Recherche */}
      <div className="p-3 border-b border-gray-100">
        <input
          type="text"
          value={search}
          onChange={e => handleSearch(e.target.value)}
          placeholder="Rechercher un terme théologique…"
          className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-300"
        />
      </div>

      {/* Catégories */}
      <div className="flex gap-1.5 p-2 border-b border-gray-100 overflow-x-auto scrollbar-hide">
        {categories.map(cat => (
          <button key={cat}
            onClick={() => handleCategory(cat)}
            className={`shrink-0 text-xs px-2.5 py-1 rounded-full transition-colors ${
              activeCategory === cat
                ? "bg-indigo-600 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}>
            {cat === "all" ? "Tous" : `${CATEGORY_ICONS[cat] ?? ""} ${CATEGORY_LABELS[cat] ?? cat}`}
          </button>
        ))}
      </div>

      {/* Liste */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {filteredTerms.length === 0 ? (
          <div className="text-center text-gray-400 text-sm py-8">
            {search ? `Aucun terme trouvé pour "${search}"` : "Aucun terme dans cette catégorie"}
          </div>
        ) : (
          filteredTerms.map(term => (
            <button key={term.id}
              onClick={() => handleSelectTerm(term)}
              className="w-full text-left p-3 rounded-lg border border-gray-100 hover:border-indigo-200 hover:bg-indigo-50 transition-colors">
              <div className="flex items-center justify-between mb-1">
                <span className="font-semibold text-sm text-gray-900">{term.term}</span>
                <span className="text-xs text-gray-400">
                  {CATEGORY_ICONS[term.category] ?? ""} {CATEGORY_LABELS[term.category] ?? term.category}
                </span>
              </div>
              <p className="text-xs text-gray-600 line-clamp-2">{term.short_def}</p>
            </button>
          ))
        )}
      </div>

      <div className="p-2 border-t border-gray-100 text-center">
        <p className="text-xs text-gray-400">{filteredTerms.length} terme{filteredTerms.length !== 1 ? "s" : ""} · Tradition évangélique réformée</p>
      </div>
    </div>
  )
}
