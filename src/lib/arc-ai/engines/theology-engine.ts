// ARC AI — Theology Engine
// Doctrine par thème, comparaison inter-traditions, apologétique

import { searchKnowledge } from './knowledge-engine'
import { chat } from '../provider-manager'
import type { AIProvider } from '../provider-manager'

export type TheologicalTradition = 'réformée' | 'arminiène' | 'luthérienne' | 'catholique' | 'orthodoxe' | 'baptiste' | 'pentecôtiste'

export interface DoctrineExplanation {
  doctrine: string
  arcPosition: string
  biblicalBasis: string[]
  traditions?: Partial<Record<TheologicalTradition, string>>
  keyTheologians?: string[]
}

// Doctrine ARC Église (fondamentaux)
export const ARC_DOCTRINES: Record<string, string> = {
  'trinité': 'L\'ARC croit en un seul Dieu subsistant en trois personnes coéternelles et coégales : le Père, le Fils et le Saint-Esprit.',
  'salut': 'Le salut est par la grâce seule, par la foi seule, en Christ seul (Sola Gratia, Sola Fide, Solus Christus). Justification par la foi, non par les œuvres.',
  'bible': 'La Bible (66 livres) est la Parole de Dieu, infaillible, inspirée, autorité suprême en matière de foi et de vie (Sola Scriptura).',
  'église': 'L\'Église est le corps de Christ, composée de tous les vrais croyants. Elle se réunit pour l\'adoration, l\'enseignement, la communion et l\'évangélisation.',
  'baptême': 'Le baptême par immersion (ou effusion) est pratiqué pour les croyants qui ont confessé leur foi, après la nouvelle naissance.',
  'sainte-cène': 'La Sainte-Cène (Communion) est célébrée régulièrement en mémoire du sacrifice de Christ. L\'ARC adopte une vue mémorielle/symbolique.',
  'saint-esprit': 'Le Saint-Esprit habite en chaque croyant. L\'ARC est ouverte aux dons spirituels (sensibilité charismatique) tout en étant ancrée dans la théologie réformée.',
  'retour-christ': 'L\'ARC croit au retour personnel et littéral de Jésus-Christ. Elle maintient une position premilléniale sans imposer une eschatologie précise.',
}

// Expliquer une doctrine avec RAG + IA
export async function explainDoctrine(
  topic: string,
  provider: AIProvider = 'auto',
  options: { compareTraditions?: TheologicalTradition[]; level?: 'basic' | 'advanced' } = {},
): Promise<DoctrineExplanation> {
  // Rechercher dans la base de connaissances
  const chunks = await searchKnowledge(topic, { limit: 5, sourceType: 'commentary' }).catch(() => [])
  const context = chunks.length > 0 ? chunks.map(c => c.content).join('\n\n') : ''

  // Position ARC pré-définie si disponible
  const arcPosition = Object.entries(ARC_DOCTRINES).find(([key]) => topic.toLowerCase().includes(key))?.[1] ?? ''

  const traditionsRequest = options.compareTraditions?.length
    ? `Inclus aussi la perspective de ces traditions : ${options.compareTraditions.join(', ')}.`
    : ''

  const system = `Tu es un théologien évangélique de l'ARC Église, tradition réformée-charismatique. Réponds en JSON valide uniquement.`

  const prompt = `Explique la doctrine de "${topic}" selon la perspective évangélique réformée.
${arcPosition ? `Position ARC : ${arcPosition}` : ''}
${context ? `Contexte documentaire :\n${context}` : ''}
${traditionsRequest}
Niveau : ${options.level === 'advanced' ? 'académique avec termes grecs/hébreux si pertinent' : 'accessible à un chrétien de base'}

Réponds UNIQUEMENT en JSON :
{
  "doctrine": "nom de la doctrine",
  "arcPosition": "position officielle ARC",
  "biblicalBasis": ["Jean 3:16", "Romains 3:23", ...],
  "traditions": { "réformée": "...", "arminiène": "..." },
  "keyTheologians": ["Calvin", "Piper", ...]
}`

  const result = await chat([{ role: 'user', content: prompt }], provider, { system, maxTokens: 2000 })

  try {
    return JSON.parse(result.content.replace(/```json\n?|```/g, '').trim()) as DoctrineExplanation
  } catch {
    return {
      doctrine: topic,
      arcPosition: arcPosition || result.content,
      biblicalBasis: [],
    }
  }
}

// Comparer des doctrines entre traditions
export async function compareDoctrines(
  doctrine: string,
  traditions: TheologicalTradition[],
  provider: AIProvider = 'auto',
): Promise<Record<string, string>> {
  const system = `Tu es un théologien comparatiste expert. Réponds en JSON uniquement.`
  const prompt = `Compare la doctrine de "${doctrine}" entre ces traditions : ${traditions.join(', ')}.
Réponds en JSON : { "tradition1": "explication courte", "tradition2": "..." }`

  const result = await chat([{ role: 'user', content: prompt }], provider, { system, maxTokens: 1500 })

  try {
    return JSON.parse(result.content.replace(/```json\n?|```/g, '').trim()) as Record<string, string>
  } catch {
    return { erreur: result.content }
  }
}
