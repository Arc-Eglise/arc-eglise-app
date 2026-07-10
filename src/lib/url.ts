// Source de vérité unique pour l'URL de base d'ARC Église.
// JAMAIS de domaine vercel.app en dur dans le code.
// Toujours importer siteUrl() ou SITE_BASE ici plutôt que de lire
// process.env.NEXT_PUBLIC_SITE_URL directement dans chaque fichier.

const BASE = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://arc-eglise.ch").replace(/\/$/, "");

/** Construit une URL absolue sur arc-eglise.ch. Ex: siteUrl("/auth/callback") */
export function siteUrl(path = ""): string {
  if (!path) return BASE;
  return `${BASE}/${path.replace(/^\//, "")}`;
}

/** L'URL de base sans slash final : https://arc-eglise.ch */
export const SITE_BASE = BASE;
