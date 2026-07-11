/**
 * Feature flags pilotés par les variables d'environnement Vercel.
 *
 * Pour activer les dons une fois Stripe configuré :
 *   → Ajouter NEXT_PUBLIC_DONS_ENABLED=true dans les env vars Vercel (Production)
 *   → Redéployer (les NEXT_PUBLIC vars sont embarquées au build)
 *
 * Valeur par défaut : false (désactivé).
 */
export const DONS_ENABLED = process.env.NEXT_PUBLIC_DONS_ENABLED === "true";
