"use client"

import { useState, useTransition } from "react"
import type { SpiritualProfile, ProfileType, SpiritualMaturity } from "@/types/spiritual-profile"
import { PROFILE_TYPE_LABELS, SPIRITUAL_MATURITY_LABELS } from "@/types/spiritual-profile"

const SUGGESTED_THEMES = [
  "Grâce", "Salut", "Prière", "Trinité", "Eschatologie",
  "Sanctification", "Évangélisation", "Louange", "Foi", "Repentance",
  "Prédestination", "Résurrection", "Saint-Esprit", "Église", "Baptême",
]

const OT_BOOK_LIST = ["Genèse","Exode","Psaumes","Proverbes","Ésaïe","Jérémie","Ézéchiel","Daniel","Zacharie","Job","Ruth","Habacuc"]
const NT_BOOK_LIST = ["Matthieu","Marc","Luc","Jean","Actes","Romains","1 Corinthiens","Galates","Éphésiens","Philippiens","Colossiens","Hébreux","Jacques","Apocalypse"]

type Tag = { items: string[]; set: (v: string[]) => void; suggestions: string[]; label: string }

function TagInput({ items, set, suggestions, label }: Tag) {
  const [input, setInput] = useState("")

  function add(val: string) {
    const v = val.trim()
    if (!v || items.includes(v) || items.length >= 10) return
    set([...items, v])
    setInput("")
  }

  return (
    <div>
      <div className="text-[10px] font-bold uppercase tracking-wider text-arc-blue mb-1.5">{label}</div>
      <div className="flex flex-wrap gap-1.5 mb-2 min-h-[28px]">
        {items.map(item => (
          <span key={item} className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full bg-arc-blueBg text-arc-navy border border-arc-bluePale">
            {item}
            <button
              type="button"
              onClick={() => set(items.filter(i => i !== item))}
              className="text-arc-text3 hover:text-arc-navy ml-0.5 leading-none"
              aria-label={`Supprimer ${item}`}
            >×</button>
          </span>
        ))}
      </div>
      <div className="flex gap-1.5">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); add(input) } }}
          placeholder="Ajouter..."
          className="flex-1 px-2.5 py-1.5 rounded-lg border border-arc-border text-sm outline-none focus:border-arc-navy transition-colors"
        />
        <button
          type="button"
          onClick={() => add(input)}
          className="px-3 py-1.5 rounded-lg border border-arc-border text-sm text-arc-navy hover:bg-arc-bg transition-colors"
        >+</button>
      </div>
      {suggestions.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-1.5">
          {suggestions.filter(s => !items.includes(s)).slice(0, 6).map(s => (
            <button
              key={s}
              type="button"
              onClick={() => add(s)}
              className="text-[11px] px-2 py-0.5 rounded-full border border-arc-border text-arc-text3 hover:border-arc-navy hover:text-arc-navy transition-colors"
            >{s}</button>
          ))}
        </div>
      )}
    </div>
  )
}

interface Props {
  initialProfile: SpiritualProfile
}

export default function SpiritualProfileSection({ initialProfile }: Props) {
  const [profileType,      setProfileType]      = useState<ProfileType>(initialProfile.profile_type)
  const [maturity,         setMaturity]          = useState<SpiritualMaturity>(initialProfile.spiritual_maturity)
  const [dailyGoal,        setDailyGoal]         = useState(initialProfile.daily_goal_minutes)
  const [theolFocus,       setTheolFocus]        = useState<string[]>(initialProfile.theological_focus)
  const [favOT,            setFavOT]             = useState<string[]>(initialProfile.fav_ot_books)
  const [favNT,            setFavNT]             = useState<string[]>(initialProfile.fav_nt_books)
  const [memo,             setMemo]              = useState(initialProfile.ai_context_memo ?? "")
  const [memoUpdated,      setMemoUpdated]       = useState(initialProfile.ai_memo_updated_at)
  const [showMemo,         setShowMemo]          = useState(false)
  const [saved,            setSaved]             = useState(false)
  const [isPending,        startTransition]      = useTransition()
  const [memoLoading,      setMemoLoading]       = useState(false)

  async function handleSave() {
    startTransition(async () => {
      const res = await fetch("/api/profile/spiritual", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profile_type:       profileType,
          spiritual_maturity: maturity,
          daily_goal_minutes: dailyGoal,
          theological_focus:  theolFocus,
          fav_ot_books:       favOT,
          fav_nt_books:       favNT,
        }),
      })
      if (res.ok) {
        setSaved(true)
        setTimeout(() => setSaved(false), 3000)
      }
    })
  }

  async function handleRefreshMemo() {
    setMemoLoading(true)
    try {
      const res = await fetch("/api/profile/refresh-memo", { method: "POST" })
      const data = await res.json()
      if (data.ok && data.memo) {
        setMemo(data.memo)
        setMemoUpdated(new Date().toISOString())
        setShowMemo(true)
      }
    } finally {
      setMemoLoading(false)
    }
  }

  const memoAge = memoUpdated
    ? Math.floor((Date.now() - new Date(memoUpdated).getTime()) / 86400000)
    : null

  return (
    <div className="bg-white border border-arc-border rounded-2xl p-5 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-bold text-arc-navy">Profil spirituel</h2>
        <span className="text-[10px] font-bold uppercase tracking-wider text-arc-text3">Personnalise ton expérience IA</span>
      </div>

      {/* Type de membre */}
      <div>
        <div className="text-[10px] font-bold uppercase tracking-wider text-arc-blue mb-2">Type de membre</div>
        <div className="flex flex-wrap gap-2">
          {(Object.keys(PROFILE_TYPE_LABELS) as ProfileType[]).map(type => (
            <button
              key={type}
              type="button"
              onClick={() => setProfileType(type)}
              className={`text-xs font-semibold px-3 py-1.5 rounded-full border transition-colors ${
                profileType === type
                  ? "bg-arc-navy text-white border-arc-navy"
                  : "border-arc-border text-arc-text2 hover:border-arc-navy hover:text-arc-navy"
              }`}
            >
              {PROFILE_TYPE_LABELS[type]}
            </button>
          ))}
        </div>
      </div>

      {/* Niveau de maturité */}
      <div>
        <div className="text-[10px] font-bold uppercase tracking-wider text-arc-blue mb-2">Niveau spirituel</div>
        <div className="flex flex-wrap gap-2">
          {(Object.keys(SPIRITUAL_MATURITY_LABELS) as SpiritualMaturity[]).filter(m => m !== "enfant").map(m => (
            <button
              key={m}
              type="button"
              onClick={() => setMaturity(m)}
              className={`text-xs font-semibold px-3 py-1.5 rounded-full border transition-colors ${
                maturity === m
                  ? "bg-arc-gold text-white border-arc-gold"
                  : "border-arc-border text-arc-text2 hover:border-arc-gold hover:text-arc-goldDark"
              }`}
            >
              {SPIRITUAL_MATURITY_LABELS[m]}
            </button>
          ))}
        </div>
      </div>

      {/* Thèmes théologiques */}
      <TagInput
        label="Centres d'intérêt théologiques"
        items={theolFocus}
        set={setTheolFocus}
        suggestions={SUGGESTED_THEMES}
      />

      {/* Livres préférés AT */}
      <TagInput
        label="Livres préférés — Ancien Testament"
        items={favOT}
        set={setFavOT}
        suggestions={OT_BOOK_LIST}
      />

      {/* Livres préférés NT */}
      <TagInput
        label="Livres préférés — Nouveau Testament"
        items={favNT}
        set={setFavNT}
        suggestions={NT_BOOK_LIST}
      />

      {/* Objectif quotidien */}
      <div>
        <div className="text-[10px] font-bold uppercase tracking-wider text-arc-blue mb-2">Objectif quotidien</div>
        <div className="flex items-center gap-3">
          <input
            type="range"
            min={5}
            max={60}
            step={5}
            value={dailyGoal}
            onChange={e => setDailyGoal(Number(e.target.value))}
            className="flex-1 accent-arc-navy"
          />
          <span className="text-sm font-bold text-arc-navy w-20 text-right">{dailyGoal} min/jour</span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between pt-2 border-t border-arc-border">
        <button
          type="button"
          onClick={handleSave}
          disabled={isPending}
          className="px-5 py-2.5 rounded-xl bg-arc-navy text-white text-sm font-bold hover:bg-arc-navy2 transition-colors disabled:opacity-60"
        >
          {isPending ? "Enregistrement..." : saved ? "✓ Enregistré" : "Enregistrer"}
        </button>

        <div className="text-right">
          <button
            type="button"
            onClick={() => setShowMemo(v => !v)}
            className="text-xs text-arc-blue hover:underline block"
          >
            {showMemo ? "Masquer" : "Voir"} ce que l'IA mémorise →
          </button>
          {memoAge !== null && (
            <span className="text-[11px] text-arc-text3">
              Mis à jour {memoAge === 0 ? "aujourd'hui" : `il y a ${memoAge} jour${memoAge > 1 ? "s" : ""}`}
            </span>
          )}
        </div>
      </div>

      {/* Mémo IA */}
      {showMemo && (
        <div className="bg-arc-bg rounded-xl p-4 border border-arc-border">
          <div className="text-[10px] font-bold uppercase tracking-wider text-arc-blue mb-2">Mémo contextuel IA</div>
          {memo ? (
            <p className="text-sm text-arc-text2 leading-relaxed">{memo}</p>
          ) : (
            <p className="text-sm text-arc-text3 italic">Aucun mémo généré pour l'instant. Clique sur "Actualiser" après quelques sessions.</p>
          )}
          <button
            type="button"
            onClick={handleRefreshMemo}
            disabled={memoLoading}
            className="mt-3 text-xs font-semibold px-3 py-1.5 rounded-lg border border-arc-border text-arc-navy hover:bg-white transition-colors disabled:opacity-60"
          >
            {memoLoading ? "Génération en cours..." : "↻ Actualiser le mémo"}
          </button>
        </div>
      )}
    </div>
  )
}
