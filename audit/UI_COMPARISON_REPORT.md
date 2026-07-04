# UI_COMPARISON_REPORT.md — ARC Église
> Comparaison ancienne interface (pré-refactorisation) vs nouvelle interface "Elegance"
> Audit du 2026-06-23

---

## Résumé des changements de design

| Token / Element | Ancienne interface | Nouvelle interface "Elegance" |
|----------------|-------------------|-------------------------------|
| Fond global | Blanc (`#ffffff`) | Crème (`#FAF7F0`) |
| Police principale | Outfit | Manrope |
| Police serif | Cormorant Garamond | Cormorant Garamond (inchangé) |
| Couleur accent | Or (variante) | `#C9A227` (goldSoft: `#E6C763`) |
| Couleur navy | `#1e2464` | `#1e2464` (inchangé) |
| Header bg scroll | Blanc avec blur | Crème `rgba(250,247,240,.92)` avec blur |
| Countdown banner | Présent (rouge "PROCHAIN CULTE DIRECT") | Remplacé par AnnouncementBar marquee |

---

## 1. AnnouncementBar (NOUVEAU)

| Aspect | Ancienne | Nouvelle |
|--------|---------|---------|
| Existait | NON | OUI — marquee animé |
| Fond | N/A | `#141738` (navy profond) |
| Contenu | N/A | 6 messages rotatifs statiques |
| Interactivité | N/A | Pause au hover |
| Accessibilité | N/A | `aria-hidden="true"` — non lue par SR |

**Impact utilisateur :** Le marquee remplace le countdown statique rouge. L'information "prochain culte" est présente mais moins urgente visuellement.

---

## 2. Header

| Aspect | Ancienne | Nouvelle |
|--------|---------|---------|
| Countdown banner rouge | Présent (state `bannerVisible`) | **SUPPRIMÉ** |
| Fond | Blanc avec blur | Crème `rgba(250,247,240,.92)` avec blur |
| Logo | ARC icon + texte | ARC icon (navy) + "Ambassade du Royaume" + "La Chaux-de-Fonds" |
| Nav links | 7 liens identiques | 7 liens identiques |
| Utilisateur connecté | Bouton "Mon espace" | Badge rôle + menu dropdown |
| Hamburger mobile | Présent | Présent (animé 3-barres) |
| Menu mobile | Présent | Présent (fond crème) |
| CTA "18 en ligne" | Absent/différent | Présent (hardcodé) |

**Régression identifiée :** Le countdown rouge "PROCHAIN CULTE DIRECT" est absent. C'était un indicateur visuel fort. Il est partiellement compensé par l'AnnouncementBar.

---

## 3. HeroSection

| Aspect | Ancienne | Nouvelle |
|--------|---------|---------|
| Layout | Grid 2 colonnes | Grid `1.05fr .95fr` |
| Titre principal | Titre similaire | "Construisons des générations qui transforment" (italic gold) |
| Stats | Présentes | 4 stats hardcodées (250/32/6/600+) |
| Badges flottants | Présents | Présents (`hidden lg:block`) — invisibles mobile |
| Photo réelle | Variable | Placeholder dark card avec quadrillage |
| CTA 1 | "Voir sermons" | "Voir le dernier sermon" → scrollTo("sermons") |
| CTA 2 | "Rejoindre" | "Rejoindre la famille →" → /inscription |
| Scroll indicator | Variable | Présent `hidden lg:flex` |
| "Live" badge | Variable | Badge rouge animé hardcodé "EN DIRECT · 247 spectateurs" |

---

## 4. FeaturesStrip

| Aspect | Ancienne | Nouvelle |
|--------|---------|---------|
| Nombre de cartes | 4 (supposé) | 4 identiques |
| Fond cartes | Variable | Blanc sur fond crème |
| Hover | Variable | `translateY(-3px)` + shadow |
| Liens | Ancres | Ancres identiques (#sermons, #contact, #evenements, #dons) |

---

## 5. AboutSection

| Aspect | Ancienne | Nouvelle |
|--------|---------|---------|
| Layout | 2 colonnes | `.9fr 1.1fr` — visual left, text right |
| Image | Variable | Placeholder gradient navy |
| Badge 600+ | Variable | Badge gold positionné `absolute` |
| Valeurs grid | Variable | 4 valeurs en grid 2×2 |
| CTA "Rencontrer l'équipe" | Présent | Présent → #equipe |
| CTA "Nous visiter" | Présent | Présent → #contact |
| Citation | Variable | Blockquote avec bordure gold |

---

## 6. SermonsSection

| Aspect | Ancienne | Nouvelle |
|--------|---------|---------|
| Fond section | Blanc ou neutre | `#141738` (navy profond) — **changement majeur** |
| Layout | `1.4fr + 1fr` (colonnes) | `1.4fr 1fr 1fr` (grid 3 colonnes) |
| Nombre sermons chargés | Variable | `.limit(10)` depuis DB |
| Sermon featured | 1 | 1 (avec thumbnail YouTube) |
| Sermons secondaires | 1-2 | 2 (rest.slice(0, 2)) |
| Filtres | Présents/absents | 5 filtres : Tout/Série/Évangélisation/Prière/Famille |
| Images YouTube | `<img>` standards | `<img>` standards (pas next/image) |
| CTA YouTube | Présent | Présent — lien externe |

---

## 7. EventsSection

| Aspect | Ancienne | Nouvelle |
|--------|---------|---------|
| Événements affichés | 3 (limite supposée) | **1 seul** (`.limit(1)`) — RÉGRESSION CRITIQUE |
| Layout | Grille ou liste | Grid `1.15fr .85fr` — featured + cultes |
| Cultes horaires | Variables | 3 créneaux statiques hardcodés |
| Bouton réservation | Vers /inscription ou modal | → `#contact` (ancre simple) |

---

## 8. TeamSection

| Aspect | Ancienne | Nouvelle |
|--------|---------|---------|
| Membres affichés | Variable | `.limit(8)` |
| Grid | Variable | `repeat(4, 1fr)` responsive 4→2→1 |
| Hover | onMouseEnter/Leave JS | CSS class `.arc-team-card` — plus propre |
| Avatars | Variables | Conditionnel `if m.avatar_url` |
| Photos placeholder | Variable | Gradient navy avec quadrillage |

---

## 9. DonSection

| Aspect | Ancienne | Nouvelle |
|--------|---------|---------|
| Montants prédéfinis | Variables | 10/25/50/100 CHF |
| Fréquence | Variable | Unique / Mensuel toggle |
| Modes paiement | Variables | TWINT / Carte / PostFinance |
| Paiement réel | Variable | **NON connecté** — UI décorative |
| Barres de progression | Absentes | Présentes (hardcodées 78%/62%/45%) |

---

## 10. CopilotAssistant (NOUVEAU)

| Aspect | Ancienne | Nouvelle |
|--------|---------|---------|
| Existait | Peut-être basique | Présent avec streaming SSE |
| Fond section | Variable | `#141738` |
| Quick suggestions | Absentes | 4 suggestions rapides |
| Streaming | Absent | SSE avec cursor animé |

---

## 11. ContactSection

| Aspect | Ancienne | Nouvelle |
|--------|---------|---------|
| Formulaire | Présent | Présent (5 champs + select sujet) |
| Endpoint | Variable | `/api/contact` → Supabase insert |
| Email de notification | Envoyé | **NON envoyé** — uniquement DB insert |
| Carte map | Variable | Placeholder graphique → lien Google Maps |
| Réseaux sociaux | Présents | Présents (Facebook/Instagram/YouTube/WhatsApp) |

---

## 12. Footer

| Aspect | Ancienne | Nouvelle |
|--------|---------|---------|
| Colonnes | Variable | 4 colonnes : Brand / Nav / Communauté / Contact |
| Logo footer | Variable | Badge gold `#C9A227` |
| Liens légaux | Variables | "Mentions légales", "Confidentialité", "nLPD" → tous vers `#contact` |

**PROBLÈME :** Les liens légaux (Mentions légales, Confidentialité, nLPD) pointent tous vers `#contact` au lieu de pages dédiées.

---

## Parcours utilisateurs conservés

| Parcours | Statut |
|---------|--------|
| Découvrir l'église | ✅ Conservé |
| Voir les sermons | ✅ Conservé |
| Voir les événements | ⚠️ Dégradé (1 au lieu de 3) |
| S'inscrire comme membre | ✅ Conservé |
| Se connecter | ✅ Conservé |
| Faire un don | ⚠️ Dégradé (UI uniquement) |
| Contacter l'église | ✅ Conservé |
| Accéder espace membres | ✅ Conservé |
