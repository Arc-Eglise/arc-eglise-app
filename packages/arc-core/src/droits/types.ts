// Types partagés pour le module droits
// Volontairement minimaux : acceptent des objets partiels (profils non chargés)

export type ProfileLike = {
  id?:     string | null
  role?:   string | null
  groups?: string[] | null
}

export type NoteLike = {
  confidentialite?: string | null
  author_id?:       string | null
}

export type NiveauConfidentialite =
  | "partagee_suivi"
  | "confidentielle_pasteur"
  | "publique"
