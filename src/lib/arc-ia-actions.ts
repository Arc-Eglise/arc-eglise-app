/**
 * Protocole d'actions ARC IA (agentique).
 *
 * ARC IA peut, en plus de son texte, émettre des « directives d'action » balisées
 * dans son flux de réponse. Un wrapper de streaming côté serveur les extrait, les
 * retire du texte affiché et émet un événement SSE `{ type: "action", action }`.
 * Le client exécute alors l'action (navigation directe, ou bouton de confirmation
 * pour les créations, ou appel d'une API scoped pour les recherches sensibles).
 *
 * Format d'un marqueur (produit par le LLM dans sa réponse) :
 *   ⟦ARC⟧{"type":"open_bible_tool","tool":"dico"}⟦/ARC⟧
 *
 * ⚠️ Ce module est ISOMORPHE (aucun import serveur) — il est importé côté client
 * pour les types et le rendu des boutons. Ne rien y importer de `@/lib/supabase`
 * ni d'autres modules server-only.
 */

// ── Types d'actions ──────────────────────────────────────────────────────────

/** Onglets de la section « Prière & Bible » (état `bTab` d'EspaceMembresClient). */
export type BibleTool =
  | "verset" | "lecteur" | "etude" | "theo" | "dico" | "mur" | "plans" | "notes";

export type ArcAction =
  // ── Navigation (exécution directe côté client) ──
  | { type: "open_panel"; target: string; label?: string }
  | { type: "open_bible_tool"; tool: BibleTool; label?: string }
  | {
      type: "open_verse";
      ref?: string;        // ex. "Genèse 12:1" — résolu côté client
      book?: string;       // nom du livre (fallback si pas de ref)
      bookId?: number;     // id numérique du lecteur (ex. 42 = Luc)
      chapter?: number;
      verse?: number;
      label?: string;
    }
  // ── Mutation (bouton de confirmation côté client) ──
  | {
      type: "launch_reading_plan";
      planId?: string;     // id d'un plan existant si connu
      theme?: string;      // sinon thème pour retrouver/générer
      title?: string;
      ai?: boolean;        // plan généré par IA
      label?: string;
    }
  | {
      type: "create_event_draft";
      title?: string;
      date?: string;       // ISO ou "mardi prochain" (résolu au mieux)
      time?: string;
      location?: string;
      description?: string;
      label?: string;
    }
  // ── Lookup (bouton → API scoped → rendu local ; contenu jamais envoyé au LLM) ──
  | { type: "search_messages"; query: string; label?: string }
  | { type: "search_mail"; query: string; label?: string }
  | { type: "open_person"; name: string; label?: string }
  // ── Transfert humain (garde-fou) ──
  | { type: "contact_pastor"; reason?: string; label?: string };

export type ArcActionType = ArcAction["type"];

export const ALL_ACTION_TYPES: ArcActionType[] = [
  "open_panel", "open_bible_tool", "open_verse",
  "launch_reading_plan", "create_event_draft",
  "search_messages", "search_mail", "open_person",
  "contact_pastor",
];

const KNOWN = new Set<string>(ALL_ACTION_TYPES);

export function isArcAction(x: unknown): x is ArcAction {
  return (
    typeof x === "object" && x !== null &&
    typeof (x as { type?: unknown }).type === "string" &&
    KNOWN.has((x as { type: string }).type)
  );
}

// ── Marqueurs ─────────────────────────────────────────────────────────────────

export const ACTION_OPEN = "⟦ARC⟧";   // ⟦ARC⟧
export const ACTION_CLOSE = "⟦/ARC⟧";  // ⟦/ARC⟧

/**
 * Parse défensif d'un texte complet : extrait tous les blocs d'action valides et
 * renvoie le texte nettoyé (blocs retirés). Les blocs malformés sont ignorés
 * silencieusement — le texte reste lisible. Utile côté client comme filet de
 * sécurité si un marqueur passe dans le texte.
 */
export function parseArcActions(text: string): { clean: string; actions: ArcAction[] } {
  const actions: ArcAction[] = [];
  let clean = "";
  let i = 0;
  while (i < text.length) {
    const open = text.indexOf(ACTION_OPEN, i);
    if (open === -1) { clean += text.slice(i); break; }
    clean += text.slice(i, open);
    const close = text.indexOf(ACTION_CLOSE, open + ACTION_OPEN.length);
    if (close === -1) {
      // Marqueur ouvrant non terminé : on abandonne le reste (probablement tronqué).
      break;
    }
    const raw = text.slice(open + ACTION_OPEN.length, close).trim();
    const parsed = tryParseAction(raw);
    if (parsed) actions.push(parsed);
    i = close + ACTION_CLOSE.length;
  }
  return { clean: clean.replace(/[ \t]{2,}/g, " ").trim(), actions };
}

function tryParseAction(raw: string): ArcAction | null {
  try {
    const obj = JSON.parse(raw);
    return isArcAction(obj) ? (obj as ArcAction) : null;
  } catch {
    return null;
  }
}

// ── Extracteur incrémental (streaming) ──────────────────────────────────────
//
// Détecte les marqueurs qui peuvent chevaucher plusieurs chunks. Émet le texte
// « propre » au fil de l'eau et collecte les actions dès qu'un bloc est complet.

export interface ActionStreamExtractor {
  /** Consomme un morceau de texte. Renvoie le texte propre + actions complètes. */
  push(chunk: string): { text: string; actions: ArcAction[] };
  /** Vide le tampon en fin de flux (texte résiduel). Les blocs non terminés sont ignorés. */
  flush(): { text: string; actions: ArcAction[] };
}

/** Longueur du plus long suffixe de `s` qui est un préfixe de `marker`. */
function suffixPrefixLen(s: string, marker: string): number {
  const max = Math.min(s.length, marker.length - 1);
  for (let n = max; n > 0; n--) {
    if (s.slice(s.length - n) === marker.slice(0, n)) return n;
  }
  return 0;
}

export function createActionExtractor(): ActionStreamExtractor {
  let buf = "";
  let inAction = false;

  function drain(final: boolean): { text: string; actions: ArcAction[] } {
    let text = "";
    const actions: ArcAction[] = [];
    for (;;) {
      if (!inAction) {
        const open = buf.indexOf(ACTION_OPEN);
        if (open === -1) {
          if (final) { text += buf; buf = ""; break; }
          // Garde un éventuel préfixe partiel du marqueur ouvrant.
          const hold = suffixPrefixLen(buf, ACTION_OPEN);
          text += buf.slice(0, buf.length - hold);
          buf = buf.slice(buf.length - hold);
          break;
        }
        text += buf.slice(0, open);
        buf = buf.slice(open + ACTION_OPEN.length);
        inAction = true;
      } else {
        const close = buf.indexOf(ACTION_CLOSE);
        if (close === -1) {
          if (final) { buf = ""; break; } // bloc non terminé → ignoré
          break; // attend plus de données
        }
        const parsed = tryParseAction(buf.slice(0, close).trim());
        if (parsed) actions.push(parsed);
        buf = buf.slice(close + ACTION_CLOSE.length);
        inAction = false;
      }
    }
    return { text, actions };
  }

  return {
    push(chunk: string) { buf += chunk; return drain(false); },
    flush() { return drain(true); },
  };
}

// ── Prompt outillage (injecté dans le system prompt d'ARC IA) ────────────────

const ACTION_DOC: Record<ArcActionType, string> = {
  open_panel:
    `⟦ARC⟧{"type":"open_panel","target":"agenda"}⟦/ARC⟧ — ouvre une section de l'espace membre. ` +
    `target ∈ {accueil, agenda, priere, streaming, messagerie, contacts, presences, activites, notes, doleances}. ` +
    `Utilise-le quand le membre veut aller quelque part (ex. « montre-moi l'agenda »).`,
  open_bible_tool:
    `⟦ARC⟧{"type":"open_bible_tool","tool":"dico"}⟦/ARC⟧ — ouvre un outil de « Prière & Bible ». ` +
    `tool ∈ {verset, lecteur, etude, theo, dico, mur, plans, notes}. ` +
    `Ex. étude d'un thème → "etude" ; sens d'un mot → "dico" ; déposer une prière → "mur".`,
  open_verse:
    `⟦ARC⟧{"type":"open_verse","ref":"Jean 3:16"}⟦/ARC⟧ — ouvre un passage précis dans le lecteur biblique. ` +
    `Donne toujours "ref" (ex. « Genèse 12:1 », « Psaume 23 »). Utilise-le quand tu cites un verset.`,
  launch_reading_plan:
    `⟦ARC⟧{"type":"launch_reading_plan","theme":"la foi","title":"Grandir dans la foi"}⟦/ARC⟧ — propose de LANCER un plan de lecture ` +
    `(le membre confirmera d'un clic). Donne "theme" (et "title" si tu en proposes un). ` +
    `Utilise-le quand le membre veut lire la Bible régulièrement / sur un sujet.`,
  create_event_draft:
    `⟦ARC⟧{"type":"create_event_draft","title":"Réunion de prière","date":"2026-08-05","time":"19:00"}⟦/ARC⟧ — pré-remplit ` +
    `un brouillon d'événement dans l'agenda (le membre validera). Ne l'émets QUE si le membre a le droit de créer un événement.`,
  search_messages:
    `⟦ARC⟧{"type":"search_messages","query":"retraite"}⟦/ARC⟧ — propose de rechercher dans les messages/conversations du membre ` +
    `(recherche exécutée en local, tu ne vois jamais le contenu). Mets dans "query" les mots-clés du membre.`,
  search_mail:
    `⟦ARC⟧{"type":"search_mail","query":"commission"}⟦/ARC⟧ — propose de rechercher un e-mail ` +
    `(recherche locale, contenu jamais transmis). Ne l'émets QUE si le membre a accès à une boîte mail.`,
  open_person:
    `⟦ARC⟧{"type":"open_person","name":"Moïse"}⟦/ARC⟧ — affiche la biographie d'un personnage biblique + ses versets/livres ` +
    `(liens qui ouvrent le passage). Utilise-le quand le membre demande « qui est … ? ».`,
  contact_pastor:
    `⟦ARC⟧{"type":"contact_pastor","reason":"situation sensible"}⟦/ARC⟧ — propose de contacter un responsable humain. ` +
    `Utilise-le pour toute situation grave/sensible OU toute demande hors de ton périmètre.`,
};

/**
 * Construit la section « outils » du system prompt, en ne documentant QUE les
 * actions autorisées pour ce membre (selon ses droits).
 */
export function buildArcToolsPrompt(allowed: ArcActionType[]): string {
  const lines = allowed.filter((t) => ACTION_DOC[t]).map((t) => `- ${ACTION_DOC[t]}`);
  return [
    "OUTILS D'ACTION — tu peux AGIR dans l'espace membre en insérant des marqueurs dans ta réponse.",
    `Format strict : ${ACTION_OPEN}{...json...}${ACTION_CLOSE} (JSON sur une seule ligne, valide).`,
    "Règles : place le marqueur juste après la phrase concernée ; n'invente jamais un type d'action ; " +
    "n'émets une action que si elle sert vraiment la demande ; au plus 2 actions par réponse ; " +
    "ne colle PAS de marqueur si aucune action n'est pertinente (réponds simplement en texte).",
    "Actions disponibles pour CE membre :",
    ...lines,
  ].join("\n");
}
