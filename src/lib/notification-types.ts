/**
 * Catalogue des catégories de notifications ARC Église.
 * Partagé client (UI de préférences) et serveur (filtrage dans notify.ts).
 *
 * Les préférences utilisateur sont stockées dans `profiles.notification_prefs`
 * (jsonb), indexées par `key`. Modèle opt-out : absent OU true = activé,
 * false = désactivé. `locked: true` = non désactivable (compte/sécurité).
 */

export type NotificationCategory = {
  key: string;
  label: string;
  description: string;
  icon: string;
  /** Types techniques (colonne notifications.type) couverts par cette catégorie. */
  types: string[];
  /** Non désactivable par l'utilisateur. */
  locked?: boolean;
};

export const NOTIFICATION_CATEGORIES: NotificationCategory[] = [
  { key: "message", label: "Messagerie", description: "Nouveaux messages reçus", icon: "💬", types: ["message"] },
  { key: "prayer", label: "Prière", description: "Prières exaucées, jalons, intentions", icon: "🙏", types: ["prayer"] },
  { key: "agenda", label: "Agenda & événements", description: "Nouveaux événements et rappels du jour", icon: "📅", types: ["event", "agenda"] },
  { key: "rsvp", label: "Présences", description: "Confirmations de présence et check-in", icon: "✅", types: ["rsvp"] },
  { key: "stream", label: "Diffusions en direct", description: "Cultes et directs qui démarrent", icon: "🔴", types: ["stream"] },
  { key: "mail", label: "Boîte mail", description: "Emails non lus (Microsoft 365)", icon: "📧", types: ["mail"] },
  { key: "sermon", label: "Prédications", description: "Nouveaux sermons publiés", icon: "🎙", types: ["sermon"] },
  { key: "lecture", label: "Plans de lecture", description: "Progression des plans bibliques", icon: "📖", types: ["lecture"] },
  { key: "system", label: "Annonces & compte", description: "Validation de compte, rôles, annonces de l'église", icon: "🔔", types: ["system"], locked: true },
];

/** Retourne la clé de catégorie couvrant un type technique donné (ou null). */
export function categoryKeyForType(type: string): string | null {
  const cat = NOTIFICATION_CATEGORIES.find((c) => c.types.includes(type));
  return cat ? cat.key : null;
}

/**
 * Une catégorie est-elle activée d'après les préférences ?
 * Opt-out : indéfini/true = activé, false = désactivé. Les catégories
 * `locked` sont toujours actives.
 */
export function isCategoryEnabled(
  prefs: Record<string, boolean> | null | undefined,
  key: string
): boolean {
  const cat = NOTIFICATION_CATEGORIES.find((c) => c.key === key);
  if (cat?.locked) return true;
  if (!prefs) return true;
  return prefs[key] !== false;
}

/** Un type technique doit-il être notifié pour cet utilisateur ? */
export function isTypeEnabled(
  prefs: Record<string, boolean> | null | undefined,
  type: string
): boolean {
  const key = categoryKeyForType(type);
  if (!key) return true; // type non catalogué (ex. don) : toujours notifié
  return isCategoryEnabled(prefs, key);
}
