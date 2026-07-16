// ARC AI — Worship Engine
// Préparation de culte, ordre de service, sélection de cantiques, planification

import { chat } from '../provider-manager'
import type { AIProvider } from '../provider-manager'

export interface ServiceOrder {
  date: string
  theme: string
  preacher: string
  passage: string
  items: ServiceItem[]
}

export interface ServiceItem {
  order: number
  type: 'accueil' | 'cantique' | 'prière' | 'annonces' | 'offrande' | 'prédication' | 'sainte-cène' | 'bénédiction' | 'autre'
  title: string
  duration?: number  // minutes
  notes?: string
  songKey?: string
}

export interface SongSuggestion {
  title: string
  artist: string
  theme: string
  key?: string
  tempo: 'lent' | 'modéré' | 'rapide'
  language: 'français' | 'anglais' | 'bilingue'
}

// Générer un ordre de service complet
export async function generateServiceOrder(
  params: {
    date: string
    theme: string
    sermonPassage: string
    preacher: string
    hasCommunion?: boolean
    durationMinutes?: number
  },
  provider: AIProvider = 'auto',
): Promise<ServiceOrder> {
  const system = `Tu es le coordinateur du culte de l'ARC Église (Alliance Réconciliée en Christ, La Chaux-de-Fonds, Suisse). Tradition évangélique réformée-charismatique. Réponds en JSON valide uniquement.`

  const prompt = `Génère un ordre de service complet pour le culte du ${params.date}.
Thème : "${params.theme}"
Passage principal : ${params.sermonPassage}
Prédicateur : ${params.preacher}
${params.hasCommunion ? 'Inclure : Sainte-Cène' : ''}
Durée totale : environ ${params.durationMinutes ?? 90} minutes

Structure typique ARC : Accueil → Louange (3-4 cantiques) → Prière → Annonces → Offrande → Prédication ${params.hasCommunion ? '→ Sainte-Cène ' : ''}→ Bénédiction

Réponds UNIQUEMENT en JSON :
{
  "date": "...",
  "theme": "...",
  "preacher": "...",
  "passage": "...",
  "items": [
    { "order": 1, "type": "accueil", "title": "...", "duration": 5, "notes": "..." },
    ...
  ]
}`

  const result = await chat([{ role: 'user', content: prompt }], provider, { system, maxTokens: 2000 })

  try {
    return JSON.parse(result.content.replace(/```json\n?|```/g, '').trim()) as ServiceOrder
  } catch {
    return {
      date: params.date,
      theme: params.theme,
      preacher: params.preacher,
      passage: params.sermonPassage,
      items: [{ order: 1, type: 'prédication', title: params.theme }],
    }
  }
}

// Suggérer des cantiques selon le thème et le passage
export async function suggestSongs(
  theme: string,
  passage: string,
  count = 4,
  provider: AIProvider = 'auto',
): Promise<SongSuggestion[]> {
  const system = `Tu es un directeur musical évangélique francophone. Tu connais le répertoire Bethel, Hillsong, Elevation Worship, ainsi que les cantiques traditionnels français. Réponds en JSON uniquement.`

  const prompt = `Suggère ${count} cantiques pour un culte avec ce thème : "${theme}" (passage : ${passage}).
Inclus un mix : louange dynamique, adoration intime, et un cantique connu des fidèles.
Priorité aux cantiques en français ou bilingues disponibles en Suisse.

Réponds en JSON :
[
  { "title": "...", "artist": "...", "theme": "...", "key": "Sol", "tempo": "rapide", "language": "français" },
  ...
]`

  const result = await chat([{ role: 'user', content: prompt }], provider, { system, maxTokens: 1000 })

  try {
    return JSON.parse(result.content.replace(/```json\n?|```/g, '').trim()) as SongSuggestion[]
  } catch {
    return []
  }
}

// Formatter l'ordre de service pour affichage
export function formatServiceOrderForDisplay(order: ServiceOrder): string {
  const header = `ORDRE DE SERVICE — ${order.date}\nThème : ${order.theme}\nPrédicateur : ${order.preacher}\nPassage : ${order.passage}\n\n`
  const items = order.items.map(item => {
    const duration = item.duration ? ` (${item.duration} min)` : ''
    const notes = item.notes ? ` — ${item.notes}` : ''
    return `${item.order}. [${item.type.toUpperCase()}] ${item.title}${duration}${notes}`
  }).join('\n')
  return header + items
}
