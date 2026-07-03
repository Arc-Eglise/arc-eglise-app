"use client"

import {
  createContext, useContext, useEffect, useState,
  useCallback, useRef, type ReactNode,
} from "react"
import {
  READING_DEFAULTS, READING_MODES, buildReadingCSS,
  type ReadingPreferences, type ReadingMode,
} from "@/types/reading-preferences"

const LS_KEY = "arc_rp_v1"

interface ReadingPrefsContextValue {
  prefs:     ReadingPreferences
  update:    (patch: Partial<ReadingPreferences>) => void
  applyMode: (mode: ReadingMode) => void
  reset:     () => void
}

const ReadingPrefsContext = createContext<ReadingPrefsContextValue | null>(null)

function readLS(): ReadingPreferences {
  if (typeof window === "undefined") return { ...READING_DEFAULTS }
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return { ...READING_DEFAULTS }
    return { ...READING_DEFAULTS, ...JSON.parse(raw) }
  } catch { return { ...READING_DEFAULTS } }
}

export function ReadingPrefsProvider({ children, userId }: { children: ReactNode; userId: string }) {
  const [prefs, setPrefs] = useState<ReadingPreferences>(readLS)
  const saveTimer = useRef<ReturnType<typeof setTimeout>>()

  // Sync from Supabase on mount (may overwrite localStorage if server prefs are newer)
  useEffect(() => {
    fetch("/api/reading-preferences")
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d?.prefs) {
          const resolved: ReadingPreferences = { ...READING_DEFAULTS, ...d.prefs }
          setPrefs(resolved)
          try { localStorage.setItem(LS_KEY, JSON.stringify(resolved)) } catch {}
        }
      })
      .catch(() => {/* network error — keep localStorage value */})
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId])

  const persistToSupabase = useCallback((next: ReadingPreferences) => {
    clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      fetch("/api/reading-preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(next),
      }).catch(() => {/* silencieux */})
    }, 600)
  }, [])

  const update = useCallback((patch: Partial<ReadingPreferences>) => {
    setPrefs(prev => {
      const next = { ...prev, ...patch }
      try { localStorage.setItem(LS_KEY, JSON.stringify(next)) } catch {}
      persistToSupabase(next)
      return next
    })
  }, [persistToSupabase])

  const applyMode = useCallback((mode: ReadingMode) => {
    update(READING_MODES[mode])
  }, [update])

  const reset = useCallback(() => {
    update({ ...READING_DEFAULTS })
  }, [update])

  return (
    <ReadingPrefsContext.Provider value={{ prefs, update, applyMode, reset }}>
      <style dangerouslySetInnerHTML={{ __html: buildReadingCSS(prefs) }} />
      {children}
    </ReadingPrefsContext.Provider>
  )
}

export function useReadingPrefs(): ReadingPrefsContextValue {
  const ctx = useContext(ReadingPrefsContext)
  if (!ctx) throw new Error("useReadingPrefs must be used inside ReadingPrefsProvider")
  return ctx
}
