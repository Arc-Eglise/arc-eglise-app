# ARC_EGLISE_GLOBAL_AUDIT.md — Synthèse Globale
> Audit complet du projet Next.js 14 "ARC Église"
> Audit du 2026-06-23 · Lecture seule

---

## Vue d'ensemble du projet

Le site ARC Église est une application Next.js 14 bien architecturée avec :
- Un site vitrine public refactorisé selon la maquette "Elegance"
- Un espace membres complet et fonctionnel (14 sections)
- Une authentification Supabase multi-rôles (admin/pasteur/membre/visiteur)
- Un assistant IA Lunziko avec streaming SSE
- 15+ endpoints API REST

La refactorisation "Elegance" a apporté un design premium cohérent (fond crème, or, Manrope/Cormorant). Cependant, plusieurs régressions et lacunes fonctionnelles méritent une correction prioritaire.

---

## Scores par catégorie

| Catégorie | Score | Tendance |
|-----------|-------|---------|
| Fonctionnel | 6.5/10 | ⚠️ Don non connecté, email absent, page MDP manquante |
| UI/Design | 8/10 | ✅ Design premium cohérent, quelques placeholders |
| Régressions | 5/10 | ❌ Plusieurs régressions critiques |
| Performance | 6/10 | ⚠️ Images non optimisées, use client inutiles, CSS dupliqué |
| SEO | 5.5/10 | ⚠️ Pas d'OG image, sitemap, robots, schema.org |
| Accessibilité | 4.5/10 | ❌ Labels non liés, outline:none, contraste or, aria-hidden |
| Responsive | 7/10 | ✅ Fonctionnel, mais incohérence breakpoints |
| **Global** | **6/10** | |

---

## Top 5 — Problèmes CRITIQUES à corriger en priorité

### CRITIQUE-1 — DonSection : bouton "Donner" non fonctionnel
**Fichier :** `src/components/home/DonSection.tsx` — ligne 187

Le bouton principal du formulaire de don n'a aucun gestionnaire d'événement. Il n'appelle aucune API, ne redirige nulle part, ne traite aucun paiement. La section donation entière est décorative. L'input email (ligne 184) n'est pas contrôlé.

**Correction :** Intégrer Stripe, TWINT API, ou une redirection vers un lien de paiement externe. À minima, connecter à un formulaire POST qui enregistre l'intention de don.

---

### CRITIQUE-2 — Page `/nouveau-mot-de-passe` manquante
**Fichier :** `src/app/mot-de-passe-oublie/page.tsx` — ligne 20

```typescript
redirectTo: `${location.origin}/auth/callback?next=/nouveau-mot-de-passe`
```

La route `/nouveau-mot-de-passe` n'existe pas dans l'arborescence. Un utilisateur qui clique sur le lien de réinitialisation dans son email atterrit sur une page 404. Le flux de récupération de mot de passe est **cassé**.

**Correction :** Créer `src/app/nouveau-mot-de-passe/page.tsx` avec `supabase.auth.updateUser({ password: newPassword })`.

---

### CRITIQUE-3 — EventsSection : une seule événement affiché (`.limit(1)`)
**Fichier :** `src/components/home/EventsSection.tsx` — ligne 20

L'ancienne interface affichait 3 événements. Avec `.limit(1)`, seul le prochain événement est visible. Si l'église a 3 événements à venir, seul le premier sera montré aux visiteurs.

**Correction :** Changer `.limit(1)` en `.limit(3)` et afficher une liste des 2 événements suivants sous les cultes ou dans une grille.

---

### CRITIQUE-4 — ContactSection : aucun email de notification
**Fichier :** `src/app/api/contact/route.ts` — lignes 27-38

Le formulaire de contact enregistre les messages en base de données Supabase mais **n'envoie aucun email** à l'équipe de l'église. Les responsables doivent consulter manuellement la table `contact_messages`. Les messages peuvent rester sans réponse pendant des jours.

**Correction :** Intégrer Resend (prévu dans la feuille de route) ou Microsoft 365 pour envoyer un email de notification à `contact@arc-eglise.ch` à chaque nouveau message.

---

### CRITIQUE-5 — `outline: none` sur tous les inputs sans focus visible
**Fichiers :** ContactSection, DonSection, Connexion, Inscription, Profil, Prière

Chaque formulaire supprime le focus ring (`outline: none`) sans le remplacer par un indicateur alternatif. Les utilisateurs naviguant au clavier (personnes handicapées, power users) ne peuvent pas voir quel champ est actif. Violation WCAG 2.4.7.

**Correction :** Remplacer `outline: none` par `outline: none; focus-visible:ring-2 focus-visible:ring-arc-gold` ou ajouter un border-color sur `:focus-visible`.

---

## Top 5 — Problèmes MAJEURS

### MAJEUR-1 — Font "Outfit" non chargée dans layout.tsx
**Fichier :** `src/app/globals.css` — lignes 172, 276, 287, 313, 314, etc.

L'espace membres utilise `font-family: 'Outfit'` dans ~30+ déclarations CSS, mais Outfit n'est pas importé dans `layout.tsx`. La font retombe sur `system-ui` sans que cela soit visible immédiatement, mais le design de l'espace membres prévu avec Outfit ne correspond pas à ce qui est rendu.

**Correction :** Soit ajouter `Outfit` dans `layout.tsx` (nouveau import next/font/google), soit remplacer `'Outfit'` par `var(--font-manrope)` dans globals.css.

---

### MAJEUR-2 — Labels sans `htmlFor`/`id` sur tous les formulaires
Tous les formulaires du site vitrine (`ContactSection`, `DonSection`, `Inscription`, `Connexion`) ont des `<label>` sans `htmlFor` correspondant à un `id` d'input. Les lecteurs d'écran ne peuvent pas associer le label à l'input.

---

### MAJEUR-3 — Liens légaux (Footer) pointent vers `#contact`
**Fichier :** `src/components/layout/Footer.tsx` — lignes 140-143

"Mentions légales", "Confidentialité" et "nLPD" pointent vers `#contact`. La Suisse exige une politique de confidentialité accessible (nLPD depuis septembre 2023). L'absence de pages dédiées est un risque légal.

---

### MAJEUR-4 — `maximumScale: 1` bloque le zoom mobile
**Fichier :** `src/app/layout.tsx` — ligne 53

`maximumScale: 1` empêche le zoom utilisateur sur mobile. Violation WCAG 1.4.4 "Resize text" — texte doit pouvoir être agrandi à 200% sans perte de contenu.

---

### MAJEUR-5 — Suppression du countdown banner "PROCHAIN CULTE DIRECT"
**Fichier :** `src/components/layout/Header.tsx`

L'indicateur urgent rouge avec countdown du prochain culte a été remplacé par un marquee dilué. L'information cruciale (heure du prochain culte) est maintenant noyée dans 5 autres messages du marquee, et le marquee est `aria-hidden="true"` donc invisible aux lecteurs d'écran.

---

## Recommandations générales

### Court terme (1–2 semaines)

1. **Corriger la page `/nouveau-mot-de-passe`** — BLOQUANT pour les utilisateurs existants
2. **Changer `.limit(1)` en `.limit(3)` dans EventsSection** — 1 ligne, impact immédiat
3. **Corriger le WhatsApp** — remplacer `41000000000` par le vrai numéro
4. **Supprimer `maximumScale: 1`** — risque légal accessibilité
5. **Ajouter Outfit dans layout.tsx** ou migrer espace membres vers Manrope

### Moyen terme (2–4 semaines)

6. **Intégrer Resend pour les notifications de contact** — fonctionnalité Phase 1.7 déjà prévue
7. **Connecter le formulaire de don** — intégration TWINT/Stripe ou au minimum un lien externe
8. **Corriger les labels des formulaires** — ajouter `htmlFor` + `id` sur tous les inputs
9. **Créer les pages légales** (Mentions légales, Confidentialité) — conformité nLPD
10. **Ajouter `next/image`** pour les thumbnails YouTube et avatars membres

### Long terme (1–2 mois)

11. **Centraliser `.arc-two` et `.arc-cards4` dans globals.css** — éviter la duplication x8
12. **Convertir HeroSection et FeaturesStrip en Server Components** — réduire le JS bundle
13. **Ajouter sitemap.ts et robots.ts** — Next.js les génère automatiquement
14. **Ajouter Schema.org** (Organization, Event, LocalBusiness) — visibilité Google
15. **Ajouter une image Open Graph** (1200×630px) — partage réseaux sociaux
16. **Remplacer les boutons nav par `<a href="#section">`** — meilleure indexabilité
17. **Restaurer ou remplacer le countdown banner** — indicateur culte plus visible
18. **Ajouter `aria-live="polite"`** sur la zone de chat — accessibilité assistant IA
19. **Ajouter pagination** sur la liste des prières (`/espace-membres/priere`)
20. **Ajouter `will-change: transform`** sur `.animate-float` — perf mobile

---

## Inventaire final des fichiers audités

| Fichier | Lu | Problèmes |
|---------|-----|----------|
| `src/app/page.tsx` | ✅ | 0 |
| `src/app/layout.tsx` | ✅ | 2 (maximumScale, Outfit manquant) |
| `src/app/globals.css` | ✅ | 1 (Outfit x30, arc-two dupliqué) |
| `src/components/layout/Header.tsx` | ✅ | 2 (boutons vs links nav, countdown absent) |
| `src/components/layout/Footer.tsx` | ✅ | 3 (liens légaux, WhatsApp, community links) |
| `src/components/home/AnnouncementBar.tsx` | ✅ | 1 (aria-hidden) |
| `src/components/home/HeroSection.tsx` | ✅ | 3 (use client inutile, live badge hardcodé, cards hidden mobile) |
| `src/components/home/FeaturesStrip.tsx` | ✅ | 1 (use client inutile) |
| `src/components/home/AboutSection.tsx` | ✅ | 1 (image placeholder) |
| `src/components/home/SermonsSection.tsx` | ✅ | 0 |
| `src/components/home/SermonsClient.tsx` | ✅ | 2 (img sans next/image, cas rest.length=1) |
| `src/components/home/EventsSection.tsx` | ✅ | 1 (limit(1)) |
| `src/components/home/TeamSection.tsx` | ✅ | 2 (img sans next/image, cards non cliquables) |
| `src/components/home/DonSection.tsx` | ✅ | 3 (bouton mort, email non contrôlé, pas d'API) |
| `src/components/home/CopilotAssistant.tsx` | ✅ | 1 (aria-live absent) |
| `src/components/home/ContactSection.tsx` | ✅ | 3 (labels, pas d'email notification, WhatsApp) |
| `src/app/api/contact/route.ts` | ✅ | 1 (pas d'email notification) |
| `src/app/api/lunziko/chat/route.ts` | ✅ | 0 |
| `src/app/inscription/page.tsx` | ✅ | 2 (CGU span sans lien, pas htmlFor) |
| `src/app/connexion/page.tsx` | ✅ | 1 (pas htmlFor) |
| `src/app/mot-de-passe-oublie/page.tsx` | ✅ | 1 (page MDP manquante) |
| `src/app/espace-membres/page.tsx` | ✅ | 0 |
| `src/app/espace-membres/layout.tsx` | ✅ | 0 |
| `src/app/espace-membres/profil/page.tsx` | ✅ | 2 (pas feedback succès, cast unsafe) |
| `src/app/espace-membres/priere/page.tsx` | ✅ | 1 (pas de pagination) |
| `src/middleware.ts` | ✅ | 0 |
| `src/hooks/useUser.ts` | ✅ | 0 |
| `src/lib/supabase/types.ts` | ✅ | 0 |
| `src/app/manifest.ts` | ✅ | 1 (icône ico seulement, pas PNG) |
