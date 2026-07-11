/**
 * Composant Icon centralisé — bibliothèque ARC Église
 * 45 icônes duotone (marine #2B3475 + bleu #8495C1), viewBox 48×48.
 * Variante "line" : icône seule sur fond transparent.
 * Variante "tile" : icône sur tuile arrondie douce (#EAEEF8).
 * Source : public/icons/{name}-{variant}.svg
 */

export type IconName =
  /* ── Espace membre – navigation ── */
  | "accueil" | "messagerie" | "mail" | "agenda" | "streaming"
  | "priere-bible" | "arc-ai" | "contacts" | "presences" | "activites"
  | "notes-bibliques" | "doleances" | "dons-paiements" | "gestion-utilisateurs"
  | "profil" | "parametres" | "recherche" | "notification" | "deconnexion" | "retour"
  /* ── Vitrine ── */
  | "sermons-replay" | "rejoindre-famille" | "la-parole" | "amour" | "lieu-de-culte"
  | "decouvrir" | "mediatheque" | "notre-histoire" | "notre-equipe" | "temoignage"
  | "votre-impact" | "nous-trouver" | "contact"
  /* ── Ministères / fonctions ── */
  | "chorale" | "communication" | "media" | "finance" | "femmes" | "jeunesse"
  | "ecodim" | "sanitaire" | "hospitalite" | "pasteurs" | "suivi-ames" | "support";

export type IconVariant = "line" | "tile";

export interface IconProps {
  name: IconName;
  variant?: IconVariant;
  size?: number;
  className?: string;
  style?: React.CSSProperties;
  /** Texte alternatif — laisser vide si icône décorative */
  alt?: string;
}

export default function Icon({
  name,
  variant = "line",
  size = 48,
  className,
  style,
  alt = "",
}: IconProps) {
  // eslint-disable-next-line @next/next/no-img-element
  return (
    <img
      src={`/icons/${name}-${variant}.svg`}
      alt={alt}
      width={size}
      height={size}
      className={className}
      style={style}
      draggable={false}
    />
  );
}
