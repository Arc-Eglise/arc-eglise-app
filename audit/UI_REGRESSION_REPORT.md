# UI_REGRESSION_REPORT.md — Régressions visuelles identifiées

Date : 2026-06-23

---

## 1. RÉGRESSIONS CONFIRMÉES DU HEADER

### REG-001 — Nom d'église tronqué dans le Header

| Champ | Valeur |
|---|---|
| **Sévérité** | CRITIQUE |
| **Fichier** | `src/components/layout/Header.tsx` |
| **Ligne** | 78 |
| **Avant (ancienne interface)** | "Ambassade du Royaume de Christ" |
| **Après (nouvelle interface)** | "Ambassade du Royaume" |
| **Cause** | Omission lors de l'écriture du composant refactorisé |
| **Impact** | Identité de l'église incorrecte sur toutes les pages publiques |

**Code problématique :**
```tsx
// INCORRECT — ligne 78
Ambassade du Royaume

// CORRECT — attendu
Ambassade du Royaume de Christ
```

---

### REG-002 — Nom d'église tronqué sur la page Connexion

| Champ | Valeur |
|---|---|
| **Sévérité** | CRITIQUE |
| **Fichier** | `src/app/connexion/page.tsx` |
| **Ligne** | 77 |
| **Avant** | "Ambassade du Royaume de Christ" |
| **Après** | "Ambassade du Royaume" |
| **Cause** | Même omission que le Header |

---

### REG-003 — Nom d'église tronqué sur la page Inscription

| Champ | Valeur |
|---|---|
| **Sévérité** | CRITIQUE |
| **Fichier** | `src/app/inscription/page.tsx` |
| **Ligne** | ~97 |
| **Avant** | "Ambassade du Royaume de Christ" |
| **Après** | "Ambassade du Royaume" |
| **Cause** | Même omission |

---

### REG-004 — Logo non harmonisé entre Header et Footer

| Champ | Valeur |
|---|---|
| **Sévérité** | MODÉRÉ |
| **Fichier** | Header vs Footer |
| **Avant** | Cohérence visuelle logo |
| **Après** | Header = box navy, Footer = box or, Auth pages = box navy gradient |
| **Impact** | 3 variantes visuelles différentes du même logo |

---

### REG-005 — Contrainte de largeur à 768-900px (tablette)

| Champ | Valeur |
|---|---|
| **Sévérité** | MAJEUR |
| **Fichier** | `Header.tsx` |
| **Description** | fontSize 21px sur "Ambassade du Royaume de Christ" + 7 liens nav + CTAs à 768px = espace insuffisant |
| **Avant** | Ancienne version utilisait un texte plus petit pour le nom dans le header |
| **Après** | 21px trop grand — la nav centrale (`flex-1`) est compressée à ~95px pour 7 liens |
| **Impact** | Liens de navigation illisibles ou débordants sur tablette |

**Calcul de la contrainte à 768px :**
```
Espace total : 768 - 64px (padding) = 704px
Logo complet 21px : ~361px
CTAs (non connecté) : ~210px
Gaps (24px × 2) : 48px
Disponible pour nav : 704 - 361 - 210 - 48 = 85px → insuffisant pour 7 liens
```

---

## 2. RÉGRESSIONS CONNEXES (déjà corrigées session précédente)

Ces régressions ont été identifiées et corrigées lors de l'audit précédent :

| ID | Description | Statut |
|---|---|---|
| REG-006 | EventsSection `.limit(1)` au lieu de `.limit(3)` | ✅ Corrigé |
| REG-007 | DonSection bouton sans action | ✅ Corrigé |
| REG-008 | Police Outfit jamais importée | ✅ Corrigé |
| REG-009 | Faux sermons en placeholder | ✅ Corrigé |
| REG-010 | `/nouveau-mot-de-passe` → 404 | ✅ Corrigé |

---

## 3. ÉLÉMENTS NON RÉGRESSIFS (intentionnel)

| Élément | Avant | Après | Statut |
|---|---|---|---|
| Countdown banner rouge | Présent (live uniquement) | Remplacé par AnnouncementBar marquee | ✅ Évolution intentionnelle |
| Font Outfit | Header/site | Remplacée par Manrope | ✅ Choix design |
| Fond blanc | `bg-white` | Fond crème `#FAF7F0` | ✅ Choix design maquette |
| Header transparent | Fond blanc | Fond cream rgba(.92) | ✅ Choix design |

---

## 4. MATRICE DE RISQUE

| Régression | Visibilité | Fréquence | Priorité de correction |
|---|---|---|---|
| REG-001 Header nom tronqué | 100% visiteurs | 100% pages vitrine | 🔴 Immédiat |
| REG-002 Connexion nom tronqué | Utilisateurs auth | Élevée | 🔴 Immédiat |
| REG-003 Inscription nom tronqué | Nouveaux membres | Élevée | 🔴 Immédiat |
| REG-004 Logo incohérent | Visuellement discret | Permanente | 🟡 Court terme |
| REG-005 Layout tablette | 768-900px | Modérée | 🟡 Court terme |
