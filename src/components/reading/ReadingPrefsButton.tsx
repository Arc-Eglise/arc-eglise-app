"use client"

import { useState, useEffect, useRef } from "react"
import { useReadingPrefs } from "@/contexts/ReadingPrefsContext"
import type { ReadingMode } from "@/types/reading-preferences"

const PREVIEW_TEXT =
  "Car Dieu a tant aimé le monde qu'il a donné son Fils unique, afin que quiconque croit en lui ne périsse point, mais qu'il ait la vie éternelle."

const MODES: { id: ReadingMode; label: string; desc: string }[] = [
  { id: "standard",    label: "Standard",    desc: "16px · 1.6" },
  { id: "comfortable", label: "Confortable", desc: "18px · sérif" },
  { id: "intensive",   label: "Intensif",    desc: "14px · serré" },
  { id: "senior",      label: "Senior",      desc: "20px · aéré" },
]

const FONTS: { id: string; label: string; sample: string }[] = [
  { id: "manrope",   label: "Manrope",   sample: "Aa" },
  { id: "cormorant", label: "Cormorant", sample: "Aa" },
  { id: "georgia",   label: "Georgia",   sample: "Aa" },
  { id: "system",    label: "Système",   sample: "Aa" },
]

const FONT_CSS: Record<string, string> = {
  manrope:   "var(--font-manrope)",
  cormorant: "var(--font-cormorant)",
  georgia:   "Georgia, serif",
  system:    "system-ui, sans-serif",
}

export function ReadingPrefsButton() {
  const [open, setOpen]         = useState(false)
  const [saved, setSaved]       = useState(false)
  const { prefs, update, applyMode, reset } = useReadingPrefs()
  const savedTimer = useRef<ReturnType<typeof setTimeout>>()
  const drawerRef  = useRef<HTMLDivElement>(null)

  // Close on Escape
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false) }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [open])

  // Show "Saved" feedback briefly
  const handleUpdate = (patch: Parameters<typeof update>[0]) => {
    update(patch)
    clearTimeout(savedTimer.current)
    setSaved(true)
    savedTimer.current = setTimeout(() => setSaved(false), 1800)
  }

  const handleMode = (mode: ReadingMode) => {
    applyMode(mode)
    clearTimeout(savedTimer.current)
    setSaved(true)
    savedTimer.current = setTimeout(() => setSaved(false), 1800)
  }

  // Detect current mode
  const currentMode = MODES.find(m => {
    const mp = { id: "standard", label: "Standard", desc: "" }
    void mp
    return false // no strict mode matching — modes are just presets
  })
  void currentMode

  return (
    <>
      {/* Floating trigger */}
      <button
        className="rp-trigger"
        onClick={() => setOpen(true)}
        aria-label="Préférences de lecture"
        title="Personnaliser la lecture"
      >
        <span style={{ fontFamily: "Georgia, serif", fontSize: 15, fontWeight: 700, lineHeight: 1 }}>Aa</span>
        <span style={{ fontSize: 12 }}>Lecture</span>
      </button>

      {/* Backdrop */}
      {open && (
        <div
          className="rp-overlay"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Drawer */}
      {open && (
        <div
          className="rp-drawer"
          ref={drawerRef}
          role="dialog"
          aria-modal="true"
          aria-label="Préférences de lecture"
        >
          {/* Header */}
          <div style={{
            padding: "16px 18px 14px",
            borderBottom: "1px solid rgba(30,36,100,.08)",
            display: "flex", alignItems: "center", justifyContent: "space-between",
            flexShrink: 0,
          }}>
            <div>
              <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: ".1em", textTransform: "uppercase", color: "#8890aa", marginBottom: 2 }}>
                Espace Membres
              </div>
              <div style={{ fontSize: 16, fontWeight: 700, color: "#1e2464", fontFamily: "var(--font-cormorant)" }}>
                Préférences de lecture
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {saved && (
                <span style={{ fontSize: 11, color: "#2f855a", fontWeight: 600, animation: "rpFadeIn .2s" }}>
                  ✓ Sauvegardé
                </span>
              )}
              <button
                onClick={() => setOpen(false)}
                style={{
                  width: 30, height: 30, borderRadius: 8,
                  background: "#f7f8fc", border: "none", cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 16, color: "#8890aa",
                }}
                aria-label="Fermer"
              >×</button>
            </div>
          </div>

          {/* Body — scrollable */}
          <div style={{ flex: 1, overflowY: "auto", padding: "18px" }}>

            {/* ── Modes ── */}
            <Section title="Mode de lecture">
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                {MODES.map(m => (
                  <button
                    key={m.id}
                    onClick={() => handleMode(m.id)}
                    style={{
                      padding: "10px 12px", borderRadius: 10, border: "none", cursor: "pointer",
                      background: "#f0f2f9", textAlign: "left", transition: "all .15s",
                    }}
                    onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = "#e0e4f0" }}
                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "#f0f2f9" }}
                  >
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#1e2464", marginBottom: 2 }}>{m.label}</div>
                    <div style={{ fontSize: 11, color: "#8890aa" }}>{m.desc}</div>
                  </button>
                ))}
              </div>
            </Section>

            {/* ── Taille du texte ── */}
            <Section title="Taille du texte">
              {/* Zoom buttons */}
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                <button
                  onClick={() => handleUpdate({ font_size_px: Math.max(13, prefs.font_size_px - 1) })}
                  disabled={prefs.font_size_px <= 13}
                  style={zoomBtnStyle}
                  aria-label="Réduire"
                >
                  <span style={{ fontFamily: "Georgia, serif", fontSize: 14 }}>A−</span>
                </button>
                <div style={{ flex: 1, textAlign: "center" }}>
                  <div style={{ fontSize: 22, fontWeight: 700, color: "#1e2464", lineHeight: 1 }}>{prefs.font_size_px}</div>
                  <div style={{ fontSize: 10, color: "#8890aa", marginTop: 2 }}>pixels</div>
                </div>
                <button
                  onClick={() => handleUpdate({ font_size_px: Math.min(26, prefs.font_size_px + 1) })}
                  disabled={prefs.font_size_px >= 26}
                  style={zoomBtnStyle}
                  aria-label="Agrandir"
                >
                  <span style={{ fontFamily: "Georgia, serif", fontSize: 18 }}>A+</span>
                </button>
              </div>

              {/* Slider */}
              <input
                type="range"
                min={13} max={26} step={1}
                value={prefs.font_size_px}
                onChange={e => handleUpdate({ font_size_px: Number(e.target.value) })}
                style={{ width: "100%", accentColor: "#1e2464", cursor: "pointer" }}
                aria-label={`Taille du texte : ${prefs.font_size_px} pixels`}
              />
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
                <span style={{ fontSize: 10, color: "#8890aa" }}>Très petite</span>
                <span style={{ fontSize: 10, color: "#8890aa" }}>Très grande</span>
              </div>
            </Section>

            {/* ── Interligne ── */}
            <Section title="Espacement des lignes">
              <div style={{ display: "flex", gap: 6 }}>
                {([
                  { v: 1.4, label: "Serré" },
                  { v: 1.6, label: "Normal" },
                  { v: 1.85, label: "Aéré" },
                  { v: 2.1, label: "Large" },
                ] as const).map(o => (
                  <button
                    key={o.v}
                    onClick={() => handleUpdate({ line_height: o.v })}
                    style={{
                      flex: 1, padding: "7px 4px", borderRadius: 8,
                      border: `1.5px solid ${Math.abs(prefs.line_height - o.v) < 0.01 ? "#1e2464" : "rgba(30,36,100,.15)"}`,
                      background: Math.abs(prefs.line_height - o.v) < 0.01 ? "#eef1f8" : "#fff",
                      color: Math.abs(prefs.line_height - o.v) < 0.01 ? "#1e2464" : "#6b7280",
                      fontSize: 11, fontWeight: 600, cursor: "pointer", transition: "all .15s",
                    }}
                  >{o.label}</button>
                ))}
              </div>
            </Section>

            {/* ── Police ── */}
            <Section title="Police de caractères">
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                {FONTS.map(f => (
                  <button
                    key={f.id}
                    onClick={() => handleUpdate({ font_family: f.id as "manrope" | "cormorant" | "georgia" | "system" })}
                    style={{
                      padding: "10px 12px", borderRadius: 10, textAlign: "left", cursor: "pointer",
                      border: `1.5px solid ${prefs.font_family === f.id ? "#1e2464" : "rgba(30,36,100,.12)"}`,
                      background: prefs.font_family === f.id ? "#eef1f8" : "#fff",
                      transition: "all .15s",
                    }}
                  >
                    <div style={{
                      fontFamily: FONT_CSS[f.id], fontSize: 20, color: "#1e2464",
                      lineHeight: 1, marginBottom: 4,
                    }}>{f.sample}</div>
                    <div style={{
                      fontSize: 11, fontWeight: 600,
                      color: prefs.font_family === f.id ? "#1e2464" : "#8890aa",
                    }}>{f.label}</div>
                  </button>
                ))}
              </div>
            </Section>

            {/* ── Accessibilité ── */}
            <Section title="Accessibilité">
              <Toggle
                label="Contraste renforcé"
                sub="Texte en noir sur fond blanc"
                checked={prefs.high_contrast}
                onChange={v => handleUpdate({ high_contrast: v })}
              />
              <Toggle
                label="Mode malvoyant"
                sub="Espacement accru, liens soulignés"
                checked={prefs.low_vision}
                onChange={v => handleUpdate({ low_vision: v })}
              />
            </Section>

            {/* ── Aperçu ── */}
            <Section title="Aperçu">
              <div
                className="em-reading-zone"
                style={{
                  background: "#f9f9fb",
                  borderRadius: 10,
                  padding: "14px 16px",
                  border: "1px solid rgba(30,36,100,.08)",
                }}
              >
                <p className="em-reading-text" style={{ margin: 0, color: "#1e2464" }}>
                  {PREVIEW_TEXT}
                </p>
                <p style={{
                  margin: "8px 0 0",
                  fontSize: 11,
                  color: "#8890aa",
                  fontFamily: "var(--font-manrope)",
                }}>— Jean 3:16</p>
              </div>
            </Section>

          </div>

          {/* Footer */}
          <div style={{
            padding: "12px 18px",
            borderTop: "1px solid rgba(30,36,100,.08)",
            display: "flex", justifyContent: "space-between", alignItems: "center",
            flexShrink: 0, background: "#fafbfd",
          }}>
            <button
              onClick={() => { reset(); clearTimeout(savedTimer.current); setSaved(true); savedTimer.current = setTimeout(() => setSaved(false), 1800) }}
              style={{
                fontSize: 12, color: "#8890aa", background: "none", border: "none",
                cursor: "pointer", padding: "6px 10px", borderRadius: 6,
                textDecoration: "underline", textUnderlineOffset: 2,
              }}
            >
              Réinitialiser
            </button>
            <span style={{ fontSize: 11, color: "#b0b5cc" }}>
              Sauvegarde automatique ✓
            </span>
          </div>
        </div>
      )}
    </>
  )
}

/* ── Sous-composants internes ─────────────────────────────────────── */

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 22 }}>
      <div style={{
        fontSize: 10, fontWeight: 800, letterSpacing: ".1em",
        textTransform: "uppercase", color: "#8890aa", marginBottom: 10,
      }}>
        {title}
      </div>
      {children}
    </div>
  )
}

function Toggle({
  label, sub, checked, onChange,
}: { label: string; sub: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "10px 0", borderBottom: "1px solid rgba(30,36,100,.06)",
      cursor: "pointer", gap: 12,
    }}>
      <div>
        <div style={{ fontSize: 13, fontWeight: 600, color: "#1e2464" }}>{label}</div>
        <div style={{ fontSize: 11, color: "#8890aa", marginTop: 1 }}>{sub}</div>
      </div>
      <div
        onClick={() => onChange(!checked)}
        style={{
          width: 40, height: 22, borderRadius: 11, flexShrink: 0,
          background: checked ? "#1e2464" : "#dde0ea",
          position: "relative", transition: "background .2s", cursor: "pointer",
        }}
        role="switch"
        aria-checked={checked}
        tabIndex={0}
        onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onChange(!checked) } }}
      >
        <div style={{
          position: "absolute",
          top: 2, left: checked ? 20 : 2,
          width: 18, height: 18, borderRadius: "50%",
          background: "#fff",
          boxShadow: "0 1px 3px rgba(0,0,0,.2)",
          transition: "left .2s",
        }} />
      </div>
    </label>
  )
}

const zoomBtnStyle: React.CSSProperties = {
  width: 44, height: 44, borderRadius: 10, flexShrink: 0,
  border: "1.5px solid rgba(30,36,100,.15)", background: "#fff",
  cursor: "pointer", display: "flex", alignItems: "center",
  justifyContent: "center", transition: "all .15s", color: "#1e2464",
}
