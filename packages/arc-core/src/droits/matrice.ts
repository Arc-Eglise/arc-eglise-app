// Matrice des droits nommés — ADR-001 v2.1 (Règle R5)
// Signatures identiques à src/lib/droits/index.ts pour faciliter la bascule (Chantier C)
// R5 : le droit suit la mission — communication → contenu, pas les personnes

import { isAdminOuPasteur } from "../referentiel/roles"
import type { ProfileLike, NoteLike } from "./types"

function hasGroup(p: ProfileLike, g: string): boolean {
  return (p?.groups ?? []).includes(g)
}

export const droits = {
  /** Outils CMS vitrine : bannière, thème, annonces, témoignages, sermons */
  peutGererContenuSite: (p: ProfileLike): boolean =>
    isAdminOuPasteur(p.role) ||
    hasGroup(p, "communication") ||
    hasGroup(p, "media"),

  /** Annuaire détaillé : téléphone, ville, données privées */
  peutVoirAnnuaireDetaille: (p: ProfileLike): boolean =>
    isAdminOuPasteur(p.role) ||
    hasGroup(p, "suivi") ||
    hasGroup(p, "support"),

  /** Pipeline pastoral : étapes, progression des membres */
  peutVoirPipelinePastoral: (p: ProfileLike): boolean =>
    isAdminOuPasteur(p.role) || hasGroup(p, "suivi"),

  /** Écrire une note pastorale */
  peutEcrireNotesPastorales: (p: ProfileLike): boolean =>
    isAdminOuPasteur(p.role) || hasGroup(p, "suivi"),

  /** Lire une note spécifique — tient compte de la confidentialité */
  peutLireNotesPastorales: (p: ProfileLike, note: NoteLike): boolean => {
    if (isAdminOuPasteur(p.role)) return true
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
    isAdminOuPasteur(p.role),

  /** Accéder au CRM pastoral (fiche membre détaillée) */
  peutVoirCRM: (p: ProfileLike): boolean =>
    isAdminOuPasteur(p.role) ||
    hasGroup(p, "suivi") ||
    hasGroup(p, "support"),

  /**
   * Accéder au panneau Administration.
   * Union de tous les droits — dès qu'un rôle ou une fonction ouvre un onglet.
   */
  peutVoirAdminPanel: (p: ProfileLike): boolean =>
    isAdminOuPasteur(p.role) ||
    hasGroup(p, "communication") ||
    hasGroup(p, "media") ||
    hasGroup(p, "support") ||
    hasGroup(p, "suivi"),
}
