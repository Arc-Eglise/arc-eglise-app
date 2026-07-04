"use client"

import { useState, useEffect } from "react"
import type { ActivitySummary } from "@/lib/activity"

const EMPTY: ActivitySummary = {
  streak:       { current: 0, longest: 0, lastActivity: null },
  thisMonth:    { chapters: 0, sessions: 0, minutes: 0 },
  activityGrid: [],
}

function MiniGrid({ grid }: { grid: ActivitySummary["activityGrid"] }) {
  const today = new Date()
  const days: { date: string; count: number }[] = []

  for (let i = 29; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(today.getDate() - i)
    const dateStr = d.toISOString().slice(0, 10)
    const found   = grid.find(g => g.date === dateStr)
    days.push({ date: dateStr, count: found?.count ?? 0 })
  }

  return (
    <div style={{ display: "flex", gap: 3, flexWrap: "wrap", marginTop: 8 }}>
      {days.map(({ date, count }) => {
        const bg = count === 0
          ? "var(--arc-border, #e5e7eb)"
          : count >= 4
            ? "#1e2464"
            : count >= 2
              ? "#4b5fd4"
              : "#a5b4fc"
        return (
          <div
            key={date}
            title={`${date} · ${count} action${count > 1 ? "s" : ""}`}
            style={{
              width: 10, height: 10,
              borderRadius: 2,
              backgroundColor: bg,
              flexShrink: 0,
            }}
          />
        )
      })}
    </div>
  )
}

export default function ActivityDashboard() {
  const [data,    setData]    = useState<ActivitySummary>(EMPTY)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/activity/summary")
      .then(r => r.ok ? r.json() : EMPTY)
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const { streak, thisMonth, activityGrid } = data
  const hasActivity = streak.current > 0 || thisMonth.chapters > 0

  if (loading) {
    return (
      <div style={{ background: "white", border: "1px solid var(--arc-border,#e5e7eb)", borderRadius: 14, padding: "16px 20px", marginBottom: 18, opacity: 0.5 }}>
        <div style={{ height: 14, width: 120, background: "#f3f4f6", borderRadius: 6 }} />
      </div>
    )
  }

  return (
    <div style={{ background: "white", border: "1px solid var(--arc-border,#e5e7eb)", borderRadius: 14, padding: "16px 20px", marginBottom: 18 }}>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".1em", color: "var(--arc-blue,#2d3a8c)" }}>
          Mon Parcours
        </div>
        <a href="/espace-membres/profil" style={{ fontSize: 11, color: "var(--arc-blue,#2d3a8c)", textDecoration: "none", opacity: 0.7 }}>
          Profil →
        </a>
      </div>

      {/* Stats en ligne */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 14 }}>

        {/* Streak */}
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 22, fontWeight: 800, color: streak.current > 0 ? "#ea580c" : "#9ca3af", fontFamily: "Outfit,sans-serif", lineHeight: 1 }}>
            {streak.current > 0 ? "🔥" : "○"} {streak.current}
          </div>
          <div style={{ fontSize: 10, color: "#6b7280", marginTop: 3 }}>
            {streak.current === 1 ? "jour de suite" : streak.current > 1 ? "jours de suite" : "début"}
          </div>
          {streak.longest > 1 && (
            <div style={{ fontSize: 9, color: "#9ca3af", marginTop: 1 }}>record : {streak.longest}</div>
          )}
        </div>

        {/* Chapitres */}
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 22, fontWeight: 800, color: "var(--arc-navy,#1e2464)", fontFamily: "Outfit,sans-serif", lineHeight: 1 }}>
            {thisMonth.chapters}
          </div>
          <div style={{ fontSize: 10, color: "#6b7280", marginTop: 3 }}>chapitre{thisMonth.chapters !== 1 ? "s" : ""} ce mois</div>
        </div>

        {/* Sessions IA */}
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 22, fontWeight: 800, color: "var(--arc-navy,#1e2464)", fontFamily: "Outfit,sans-serif", lineHeight: 1 }}>
            {thisMonth.sessions}
          </div>
          <div style={{ fontSize: 10, color: "#6b7280", marginTop: 3 }}>session{thisMonth.sessions !== 1 ? "s" : ""} IA</div>
        </div>
      </div>

      {/* Grille d'activité 30j */}
      {hasActivity ? (
        <>
          <div style={{ fontSize: 9, color: "#9ca3af", marginBottom: 2 }}>Activité — 30 derniers jours</div>
          <MiniGrid grid={activityGrid} />
        </>
      ) : (
        <div style={{ fontSize: 12, color: "#9ca3af", textAlign: "center", padding: "8px 0" }}>
          Commence une session biblique pour voir ton parcours ✦
        </div>
      )}
    </div>
  )
}
