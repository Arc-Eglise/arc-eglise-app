// Configuration centralisée — fonction → boîte mail Microsoft 365

export const FUNCTION_MAILBOXES: Record<string, string> = {
  chorale:       "chorale@arc-eglise.ch",
  communication: "communication@arc-eglise.ch",
  media:         "media@arc-eglise.ch",
  finance:       "finance@arc-eglise.ch",
  femmes:        "femmes@arc-eglise.ch",
  jeunesse:      "jeunesse@arc-eglise.ch",
  ecodim:        "ecodim@arc-eglise.ch",
  sanitaire:     "sanitaire@arc-eglise.ch",
  social:        "hospitalite@arc-eglise.ch",
  pasteur:       "pasteurs@arc-eglise.ch",
  suivi:         "pastoral@arc-eglise.ch",
  support:       "support@arc-eglise.ch",
};

export const CONTACT_MAILBOX = "contact@arc-eglise.ch";

// Fonctions qui ont aussi accès à contact@
const GROUPS_WITH_CONTACT = new Set(["pasteur", "suivi", "support"]);

export function getAuthorizedMailboxes(role: string, groups: string[]): string[] {
  if (role === "admin" || role === "pasteur") {
    return [CONTACT_MAILBOX, ...Object.values(FUNCTION_MAILBOXES)];
  }
  const boxes = new Set<string>();
  for (const g of groups) {
    if (FUNCTION_MAILBOXES[g]) boxes.add(FUNCTION_MAILBOXES[g]);
    if (GROUPS_WITH_CONTACT.has(g)) boxes.add(CONTACT_MAILBOX);
  }
  return Array.from(boxes);
}

export function getMailboxLabel(email: string): string {
  const labels: Record<string, string> = {
    [CONTACT_MAILBOX]:               "📮 Contact",
    "chorale@arc-eglise.ch":         "🎵 Chorale",
    "communication@arc-eglise.ch":   "📣 Communication",
    "media@arc-eglise.ch":           "🎬 Médias",
    "finance@arc-eglise.ch":         "💰 Finance",
    "femmes@arc-eglise.ch":          "♀ Femmes",
    "jeunesse@arc-eglise.ch":        "⚡ Jeunesse",
    "ecodim@arc-eglise.ch":          "✏️ École du dim.",
    "sanitaire@arc-eglise.ch":       "🏥 Sanitaire",
    "hospitalite@arc-eglise.ch":     "🤝 Hospitalité",
    "pasteurs@arc-eglise.ch":        "✝️ Pasteurs",
    "pastoral@arc-eglise.ch":        "🌿 Pastoral",
    "support@arc-eglise.ch":         "🛠 Support",
  };
  return labels[email] ?? email;
}

export function isGrievanceEmail(subject: string): boolean {
  return subject?.startsWith("[Doléance]") ?? false;
}
