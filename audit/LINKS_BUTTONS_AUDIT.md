# LINKS_BUTTONS_AUDIT.md — ARC Église
> Inventaire exhaustif de tous les liens, boutons et ancres
> Audit du 2026-06-23

---

## Légende
- ✅ Lien fonctionnel et cible valide
- ⚠️ Lien potentiellement problématique
- ❌ Lien cassé ou cible manquante

---

## 1. AnnouncementBar (`src/components/home/AnnouncementBar.tsx`)

Aucun lien ou bouton. Texte seulement.

---

## 2. Header (`src/components/layout/Header.tsx`)

### Navigation principale (desktop + mobile)
| Label | href | Type | Statut |
|-------|------|------|--------|
| Accueil | `#accueil` | Bouton scrollTo | ✅ — `id="accueil"` dans HeroSection |
| À propos | `#apropos` | Bouton scrollTo | ✅ — `id="apropos"` dans AboutSection |
| Sermons | `#sermons` | Bouton scrollTo | ✅ — `id="sermons"` dans SermonsSection |
| Événements | `#evenements` | Bouton scrollTo | ✅ — `id="evenements"` dans EventsSection |
| Équipe | `#equipe` | Bouton scrollTo | ✅ — `id="equipe"` dans TeamSection |
| Donner | `#dons` | Bouton scrollTo | ✅ — `id="dons"` dans DonSection |
| Contact | `#contact` | Bouton scrollTo | ✅ — `id="contact"` dans ContactSection |

### CTAs droite (non authentifié)
| Label | href | Type | Statut |
|-------|------|------|--------|
| Se connecter | `/connexion` | `<Link>` | ✅ |
| Rejoindre → | `/inscription` | `<Link>` | ✅ |

### CTAs droite (authentifié)
| Label | href | Type | Statut |
|-------|------|------|--------|
| Donner | `#dons` | Bouton scrollTo | ✅ |
| ＋ Mon espace (nav) | `/espace-membres` | `<Link>` | ✅ |
| 🏠 Mon espace membres (menu) | `/espace-membres` | `<Link>` | ✅ |
| ⚙️ Administration (si admin) | `/admin` | `<Link>` | ✅ |
| 🚪 Se déconnecter | N/A | Bouton signOut | ✅ |

### Mobile menu uniquement
| Label | href | Type | Statut |
|-------|------|------|--------|
| 🏠 Mon espace membres | `/espace-membres` | `<Link>` | ✅ |
| Déconnexion | N/A | Bouton signOut | ✅ |
| Se connecter | `/connexion` | `<Link>` | ✅ |
| Rejoindre → | `/inscription` | `<Link>` | ✅ |

**Note :** Le logo clique sur `scrollTo("accueil")` — pas de `href="/"`. Si l'utilisateur est sur une autre page et clique le logo, rien ne se passe (l'élément `#accueil` n'existe pas sur `/connexion`).

---

## 3. HeroSection (`src/components/home/HeroSection.tsx`)

| Label | href/action | Type | Statut |
|-------|-------------|------|--------|
| "Voir le dernier sermon" | scrollTo("sermons") | Bouton | ✅ |
| "Rejoindre la famille →" | `/inscription` | `<Link>` | ✅ |
| "🎟 Réserver ma place" (card event) | scrollTo("evenements") | Bouton | ✅ |
| Scroll indicator "Découvrir" | scrollTo("features") | Div clickable | ✅ — `id="features"` existe |

---

## 4. FeaturesStrip (`src/components/home/FeaturesStrip.tsx`)

| Label | href | Type | Statut |
|-------|------|------|--------|
| "Voir les sermons →" | `#sermons` | `<a>` | ✅ |
| "Je veux rejoindre →" | `#contact` | `<a>` | ✅ |
| "Voir l'agenda →" | `#evenements` | `<a>` | ✅ |
| "Faire un don →" | `#dons` | `<a>` | ✅ |

---

## 5. AboutSection (`src/components/home/AboutSection.tsx`)

| Label | href | Type | Statut |
|-------|------|------|--------|
| "Rencontrer l'équipe →" | `#equipe` | `<a>` | ✅ |
| "Nous visiter" | `#contact` | `<a>` | ✅ |

---

## 6. SermonsSection (`src/components/home/SermonsSection.tsx` + `SermonsClient.tsx`)

| Label | href | Type | Statut |
|-------|------|------|--------|
| "▶ Voir sur YouTube" | `https://www.youtube.com/@ARCEglise` | `<a target="_blank">` | ✅ |
| Thumbnail featured (lien vidéo) | `https://youtu.be/{youtube_id}` | `<a target="_blank">` | ✅ si youtube_id présent |
| "▶ Regarder" | `https://youtu.be/{youtube_id}` | `<a target="_blank">` | ✅ si youtube_id présent |
| Thumbnail secondaire (lien vidéo) | `https://youtu.be/{youtube_id}` | `<a target="_blank">` | ✅ si youtube_id présent |
| Filtres (5 boutons) | N/A | Bouton state | ✅ |

**Note :** Si `youtube_id` est null, le `<a>` featured n'a pas de `href` (`href={undefined}`) — cela rend le lien non-cliquable mais toujours présent dans le DOM. Pas d'erreur visible mais mauvaise pratique.

---

## 7. EventsSection (`src/components/home/EventsSection.tsx`)

| Label | href | Type | Statut |
|-------|------|------|--------|
| "🎟 Réserver ma place" (événement DB) | `#contact` | `<a>` | ⚠️ Devrait être une vraie page d'inscription event |
| "🎟 Réserver ma place" (placeholder) | `#contact` | `<a>` | ⚠️ Idem |
| "Voir tous les horaires →" | `#contact` | `<a>` | ⚠️ Devrait pointer vers une page agenda |

---

## 8. TeamSection (`src/components/home/TeamSection.tsx`)

Aucun lien sur les cartes membres. Les cards ont `cursor: pointer` et `class="arc-team-card"` (hover) mais aucun `onClick` ni `href`. Cela suggère qu'un modal de détail était prévu mais non implémenté.

---

## 9. DonSection (`src/components/home/DonSection.tsx`)

| Label | href/action | Type | Statut |
|-------|-------------|------|--------|
| Boutons montants (10/25/50/100) | state local | Bouton | ✅ UI |
| Input custom montant | state local | Input | ✅ UI |
| Toggle unique/mensuel | state local | Bouton | ✅ UI |
| TWINT/Carte/PostFinance | state local | Bouton | ✅ UI |
| "💛 Donner CHF X" | **AUCUNE ACTION** | Bouton décoratif | ❌ |

---

## 10. CopilotAssistant (`src/components/home/CopilotAssistant.tsx`)

| Label | href/action | Type | Statut |
|-------|-------------|------|--------|
| "Horaires des cultes ?" | send(q) | Bouton quick reply | ✅ |
| "Comment rejoindre ARC ?" | send(q) | Bouton quick reply | ✅ |
| "Prochains événements ?" | send(q) | Bouton quick reply | ✅ |
| "Rejoindre un groupe ?" | send(q) | Bouton quick reply | ✅ |
| Bouton "Envoyer" | send() | Bouton | ✅ |

---

## 11. ContactSection (`src/components/home/ContactSection.tsx`)

| Label | href/action | Type | Statut |
|-------|-------------|------|--------|
| Lien Google Maps | `https://maps.google.com/?q=...` | `<a target="_blank">` | ✅ |
| Facebook | `https://www.facebook.com/ARCEgliseCDF` | `<a target="_blank">` | ✅ |
| Instagram | `https://www.instagram.com/arc.eglise` | `<a target="_blank">` | ✅ |
| YouTube | `https://www.youtube.com/@ARCEglise` | `<a target="_blank">` | ✅ |
| WhatsApp | `https://wa.me/41000000000` | `<a target="_blank">` | ❌ Numéro fictif |
| Bouton "Envoyer le message ✉️" | handleSubmit → `/api/contact` | `<button type="submit">` | ✅ |

---

## 12. Footer (`src/components/layout/Footer.tsx`)

| Label | href | Type | Statut |
|-------|------|------|--------|
| Facebook | `https://www.facebook.com/ARCEgliseCDF` | `<a target="_blank">` | ✅ |
| Instagram | `https://www.instagram.com/arc.eglise` | `<a target="_blank">` | ✅ |
| YouTube | `https://www.youtube.com/@ARCEglise` | `<a target="_blank">` | ✅ |
| WhatsApp | `https://wa.me/41000000000` | `<a target="_blank">` | ❌ Numéro fictif |
| Accueil | `#accueil` | `<a>` | ✅ |
| À propos | `#apropos` | `<a>` | ✅ |
| Sermons | `#sermons` | `<a>` | ✅ |
| Événements | `#evenements` | `<a>` | ✅ |
| Équipe | `#equipe` | `<a>` | ✅ |
| Donner | `#dons` | `<a>` | ✅ |
| Contact | `#contact` | `<a>` | ✅ |
| Espace Membres | `/espace-membres` | `<a>` | ✅ |
| Groupes | `/espace-membres` | `<a>` | ⚠️ Tous → dashboard, pas section groupes |
| Prière | `/espace-membres` | `<a>` | ⚠️ Devrait → `/espace-membres/priere` |
| Bible | `/espace-membres` | `<a>` | ⚠️ Devrait → `/espace-membres/bible` |
| Événements privés | `/espace-membres` | `<a>` | ⚠️ Devrait → `/espace-membres/agenda` |
| Mentions légales | `#contact` | `<a>` | ❌ Pas de page dédiée |
| Confidentialité | `#contact` | `<a>` | ❌ Pas de page dédiée |
| nLPD | `#contact` | `<a>` | ❌ Pas de page dédiée |

---

## 13. Pages d'authentification

### Inscription (`src/app/inscription/page.tsx`)
| Label | href | Type | Statut |
|-------|------|------|--------|
| Logo ARC | `/` | `<Link>` | ✅ |
| "Suivant →" (step 0, 1) | nextStep() | Bouton submit | ✅ |
| "← Retour" (step 1, 2) | setStep() | Bouton | ✅ |
| "🎉 Créer mon compte" | handleSubmit → Supabase | Bouton submit | ✅ |
| "Se connecter →" (succès) | `/connexion` | `<Link>` | ✅ |
| "← Retour à l'accueil" | `/` | `<Link>` | ✅ |
| "Se connecter" (bas page) | `/connexion` | `<Link>` | ✅ |
| "conditions d'utilisation" | N/A | `<span>` | ❌ Pas de lien — juste texte cliquable sans href |
| "politique de confidentialité" | N/A | `<span>` | ❌ Idem |

### Connexion (`src/app/connexion/page.tsx`)
| Label | href | Type | Statut |
|-------|------|------|--------|
| Logo ARC | `/` | `<Link>` | ✅ |
| "Continuer avec Google" | handleGoogle() → OAuth | Bouton | ✅ |
| "Se connecter →" | handleLogin() | Bouton submit | ✅ |
| "Mot de passe oublié ?" | `/mot-de-passe-oublie` | `<Link>` | ✅ |
| "Rejoindre l'ARC" | `/inscription` | `<Link>` | ✅ |

### Mot de passe oublié
| Label | href | Type | Statut |
|-------|------|------|--------|
| Logo ARC | `/` | `<a>` (Link) | ✅ |
| "Envoyer le lien 📧" | handleSubmit → Supabase | Bouton submit | ✅ |
| "← Retour à la connexion" | `/connexion` | `<Link>` | ✅ |

**PROBLÈME :** `resetPasswordForEmail` redirige vers `/auth/callback?next=/nouveau-mot-de-passe` mais `/nouveau-mot-de-passe` n'existe pas (❌).

---

## 14. Synthèse des problèmes critiques

| Type | Nombre | Détail |
|------|--------|--------|
| Liens cassés (404) | 1 | `/nouveau-mot-de-passe` |
| Numéros fictifs | 2 | WhatsApp `41000000000` (Footer + Contact) |
| Pages légales manquantes | 3 | Mentions légales / Confidentialité / nLPD |
| Bouton sans action | 1 | DonSection "Donner CHF X" |
| `<span>` à la place de lien | 2 | CGU + politique confidentialité dans inscription |
| Liens COMMUNITY footer trop génériques | 4 | Tous vers `/espace-membres` |
| `href={undefined}` | Variable | YouTube thumbnails si `youtube_id` null |
