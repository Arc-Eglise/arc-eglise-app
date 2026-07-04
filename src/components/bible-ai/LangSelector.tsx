"use client"

const LANGS = [
  { code: "fr", label: "Français",    flag: "🇫🇷" },
  { code: "en", label: "English",     flag: "🇬🇧" },
  { code: "ln", label: "Lingala",     flag: "🇨🇩" },
  { code: "sw", label: "Kiswahili",   flag: "🇹🇿" },
  { code: "kg", label: "Kikongo",     flag: "🇨🇩" },
  { code: "es", label: "Español",     flag: "🇪🇸" },
  { code: "pt", label: "Português",   flag: "🇧🇷" },
  { code: "de", label: "Deutsch",     flag: "🇩🇪" },
  { code: "it", label: "Italiano",    flag: "🇮🇹" },
  { code: "nl", label: "Nederlands",  flag: "🇳🇱" },
  { code: "ro", label: "Română",      flag: "🇷🇴" },
  { code: "ar", label: "العربية",     flag: "🇸🇦" },
  { code: "zh", label: "中文",         flag: "🇨🇳" },
  { code: "ko", label: "한국어",       flag: "🇰🇷" },
  { code: "wo", label: "Wolof",       flag: "🇸🇳" },
  { code: "bm", label: "Bambara",     flag: "🇲🇱" },
  { code: "ha", label: "Haoussa",     flag: "🇳🇬" },
  { code: "yo", label: "Yoruba",      flag: "🇳🇬" },
  { code: "ig", label: "Igbo",        flag: "🇳🇬" },
]

interface Props {
  value: string
  onChange: (lang: string) => void
  className?: string
}

export default function LangSelector({ value, onChange, className = "" }: Props) {
  const current = LANGS.find(l => l.code === value) ?? LANGS[0]

  return (
    <div className={`relative ${className}`}>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="appearance-none pl-7 pr-6 py-1.5 rounded-lg border border-arc-border text-xs font-medium text-arc-navy bg-white outline-none focus:border-arc-navy cursor-pointer"
        title="Langue de réponse"
      >
        {LANGS.map(l => (
          <option key={l.code} value={l.code}>
            {l.flag} {l.label}
          </option>
        ))}
      </select>
      <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-sm">
        {current.flag}
      </span>
    </div>
  )
}
