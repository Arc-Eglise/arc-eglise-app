/**
 * Module des droits nommés — ADR-001 Chantier A2
 *
 * Remplace les booléens ad-hoc (canAdmin, canSupportFunc…) par des fonctions
 * nommées qui expriment la règle métier.
 *
 * Ce module est temporaire : il sera remplacé par arc-core/droits/ lors du
 * chantier B1 (bascule). Les signatures sont conçues pour être identiques.
 *
 * Règle R5 (ADR-001) : le droit suit la mission.
 * - communication → outils contenu, pas les personnes
 * - support       → annuaire détaillé + outils techniques, pas pipeline ni notes
 * - suivi         → pipeline + notes partagées + ses propres notes
 * - pasteur/admin → tout
 */

export type ProfileLike = {
  id?: string | null
  role?: string | null
  groups?: string[] | null
}

export type NoteLike = {
  confidentialite?: string | null
  author_id?: string | null
}

const isAdminOrPasteur = (p: ProfileLike) =>
  p?.role === "admin" || p?.role === "pasteur"

const hasGroup = (p: ProfileLike, g: string) =>
  (p?.groups ?? []).includes(g)

export const droits = {
  /** Outils CMS vitrine : bannière, thème, annonces, témoignages, sermons */
  peutGererContenuSite: (p: ProfileLike): boolean =>
    isAdminOrPasteur(p) ||
    hasGroup(p, "communication") ||
    hasGroup(p, "media"),

  /** Annuaire détaillé : téléphone, ville, données privées */
  peutVoirAnnuaireDetaille: (p: ProfileLike): boolean =>
    isAdminOrPasteur(p) ||
    hasGroup(p, "suivi") ||
    hasGroup(p, "support"),

  /** Pipeline pastoral : étapes, progression des membres */
  peutVoirPipelinePastoral: (p: ProfileLike): boolean =>
    isAdminOrPasteur(p) || hasGroup(p, "suivi"),

  /** Écrire une note pastorale */
  peutEcrireNotesPastorales: (p: ProfileLike): boolean =>
    isAdminOrPasteur(p) || hasGroup(p, "suivi"),

  /** Lire une note spécifique — tient compte de la confidentialité */
  peutLireNotesPastorales: (p: ProfileLike, note: NoteLike): boolean => {
    if (isAdminOrPasteur(p)) return true
    if (!hasGroup(p, "suivi")) return false
    return (
      note?.confidentialite === "partagee_suivi" ||
      (!!p?.id && note?.author_id === p.id)
    )
  },

  /** Outils techniques : gestion support, RustDesk, comptes bloqués */
  peutGererComptesTechniques: (p: ProfileLike): boolean =>
    p?.role === "admin" || hasGroup(p, "support"),

  /** Gestion des rôles et fonctions — admin uniquement */
  peutGererRolesEtFonctions: (p: ProfileLike): boolean =>
    p?.role === "admin",

  /** Inviter de nouveaux membres */
  peutInviterMembres: (p: ProfileLike): boolean =>
    isAdminOrPasteur(p),

  /** Accéder au CRM pastoral (fiche membre détaillée) */
  peutVoirCRM: (p: ProfileLike): boolean =>
    isAdminOrPasteur(p) ||
    hasGroup(p, "suivi") ||
    hasGroup(p, "support"),

  /**
   * Accéder au panneau Administration.
   * Union de tous les droits — dès qu'un rôle ou une fonction ouvre un onglet.
   */
  peutVoirAdminPanel: (p: ProfileLike): boolean =>
    isAdminOrPasteur(p) ||
    hasGroup(p, "communication") ||
    hasGroup(p, "media") ||
    hasGroup(p, "support") ||
    hasGroup(p, "suivi"),
}
