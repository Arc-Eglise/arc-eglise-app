export type ProfileType =
  | "membre"
  | "nouveau_converti"
  | "jeunesse"
  | "famille"
  | "responsable"
  | "pasteur"
  | "enseignant"

export type ProfileAgeRange =
  | "enfant"
  | "adolescent"
  | "jeune_adulte"
  | "adulte"
  | "senior"

export type SpiritualMaturity =
  | "enfant"
  | "debutant"
  | "intermediaire"
  | "avance"
  | "enseignant"

export interface SpiritualProfile {
  user_id:            string
  profile_type:       ProfileType
  profile_age_range:  ProfileAgeRange
  theological_focus:  string[]
  fav_ot_books:       string[]
  fav_nt_books:       string[]
  prayer_topics:      string[]
  study_themes:       string[]
  spiritual_maturity: SpiritualMaturity
  growth_areas:       string[]
  total_sessions:     number
  total_chapters:     number
  total_minutes:      number
  total_plans:        number
  total_prayers:      number
  ai_context_memo:    string | null
  ai_memo_updated_at: string | null
  show_dashboard:     boolean
  enable_coach:       boolean
  daily_goal_minutes: number
  created_at:         string
  updated_at:         string
}

export const SPIRITUAL_PROFILE_DEFAULTS: Omit<SpiritualProfile, "user_id" | "created_at" | "updated_at"> = {
  profile_type:       "membre",
  profile_age_range:  "adulte",
  theological_focus:  [],
  fav_ot_books:       [],
  fav_nt_books:       [],
  prayer_topics:      [],
  study_themes:       [],
  spiritual_maturity: "intermediaire",
  growth_areas:       [],
  total_sessions:     0,
  total_chapters:     0,
  total_minutes:      0,
  total_plans:        0,
  total_prayers:      0,
  ai_context_memo:    null,
  ai_memo_updated_at: null,
  show_dashboard:     true,
  enable_coach:       true,
  daily_goal_minutes: 15,
}

export const PROFILE_TYPE_LABELS: Record<ProfileType, string> = {
  membre:           "Membre",
  nouveau_converti: "Nouveau converti",
  jeunesse:         "Jeunesse",
  famille:          "Famille",
  responsable:      "Responsable / Leader",
  pasteur:          "Pasteur",
  enseignant:       "Enseignant",
}

export const SPIRITUAL_MATURITY_LABELS: Record<SpiritualMaturity, string> = {
  enfant:        "Enfant dans la foi",
  debutant:      "Débutant",
  intermediaire: "Intermédiaire",
  avance:        "Avancé",
  enseignant:    "Enseignant / Expert",
}

export const PROFILE_TYPE_AI_CONTEXT: Record<ProfileType, string> = {
  membre:           "",
  nouveau_converti: "L'utilisateur est un nouveau croyant. Privilegier les bases de la foi, l'Evangile de Jean, un vocabulaire simple et encourageant.",
  jeunesse:         "L'utilisateur est un jeune (ado/jeune adulte). Utiliser des exemples contemporains, un ton dynamique, lier la foi aux defis du quotidien.",
  famille:          "L'utilisateur cherche des ressources familiales. Proposer des devotionnels courts, des passages accessibles pour tous ages, valoriser la priere en famille.",
  responsable:      "L'utilisateur est responsable de cellule ou leader. Mettre l'accent sur le leadership serviteur, l'accompagnement pastoral de base, la gestion des conflits chretienne.",
  pasteur:          "L'utilisateur est pasteur ou en formation pastorale. Reponses theologiques approfondies, vocabulaire technique, sources academiques appropriees.",
  enseignant:       "L'utilisateur prepare des enseignements bibliques. Fournir des structures pedagogiques, des paralleles thematiques, des ressources exegetiques.",
}

export type SpiritualProfilePatch = Partial<Pick<SpiritualProfile,
  | "profile_type"
  | "profile_age_range"
  | "theological_focus"
  | "fav_ot_books"
  | "fav_nt_books"
  | "prayer_topics"
  | "study_themes"
  | "spiritual_maturity"
  | "growth_areas"
  | "show_dashboard"
  | "enable_coach"
  | "daily_goal_minutes"
>>
