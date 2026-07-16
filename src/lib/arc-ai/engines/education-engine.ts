// ARC AI — Education Engine
// École biblique, discipleship, modules de formation, catéchèse

import { chat } from '../provider-manager'
import { searchKnowledge } from './knowledge-engine'
import type { AIProvider } from '../provider-manager'

export type CourseLevel = 'débutant' | 'intermédiaire' | 'avancé' | 'leader'
export type CourseType = 'catéchèse' | 'discipleship' | 'école-biblique' | 'formation-leader' | 'baptême' | 'autre'

export interface CourseModule {
  id: string
  title: string
  type: CourseType
  level: CourseLevel
  durationMinutes: number
  objectives: string[]
  outline: LessonOutline[]
}

export interface LessonOutline {
  title: string
  duration: number
  content: string
  biblePassages: string[]
  questions: string[]
  memorization?: string
}

// Générer un module de cours complet
export async function generateCourseModule(
  params: {
    title: string
    type: CourseType
    level: CourseLevel
    topic: string
    lessons?: number
  },
  provider: AIProvider = 'auto',
): Promise<CourseModule> {
  // Enrichir avec la base de connaissances
  const knowledge = await searchKnowledge(params.topic, { limit: 4, sourceType: 'document' }).catch(() => [])
  const context = knowledge.map(c => c.content.slice(0, 300)).join('\n\n')

  const system = `Tu es l'éducateur biblique de l'ARC Église. Tu crées du matériel pédagogique solide, bibliquement fondé et pratiquement applicable. Réponds en JSON valide uniquement.`

  const lessonCount = params.lessons ?? 4

  const prompt = `Crée un module de cours pour l'ARC Église :
Titre : "${params.title}"
Type : ${params.type}
Niveau : ${params.level}
Sujet : "${params.topic}"
Nombre de leçons : ${lessonCount}
${context ? `Ressources disponibles :\n${context}` : ''}

Réponds en JSON :
{
  "id": "slug-du-module",
  "title": "...",
  "type": "...",
  "level": "...",
  "durationMinutes": 60,
  "objectives": ["À la fin, l'étudiant saura...", ...],
  "outline": [
    {
      "title": "Leçon 1 : ...",
      "duration": 60,
      "content": "Contenu principal de la leçon (2-3 paragraphes)",
      "biblePassages": ["Jean 3:16", "Romains 8:1"],
      "questions": ["Question de réflexion 1", ...],
      "memorization": "Verset à mémoriser"
    },
    ...
  ]
}`

  const result = await chat([{ role: 'user', content: prompt }], provider, { system, maxTokens: 3000, temperature: 0.6 })

  try {
    return JSON.parse(result.content.replace(/```json\n?|```/g, '').trim()) as CourseModule
  } catch {
    return {
      id: params.title.toLowerCase().replace(/\s+/g, '-'),
      title: params.title,
      type: params.type,
      level: params.level,
      durationMinutes: lessonCount * 60,
      objectives: [`Comprendre ${params.topic}`],
      outline: [],
    }
  }
}

// Parcours de baptême (structure standard ARC)
export async function generateBaptismPath(
  candidateName: string,
  provider: AIProvider = 'auto',
): Promise<{ steps: Array<{ step: number; title: string; description: string; duration: string }> }> {
  const system = `Tu es le responsable du parcours baptismal de l'ARC Église. Tu prépares des candidats au baptême par immersion selon la tradition évangélique.`

  const prompt = `Génère un parcours de baptême personnalisé pour ${candidateName}.
L'ARC pratique le baptême des croyants par immersion après profession de foi.
Inclus : entretien initial, cours de base (salut, vie chrétienne, Église), témoignage personnel, préparation pratique, cérémonie.
Réponds en JSON : { "steps": [{ "step": 1, "title": "...", "description": "...", "duration": "..." }, ...] }`

  const result = await chat([{ role: 'user', content: prompt }], provider, { system, maxTokens: 1500 })

  try {
    return JSON.parse(result.content.replace(/```json\n?|```/g, '').trim()) as { steps: Array<{ step: number; title: string; description: string; duration: string }> }
  } catch {
    return {
      steps: [
        { step: 1, title: 'Entretien initial', description: 'Rencontre avec le pasteur pour évaluer la foi du candidat.', duration: '1h' },
        { step: 2, title: 'Cours de fondements', description: '4 séances sur le salut, la vie chrétienne, l\'Église et le baptême.', duration: '4 semaines' },
        { step: 3, title: 'Témoignage écrit', description: 'Rédiger son témoignage de conversion.', duration: '1 semaine' },
        { step: 4, title: 'Répétition pratique', description: 'Préparation logistique du baptême.', duration: '1h' },
        { step: 5, title: 'Cérémonie de baptême', description: 'Baptême public lors d\'un culte spécial.', duration: 'Dimanche' },
      ],
    }
  }
}
