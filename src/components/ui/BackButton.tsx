"use client";

import Link from "next/link";

/**
 * Bouton de retour réutilisable — charte ARC (navy/doré).
 * Remplace tous les anciens liens texte « ← … » de l'espace membre.
 *
 * - `href` → rendu en <Link> (navigation vers une page).
 * - `onClick` → rendu en <button> (ex. retour d'un panneau via setPanel).
 * - Accessible : cible tactile ≥44px sur mobile, focus clavier visible (.arc-back-btn),
 *   flèche + libellé, états hover/pressed.
 *
 * Le style vit dans `globals.css` (.arc-back-btn) pour un rendu identique
 * partout, que la page soit en Tailwind ou en styles inline.
 */
function Arrow() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor"
      strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M15 18l-6-6 6-6" />
    </svg>
  );
}

export default function BackButton({
  href,
  onClick,
  label = "Retour",
  className = "",
}: {
  href?: string;
  onClick?: () => void;
  label?: string;
  className?: string;
}) {
  const cls = `arc-back-btn ${className}`.trim();

  if (href) {
    return (
      <Link href={href} className={cls} aria-label={`Retour : ${label}`}>
        <Arrow />
        <span>{label}</span>
      </Link>
    );
  }

  return (
    <button type="button" onClick={onClick} className={cls} aria-label={`Retour : ${label}`}>
      <Arrow />
      <span>{label}</span>
    </button>
  );
}
