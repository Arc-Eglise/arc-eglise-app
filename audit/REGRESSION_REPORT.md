# REGRESSION_REPORT.md — ARC Église
> Rapport de régressions — le plus important de l'audit
> Audit du 2026-06-23 · Lecture seule

---

## Échelle de sévérité
- **CRITIQUE** — Fonctionnalité cassée / perte de donnée / UX bloquante
- **MAJEUR** — Perte fonctionnelle significative visible par l'utilisateur
- **MODÉRÉ** — Dégradation UX non bloquante
- **MINEUR** — Détail cosmétique ou texte

---

## R-01 — EventsSection : `.limit(1)` au lieu de `.limit(3)`
**Sévérité : CRITIQUE**

**Fichier :** `src/components/home/EventsSection.tsx` — ligne 20

```typescript
.limit(1);  // ← RÉGRESSION : ne charge qu'1 événement
```

**Impact :** L'ancienne interface affichait 3 événements à venir. Maintenant seul le prochain événement est affiché. Un utilisateur qui visite le site ne voit qu'un seul événement dans la colonne "featured". Les 2 autres événements potentiels disparaissent complètement. La structure de la page ne prévoit pas non plus de liste secondaire d'événements — il n'y a que le "featured" et les 3 cultes statiques.

**Correction suggérée :** Changer `.limit(1)` en `.limit(3)` et afficher les événements 2 et 3 dans une liste sous les cultes.

---

## R-02 — Header : suppression du countdown banner "PROCHAIN CULTE DIRECT"
**Sévérité : MAJEUR**

**Fichier :** `src/components/layout/Header.tsx` — aucune mention de banner

**Impact :** L'ancienne interface affichait une bannière rouge en haut du Header avec un countdown "PROCHAIN CULTE DIRECT" géré par un state `bannerVisible`. Ce signal visuel urgent a disparu. L'AnnouncementBar remplace partiellement cette fonctionnalité mais :
1. L'AnnouncementBar est `aria-hidden="true"` — invisible aux lecteurs d'écran
2. Le marquee défile (pas de texte fixe et urgent)
3. Le fond est `#141738` navy au lieu du rouge urgent — moins d'urgence visuelle
4. Le texte "PROCHAIN CULTE DIRECT : Dim 09h30 →" est maintenant dans le flux du marquee, dilué parmi 5 autres messages

**Note :** Le state `bannerVisible` avec possibilité de fermeture est perdu.

---

## R-03 — SermonsClient : layout grille changé
**Sévérité : MODÉRÉ**

**Fichier :** `src/components/home/SermonsClient.tsx` — ligne 49

```typescript
// Nouvelle implémentation :
<div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr 1fr", gap: 20 }}>
// Ancienne implémentation (supposée) :
// gridTemplateColumns: "1.4fr 1fr" — 2 colonnes
```

**Impact :** Le layout est passé de 2 colonnes (featured + 1 secondaire) à 3 colonnes (featured + 2 secondaires). Ce n'est pas nécessairement une régression négative, mais le comportement responsive a changé. À 900px il passe à 2 colonnes avec le featured en pleine largeur (`grid-column: 1 / -1`), ce qui est correct. La colonne 3 (`1fr`) était absente dans l'ancienne version.

**Note :** `rest.slice(0, 2)` est correct pour afficher 2 cartes secondaires. Cependant `rest.length === 0` affiche les placeholders seulement si AUCUN sermon secondaire n'existe — si `rest.length === 1`, la 3e colonne sera vide (pas de placeholder). Cela crée un gap visuel dans la grille.

---

## R-04 — HeroSection : floating cards masquées sur mobile
**Sévérité : MODÉRÉ**

**Fichier :** `src/components/home/HeroSection.tsx` — ligne 105

```typescript
<div className="hidden lg:block" style={{ position: "relative", height: 560 }}>
```

**Impact :** La colonne droite de la HeroSection (avec les 3 éléments : dark card principale, floating sermon card, floating event card) est **entièrement masquée** sur mobile et tablette (< 1024px). Sur mobile, seule la colonne gauche (badge + titre + description + stats) est visible. La grille hero bascule en 1 colonne à `max-width: 1024px` grâce à `.arc-hero-grid`, donc le bloc `hidden lg:block` est cohérent, mais :

1. Les stats mobiles (250/32/6/600+) remplacent visuellement la colonne droite, ce qui est acceptable
2. Le scroll indicator est aussi `hidden lg:flex` — invisible mobile
3. Les cards flottantes (informations sermon + événement) sont perdues sur 60-70% du trafic mobile

---

## R-05 — Ancres de navigation : incohérence `#apropos` vs `#propos`
**Sévérité : MAJEUR**

**Header** (`src/components/layout/Header.tsx` — ligne 9) :
```typescript
{ label: "À propos", href: "#apropos" }
```

**Footer** (`src/components/layout/Footer.tsx` — ligne 10) :
```typescript
{ label: "À propos", href: "#apropos" }
```

**AboutSection** (`src/components/home/AboutSection.tsx` — ligne 10) :
```html
<section id="apropos" ...>
```

**Résultat :** L'ancre `#apropos` est **cohérente** entre Header, Footer et la section — PAS de régression ici. Cependant, la section `id="features"` (FeaturesStrip, ligne 36) est référencée dans le scroll indicator de HeroSection (`scrollTo("features")`) mais n'apparaît pas dans la navigation Header. Aucun lien nav ne pointe vers `#features`.

---

## R-06 — HeroSection scroll indicator cible `"features"` absente du nav
**Sévérité : MINEUR**

**Fichier :** `src/components/home/HeroSection.tsx` — ligne 182

```typescript
onClick={() => scrollTo("features")}
```

La section FeaturesStrip a `id="features"` (ligne 36 de FeaturesStrip.tsx). La cible existe, mais elle n'est pas dans le Header nav. Ce n'est pas une régression mais un oubli de cohérence.

---

## R-07 — DonSection : bouton "Donner" sans action réelle
**Sévérité : CRITIQUE**

**Fichier :** `src/components/home/DonSection.tsx` — lignes 186-205

```typescript
<button
  style={{ ... }}
  onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.opacity = ".88")}
  onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.opacity = "1")}
>
  💛 Donner CHF {effAmount || "0"}{freq === "mensuel" ? " / mois" : " maintenant"}
</button>
```

**Impact :** Le bouton "Donner" ne déclenche aucune action : ni `onClick`, ni `onSubmit` de form, ni appel API, ni redirection. C'est un bouton décoratif. L'input email (ligne 184) n'a pas non plus de `name` ou d'état contrôlé. La fonctionnalité de don est **100% non fonctionnelle**.

---

## R-08 — Page `/nouveau-mot-de-passe` manquante
**Sévérité : CRITIQUE**

**Fichier :** `src/app/mot-de-passe-oublie/page.tsx` — ligne 20

```typescript
redirectTo: `${location.origin}/auth/callback?next=/nouveau-mot-de-passe`,
```

La route `/nouveau-mot-de-passe` est référencée comme cible de redirection après reset password, mais elle **n'existe pas** dans l'arborescence du projet. L'utilisateur qui clique sur le lien de réinitialisation sera redirigé vers une page 404.

---

## R-09 — ContactSection : pas d'email de notification
**Sévérité : MAJEUR**

**Fichier :** `src/app/api/contact/route.ts` — lignes 27-38

```typescript
const { error } = await supabase.from("contact_messages").insert({...});
```

Le formulaire de contact enregistre le message en base de données mais **n'envoie aucun email** à l'église. Un administrateur doit consulter manuellement la table `contact_messages` dans Supabase pour voir les messages. Aucun webhook, aucun service email (Resend, Microsoft 365) n'est appelé.

---

## R-10 — AnnouncementBar aria-hidden
**Sévérité : MODÉRÉ**

**Fichier :** `src/components/home/AnnouncementBar.tsx` — ligne 18

```typescript
aria-hidden="true"
```

L'AnnouncementBar remplace en partie l'ancien countdown banner, mais elle est marquée `aria-hidden="true"`, la rendant invisible aux lecteurs d'écran. Les informations importantes (horaires culte, événements) ne sont pas accessibles aux utilisateurs assistés.

---

## R-11 — SermonsClient : cas `rest.length === 1` non géré
**Sévérité : MODÉRÉ**

**Fichier :** `src/components/home/SermonsClient.tsx` — lignes 143-170

Le composant gère :
- `featured` présent + `rest.length >= 2` → 3 articles (correct)
- `featured` présent + `rest.length === 0` → featured + 2 placeholders
- **Manquant :** `featured` présent + `rest.length === 1` → 2 articles + 1 colonne vide dans la grille CSS

La grille est `1.4fr 1fr 1fr` à 3 colonnes. Si seulement 2 articles sont rendus, la 3e colonne est vide — cela crée un trou visuel sur desktop.

---

## R-12 — HeroSection : "EN DIRECT · 247 spectateurs" hardcodé
**Sévérité : MODÉRÉ**

**Fichier :** `src/components/home/HeroSection.tsx` — ligne 131

```typescript
EN DIRECT · 247 spectateurs
```

Ce badge "live" rouge animé est entièrement statique. Il donne l'impression d'un streaming en direct permanent alors que la session YouTube n'est pas forcément active. Potentiellement trompeur pour les visiteurs.

De même dans Header (ligne 111) :
```typescript
18 en ligne
```

Valeur hardcodée — pas de connexion WebSocket ni Supabase realtime.

---

## R-13 — Footer : liens légaux tous vers `#contact`
**Sévérité : MAJEUR**

**Fichier :** `src/components/layout/Footer.tsx` — lignes 140-143

```typescript
{["Mentions légales", "Confidentialité", "nLPD"].map((l) => (
  <a key={l} href="#contact" ...>{l}</a>
))}
```

Les 3 liens légaux (Mentions légales, Confidentialité, nLPD Suisse) pointent vers `#contact` au lieu de pages dédiées. C'est une régression légale potentielle — la conformité nLPD (loi suisse sur la protection des données) exige généralement une politique de confidentialité accessible.

---

## R-14 — WhatsApp numéro placeholder
**Sévérité : MINEUR**

**Fichier :** `src/components/layout/Footer.tsx` — ligne 5
**Fichier :** `src/components/home/ContactSection.tsx` — ligne 23

```typescript
href: "https://wa.me/41000000000"
```

Le numéro WhatsApp est `41000000000` — un numéro fictif. Un clic dessus ouvrira WhatsApp avec un numéro invalide.

---

## Tableau récapitulatif

| ID | Description | Sévérité |
|----|-------------|---------|
| R-01 | EventsSection `.limit(1)` au lieu de 3 | CRITIQUE |
| R-07 | DonSection bouton sans action | CRITIQUE |
| R-08 | Page `/nouveau-mot-de-passe` manquante | CRITIQUE |
| R-02 | Suppression countdown banner Header | MAJEUR |
| R-09 | Contact sans email notification | MAJEUR |
| R-13 | Liens légaux Footer → `#contact` | MAJEUR |
| R-05 | Ancre `#features` non dans nav (scroll indicator) | MINEUR |
| R-03 | Grid sermons 3 colonnes — cas 1 sermon secondaire | MODÉRÉ |
| R-04 | Cards flottantes Hero masquées mobile | MODÉRÉ |
| R-06 | Scroll indicator → `features` hors nav | MINEUR |
| R-10 | AnnouncementBar aria-hidden | MODÉRÉ |
| R-11 | SermonsClient gap grille si rest.length=1 | MODÉRÉ |
| R-12 | Live badge / "18 en ligne" hardcodés | MODÉRÉ |
| R-14 | WhatsApp numéro fictif `41000000000` | MINEUR |
