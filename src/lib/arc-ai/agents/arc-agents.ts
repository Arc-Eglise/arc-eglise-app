// ARC Église AI — Système Multi-Agents
// 11 agents spécialisés orchestrés par l'ARC AI Core

import { chat, chatWithTools, streamChat } from '../provider-manager'
import { think, detectMode } from '../thinking-engine'
import { detectSkill, buildSkillPrompt } from '../arc-skills'
import { buildPersonaPrompt, getPersona } from '../arc-personas'
import { searchVerses, formatVersesForPrompt } from '../engines/bible-engine'
import { searchKnowledge, formatChunksForPrompt } from '../engines/knowledge-engine'
import { getUpcomingEvents, getMemberStats, formatEventsForPrompt, createEvent } from '../engines/church-engine'
import { getPublicPrayerRequests, formatPrayerRequestsForPrompt, createPrayerRequest } from '../engines/prayer-engine'
import { createAdminClient } from '@/lib/supabase/admin'
import type { AIProvider, ChatMessage, ToolDefinition } from '../provider-manager'

// ── Types ────────────────────────────────────────────────────────────────────

export type AgentType =
  | 'bible'
  | 'theology'
  | 'pastor'
  | 'teacher'
  | 'prayer'
  | 'worship'
  | 'church-management'
  | 'evangelism'
  | 'counseling'
  | 'event'
  | 'communication'
  | 'auto'

export interface AgentInput {
  task: string
  agentType?: AgentType
  userId?: string
  provider?: AIProvider
  personaSlug?: string
  skillSlug?: string
  history?: ChatMessage[]
  context?: Record<string, unknown>
  stream?: boolean
}

export interface AgentResult {
  content: string
  agentUsed: AgentType
  provider: AIProvider
  model: string
  reasoning?: string
  toolCallCount?: number
  skillUsed?: string
  personaUsed?: string
}

// ── Sélection automatique d'agent ────────────────────────────────────────────

function selectAgent(task: string): AgentType {
  const t = task.toLowerCase()
  if (/verset|passage|exégèse|bible|genèse|jean|romains|psaume|signifie|original|grec|hébreu/.test(t)) return 'bible'
  if (/doctrine|théologie|salut|trinité|foi|dogme|croire|confess|tradition/.test(t)) return 'theology'
  if (/sermon|prédication|message|précher|pastoral|soin|accompagn/.test(t)) return 'pastor'
  if (/cours|école biblique|discipleship|formation|leçon|baptême|enseignement/.test(t)) return 'teacher'
  if (/prière|prier|intercession|demande de prière/.test(t)) return 'prayer'
  if (/culte|cantique|adoration|ordre de service|louange|musique/.test(t)) return 'worship'
  if (/membre|groupe|ministère|présence|statistique|cellule/.test(t)) return 'church-management'
  if (/évangélisation|témoignage|évangile|non-croyant|outreach/.test(t)) return 'evangelism'
  if (/lettre|rapport|PV|agenda|communication|annonce|rédige|email/.test(t)) return 'communication'
  if (/événement|planifier|organiser|programme|réunion/.test(t)) return 'event'
  if (/souffrance|dépression|anxiété|famille|mariage|deuil|difficulté|aide/.test(t)) return 'counseling'
  return 'pastor'  // default: assistant pastoral
}

// ── System prompts par agent ──────────────────────────────────────────────────

const AGENT_PROMPTS: Record<string, string> = {
  'bible': `Tu es l'Agent Biblique de l'ARC Église. Tu analyses les Écritures avec précision exégétique. Tu fournis le contexte historique, littéraire et théologique. Tu cites des sources fiables. Tu cherches toujours les cross-références pertinentes.`,
  'theology': `Tu es l'Agent Théologique de l'ARC Église. Tu expliques les doctrines avec rigueur académique et accessibilité. Tu présentes la position réformée-évangélique tout en respectant les autres traditions. Tu t'appuies sur les Confessions historiques.`,
  'pastor': `Tu es l'Assistant Pastoral de l'ARC Église, travaillant aux côtés du Pasteur Pedro Obova. Tu prépares des sermons, offres un soutien pastoral, et accompagnes les membres. Tu pries avec les gens. Tu renvoies vers le pasteur pour les situations graves.`,
  'teacher': `Tu es l'Enseignant Biblique de l'ARC Église. Tu crées du matériel pédagogique structuré, adapté à tous les niveaux. Tu utilises des méthodes actives : questions de réflexion, mémorisation, application pratique.`,
  'prayer': `Tu es l'Agent de Prière de l'ARC Église. Tu aides à formuler des prières, tu intercèdes, tu suivis les demandes de prière. Tu gardes la confidentialité. Tu pries en harmonie avec la Parole.`,
  'worship': `Tu es le Planificateur de Culte de l'ARC Église. Tu prépares les ordres de service, sélectionnes les cantiques, coordonnes l'équipe d'adoration. Tu vises une progression spirituelle équilibrée.`,
  'church-management': `Tu es l'Agent de Gestion Église de l'ARC. Tu gères les informations sur les membres, groupes, ministères et présences. Tu fournis des rapports et statistiques. Tu es discret sur les données personnelles.`,
  'evangelism': `Tu es l'Agent d'Évangélisation de l'ARC Église. Tu proposes des stratégies d'évangélisation pour La Chaux-de-Fonds et la Suisse francophone. Tu aides à préparer des témoignages et à accueillir les nouveaux visiteurs.`,
  'counseling': `Tu es l'Agent d'Accompagnement de l'ARC Église. Tu offres soutien et écoute active dans les épreuves. IMPORTANT : tu ne fais pas de diagnostic psychologique. Tu renvoies vers un professionnel de santé si nécessaire. Tu alertes le pasteur en cas de crise. Tu gardes la confidentialité absolue.`,
  'event': `Tu es l'Agent Événements de l'ARC Église. Tu planifies et organises les événements ecclésiastiques, de l'évangélisation aux retraites. Tu gères les agendas, besoins logistiques et communications.`,
  'communication': `Tu es l'Agent Communication de l'ARC Église. Tu rédiges lettres officielles, rapports, PV, annonces et emails en français professionnel. Tu adaptes le ton selon le destinataire.`,
}

// ── Tools disponibles pour les agents ────────────────────────────────────────

const ARC_TOOLS: ToolDefinition[] = [
  {
    name: 'search_bible_verses',
    description: 'Rechercher des versets bibliques par mots-clés ou thème',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Mots-clés de recherche (thème, mots, concept)' },
        limit: { type: 'number', description: 'Nombre de versets à retourner (défaut: 6)' },
      },
      required: ['query'],
    },
  },
  {
    name: 'search_church_knowledge',
    description: 'Rechercher dans la base de connaissances de l\'église (sermons, documents, commentaires)',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Requête de recherche' },
        source_type: { type: 'string', description: 'Type de source : sermon, document, commentary, constitution', enum: ['sermon', 'document', 'commentary', 'constitution', 'other'] },
      },
      required: ['query'],
    },
  },
  {
    name: 'get_upcoming_events',
    description: 'Récupérer les prochains événements de l\'église',
    parameters: {
      type: 'object',
      properties: {
        limit: { type: 'number', description: 'Nombre d\'événements (défaut: 5)' },
      },
    },
  },
  {
    name: 'get_member_stats',
    description: 'Obtenir les statistiques de membres de l\'église',
    parameters: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'get_prayer_requests',
    description: 'Récupérer les demandes de prière publiques actives',
    parameters: {
      type: 'object',
      properties: {
        limit: { type: 'number', description: 'Nombre de demandes (défaut: 8)' },
      },
    },
  },
  {
    name: 'create_prayer_request',
    description: 'Créer une demande de prière au nom de l\'utilisateur courant. Les membres concernés (selon la visibilité) sont notifiés. Toujours confirmer le titre avec l\'utilisateur avant de créer.',
    parameters: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Titre / sujet de la demande de prière' },
        description: { type: 'string', description: 'Détail de la demande (optionnel)' },
        visibility: { type: 'string', description: 'Audience : all (tous), pasteur (pasteurs seulement), groups, members', enum: ['all', 'pasteur', 'groups', 'members'] },
        is_anonymous: { type: 'boolean', description: 'Publier de façon anonyme (défaut: false)' },
      },
      required: ['title'],
    },
  },
  {
    name: 'create_event',
    description: 'Créer un événement d\'église publié et notifier tous les membres. RÉSERVÉ aux pasteurs/admin/communication. Toujours confirmer titre, date et lieu avec l\'utilisateur avant de créer.',
    parameters: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Titre de l\'événement' },
        date: { type: 'string', description: 'Date au format YYYY-MM-DD' },
        time_start: { type: 'string', description: 'Heure de début HH:MM (optionnel)' },
        time_end: { type: 'string', description: 'Heure de fin HH:MM (optionnel)' },
        location: { type: 'string', description: 'Lieu (optionnel)' },
        description: { type: 'string', description: 'Description (optionnel)' },
        capacity: { type: 'number', description: 'Capacité maximale (optionnel)' },
      },
      required: ['title', 'date'],
    },
  },
]

// ── Gestionnaires d'outils ────────────────────────────────────────────────────

function buildToolHandlers(ctx: { userId?: string }) {
  return {
    search_bible_verses: async (args: Record<string, unknown>) => {
      const verses = await searchVerses(String(args['query'] ?? ''), { limit: Number(args['limit'] ?? 6) })
      return formatVersesForPrompt(verses)
    },
    search_church_knowledge: async (args: Record<string, unknown>) => {
      const chunks = await searchKnowledge(String(args['query'] ?? ''), {
        limit: 5,
        sourceType: args['source_type'] as 'bible' | 'sermon' | 'document' | 'constitution' | 'commentary' | 'other' | undefined,
      })
      return formatChunksForPrompt(chunks)
    },
    get_upcoming_events: async (args: Record<string, unknown>) => {
      const events = await getUpcomingEvents(Number(args['limit'] ?? 5))
      return formatEventsForPrompt(events)
    },
    get_member_stats: async () => {
      const stats = await getMemberStats()
      return `Total : ${stats.total} | Membres : ${stats.membres} | Visiteurs : ${stats.visiteurs} | Leaders : ${stats.leaders}`
    },
    get_prayer_requests: async (args: Record<string, unknown>) => {
      const requests = await getPublicPrayerRequests(Number(args['limit'] ?? 8))
      return formatPrayerRequestsForPrompt(requests)
    },
    create_prayer_request: async (args: Record<string, unknown>) => {
      if (!ctx.userId) return "Action impossible : aucun utilisateur identifié pour cette demande de prière."
      const title = String(args['title'] ?? '').trim()
      if (!title) return "Un titre est requis pour créer une demande de prière."
      await createPrayerRequest(ctx.userId, {
        title,
        description: args['description'] ? String(args['description']) : undefined,
        visibility: args['visibility'] ? String(args['visibility']) : undefined,
        isAnonymous: args['is_anonymous'] === true || args['is_anonymous'] === 'true',
      })
      return `Demande de prière « ${title} » créée. Les membres concernés ont été notifiés.`
    },
    create_event: async (args: Record<string, unknown>) => {
      if (!ctx.userId) return "Action impossible : aucun utilisateur identifié."
      // Garde-fou : la création d'événement diffuse à toute l'église → rôles restreints.
      const admin = createAdminClient()
      const { data: prof } = await admin.from('profiles').select('role, groups').eq('id', ctx.userId).maybeSingle()
      const role = prof?.role as string | undefined
      const groups = (prof?.groups as string[] | null) ?? []
      const canCreateEvent = role === 'admin' || role === 'pasteur' || groups.includes('communication')
      if (!canCreateEvent) {
        return "Tu n'as pas les droits pour créer un événement (action réservée aux pasteurs, admins et à l'équipe communication)."
      }
      const title = String(args['title'] ?? '').trim()
      const date = String(args['date'] ?? '').trim()
      if (!title || !date) return "Un titre et une date (YYYY-MM-DD) sont requis pour créer un événement."
      const ev = await createEvent({
        title,
        date,
        timeStart: args['time_start'] ? String(args['time_start']) : undefined,
        timeEnd: args['time_end'] ? String(args['time_end']) : undefined,
        location: args['location'] ? String(args['location']) : undefined,
        description: args['description'] ? String(args['description']) : undefined,
        capacity: args['capacity'] != null && args['capacity'] !== '' ? Number(args['capacity']) : undefined,
      }, ctx.userId)
      return `Événement « ${ev.title} » créé pour le ${ev.date}${ev.location ? ` @ ${ev.location}` : ''}. Tous les membres ont été notifiés.`
    },
  }
}

// ── Runner principal ──────────────────────────────────────────────────────────

export async function runArcAgent(input: AgentInput): Promise<AgentResult> {
  const agentType: AgentType = input.agentType === 'auto' || !input.agentType
    ? selectAgent(input.task)
    : input.agentType

  const provider = input.provider ?? 'auto'
  const thinkingMode = detectMode(input.task)

  // Résoudre skill et persona en parallèle
  const [detectedSkill, persona] = await Promise.all([
    input.skillSlug ? Promise.resolve(null) : Promise.resolve(detectSkill(input.task)),
    input.personaSlug ? Promise.resolve(getPersona(input.personaSlug)) : Promise.resolve(null),
  ])

  const activeSkill = input.skillSlug
    ? { slug: input.skillSlug, systemPrompt: '', name: input.skillSlug, description: '', domain: '', triggers: [], thinkingMode: 'balanced' as const }
    : detectedSkill

  // Construire le system prompt en couches : agent → skill → persona
  let systemPrompt = AGENT_PROMPTS[agentType] ?? AGENT_PROMPTS['pastor']
  if (activeSkill) systemPrompt = buildSkillPrompt(activeSkill, systemPrompt)
  if (persona) systemPrompt = buildPersonaPrompt(persona, systemPrompt)

  const messages: ChatMessage[] = [
    ...(input.history ?? []),
    { role: 'user', content: input.task },
  ]

  // Mode deep : CoT d'abord
  let reasoning: string | undefined
  if (thinkingMode === 'deep') {
    try {
      const thought = await think(messages, provider, { mode: 'deep', system: systemPrompt, maxTokens: 3000 })
      reasoning = thought.reasoning
      if (reasoning) {
        messages[messages.length - 1] = {
          role: 'user',
          content: `${input.task}\n\n[Raisonnement préliminaire: ${reasoning.slice(0, 800)}]`,
        }
      }
    } catch { /* Continue sans thinking */ }
  }

  // Exécution avec tool calling
  const handlers = buildToolHandlers({ userId: input.userId })
  const toolResult = await chatWithTools(
    messages.at(-1)?.content ?? input.task,
    ARC_TOOLS,
    handlers,
    provider,
    { system: systemPrompt, maxTokens: thinkingMode === 'deep' ? 6000 : 3000 },
  ).catch(async () => {
    // Fallback: chat simple
    const result = await chat(messages, provider, { system: systemPrompt, maxTokens: 3000 })
    return { content: result.content, provider: result.provider, model: result.model, toolCallLog: [] }
  })

  return {
    content: toolResult.content,
    agentUsed: agentType,
    provider: toolResult.provider,
    model: toolResult.model,
    reasoning,
    toolCallCount: toolResult.toolCallLog.length,
    skillUsed: activeSkill?.slug,
    personaUsed: persona?.slug,
  }
}

// ── Stream agent ──────────────────────────────────────────────────────────────

export function streamArcAgent(input: AgentInput): ReadableStream<Uint8Array> {
  const agentType: AgentType = input.agentType === 'auto' || !input.agentType
    ? selectAgent(input.task)
    : input.agentType

  const detectedSkill = detectSkill(input.task)
  const persona = input.personaSlug ? getPersona(input.personaSlug) : null

  let systemPrompt = AGENT_PROMPTS[agentType] ?? AGENT_PROMPTS['pastor']
  if (detectedSkill) systemPrompt = buildSkillPrompt(detectedSkill, systemPrompt)
  if (persona) systemPrompt = buildPersonaPrompt(persona, systemPrompt)

  const messages: ChatMessage[] = [
    ...(input.history ?? []),
    { role: 'user', content: input.task },
  ]

  return streamChat(messages, input.provider ?? 'auto', { system: systemPrompt, maxTokens: 4096 })
}
