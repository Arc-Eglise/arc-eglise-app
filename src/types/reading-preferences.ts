export type FontFamily = "manrope" | "cormorant" | "georgia" | "system"
export type ReadingMode = "standard" | "comfortable" | "intensive" | "senior"

export interface ReadingPreferences {
  font_size_px:  number      // 13–26
  line_height:   number      // 1.4–2.4
  font_family:   FontFamily
  high_contrast: boolean
  low_vision:    boolean
}

export const READING_DEFAULTS: ReadingPreferences = {
  font_size_px:  16,
  line_height:   1.6,
  font_family:   "manrope",
  high_contrast: false,
  low_vision:    false,
}

export const READING_MODES: Record<ReadingMode, ReadingPreferences> = {
  standard:    { font_size_px: 16, line_height: 1.6, font_family: "manrope",   high_contrast: false, low_vision: false },
  comfortable: { font_size_px: 18, line_height: 1.85, font_family: "cormorant", high_contrast: false, low_vision: false },
  intensive:   { font_size_px: 14, line_height: 1.55, font_family: "manrope",  high_contrast: false, low_vision: false },
  senior:      { font_size_px: 20, line_height: 2.1,  font_family: "georgia",  high_contrast: false, low_vision: false },
}

const FONT_MAP: Record<FontFamily, string> = {
  manrope:   "var(--font-manrope)",
  cormorant: "var(--font-cormorant)",
  georgia:   "Georgia, 'Times New Roman', serif",
  system:    "system-ui, -apple-system, sans-serif",
}

export function buildReadingCSS(p: ReadingPreferences): string {
  const font = FONT_MAP[p.font_family]
  // Sélecteur html .em-reading-zone (spécificité 0-1-1) > .em-reading-zone de globals.css (0-1-0)
  // garantit que les vars CSS injectées gagnent sur les valeurs statiques
  const lines: string[] = [
    `html .em-reading-zone {`,
    `  --rp-size: ${p.font_size_px}px;`,
    `  --rp-lh: ${p.line_height};`,
    `  --rp-font: ${font};`,
    `}`,
  ]
  if (p.high_contrast) {
    lines.push(
      `html .em-reading-zone { background: #fff !important; }`,
      `html .em-reading-zone, html .em-reading-zone * { color: #000 !important; }`,
      `html .em-reading-zone a { text-decoration: underline !important; }`,
    )
  }
  if (p.low_vision) {
    lines.push(
      `html .em-reading-zone { letter-spacing: 0.025em; word-spacing: 0.06em; }`,
      `html .em-reading-zone a { text-decoration: underline !important; }`,
    )
  }
  return lines.join("\n")
}
