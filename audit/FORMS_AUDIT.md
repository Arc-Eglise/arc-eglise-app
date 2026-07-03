# FORMS_AUDIT.md — ARC Église
> Audit exhaustif de tous les formulaires
> Audit du 2026-06-23

---

## 1. ContactSection — Formulaire de contact

**Fichier :** `src/components/home/ContactSection.tsx`
**Endpoint :** `POST /api/contact`
**Composant :** "use client"

### Champs
| Champ | Type | Required | Validation | État contrôlé |
|-------|------|----------|-----------|--------------|
| Prénom | `text` | ✅ | required HTML | ✅ `form.first_name` |
| Nom | `text` | ✅ | required HTML | ✅ `form.last_name` |
| Email | `email` | ✅ | required HTML + type | ✅ `form.email` |
| Sujet | `select` | ❌ | aucune | ✅ `form.subject` |
| Message | `textarea` | ✅ | required HTML | ✅ `form.message` |

### Validation côté client
- Validation HTML5 (`required`, `type="email"`) seulement
- Pas de longueur minimum vérifiée côté client pour le message
- Pas de validation de longueur max côté client (le serveur limite à 5000 chars)

### Validation côté serveur (`/api/contact`)
- ✅ Vérification présence des champs obligatoires (first_name, last_name, email, message)
- ✅ Regex email : `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`
- ✅ Longueur message max 5000 caractères
- ✅ Trim sur tous les champs
- ✅ Insertion Supabase `contact_messages`

### Gestion des erreurs
- ✅ Bloc `try/catch` avec `setError()`
- ✅ Affichage erreur en rouge si serveur répond non-ok
- ✅ État `sending` avec bouton désactivé
- ✅ État `sent` → affichage message de succès

### Problèmes identifiés
| Problème | Sévérité |
|---------|---------|
| Aucun email de notification envoyé à l'église | CRITIQUE |
| Pas de honeypot anti-spam | MODÉRÉ |
| Pas de rate limiting côté serveur | MODÉRÉ |
| Pas de validation longueur min message côté client | MINEUR |
| `sujet` non obligatoire — valeur par défaut correcte | OK |

---

## 2. DonSection — Formulaire de don

**Fichier :** `src/components/home/DonSection.tsx`
**Endpoint :** **AUCUN**
**Composant :** "use client"

### Champs
| Champ | Type | Required | Validation | État contrôlé |
|-------|------|----------|-----------|--------------|
| Montant (boutons) | Boutons sélecteurs | ❌ | aucune | ✅ `selected` |
| Montant custom | `number` | ❌ | `min="1"` HTML | ✅ `custom` |
| Fréquence | Toggle UI | ❌ | aucune | ✅ `freq` |
| Mode paiement | Boutons sélecteurs | ❌ | aucune | ✅ `payment` |
| Email (reçu) | `email` | ❌ | aucune | ❌ **Non contrôlé** |

### Problèmes identifiés
| Problème | Sévérité |
|---------|---------|
| Bouton "Donner" sans `onClick` ni form `onSubmit` | CRITIQUE |
| Champ email non contrôlé (sans `value` ni `onChange`) | CRITIQUE |
| Aucun appel API / redirection paiement | CRITIQUE |
| Aucune validation de montant | MAJEUR |
| Barres de progression hardcodées (78%/62%/45%) | MODÉRÉ |
| Aucun message d'erreur prévu | MAJEUR |

**Conclusion :** Ce formulaire est entièrement décoratif. Il n'envoie rien.

---

## 3. Formulaire d'inscription (`/inscription`)

**Fichier :** `src/app/inscription/page.tsx`
**Endpoint :** `supabase.auth.signUp()`
**Composant :** "use client"

### Étape 0 — Identité
| Champ | Type | Required | Validation | État contrôlé |
|-------|------|----------|-----------|--------------|
| Prénom | `text` | ✅ | required HTML + JS check | ✅ `form.first_name` |
| Nom | `text` | ✅ | required HTML + JS check | ✅ `form.last_name` |
| Pays d'origine | `text` | ❌ | aucune | ✅ `form.country` |

### Étape 1 — Compte
| Champ | Type | Required | Validation | État contrôlé |
|-------|------|----------|-----------|--------------|
| Email | `email` | ✅ | required HTML + type | ✅ `form.email` |
| Mot de passe | `password` | ✅ | min 8 chars (JS) | ✅ `form.password` |
| Confirmer MDP | `password` | ✅ | === form.password | ✅ `form.confirm` |

### Étape 2 — Confirmation
| Champ | Type | Required | Validation |
|-------|------|----------|-----------|
| Checkbox CGU | `checkbox` | ✅ | required HTML |

### Validation JS (nextStep)
- ✅ Step 0 : prénom + nom présents
- ✅ Step 1 : email présent, password >= 8, password === confirm
- ✅ `signUp` avec `emailRedirectTo: .../auth/callback`

### Gestion des erreurs
- ✅ Messages d'erreur Supabase traduits en français
- ✅ État `loading` avec bouton désactivé
- ✅ Détection "already registered"
- ❌ Pas de validation format email côté client (laissé au type HTML)

### Problèmes identifiés
| Problème | Sévérité |
|---------|---------|
| "conditions d'utilisation" et "politique de confidentialité" sont des `<span>` sans lien | MAJEUR |
| Pas de validation regex email côté client | MINEUR |
| `supabase.auth.signUp` sur un email déjà utilisé retourne parfois une session sans erreur (rate limit Supabase) | MODÉRÉ |

---

## 4. Formulaire de connexion (`/connexion`)

**Fichier :** `src/app/connexion/page.tsx`
**Endpoint :** `supabase.auth.signInWithPassword()` + `signInWithOAuth()`
**Composant :** "use client" (ConnexionForm dans Suspense)

### Champs
| Champ | Type | Required | Validation |
|-------|------|----------|-----------|
| Email | `email` | ✅ | required HTML |
| Mot de passe | `password` | ✅ | required HTML |

### Validation JS
- ✅ Messages d'erreur Supabase traduits
- ✅ "Invalid login" → message FR
- ✅ "Email not confirmed" → message FR
- ✅ État `loading`

### Problèmes identifiés
| Problème | Sévérité |
|---------|---------|
| Pas de rate limiting côté client | MINEUR |
| Google OAuth utilise un emoji 🔵 au lieu d'un vrai logo Google | MINEUR |
| Pas de lien "Créer un compte" dans le succès post-connexion | MINEUR |

---

## 5. Formulaire mot de passe oublié (`/mot-de-passe-oublie`)

**Fichier :** `src/app/mot-de-passe-oublie/page.tsx`
**Endpoint :** `supabase.auth.resetPasswordForEmail()`
**Composant :** "use client"

### Champs
| Champ | Type | Required | Validation |
|-------|------|----------|-----------|
| Email | `email` | ✅ | required HTML |

### Problèmes identifiés
| Problème | Sévérité |
|---------|---------|
| Redirect vers `/nouveau-mot-de-passe` — page inexistante | CRITIQUE |
| Pas de validation côté client de l'email | MINEUR |

---

## 6. Formulaire profil — Espace Membres (`/espace-membres/profil`)

**Fichier :** `src/app/espace-membres/profil/page.tsx`
**Endpoint :** Server Action `updateProfile(formData)` + `uploadMemberAvatar(formData)`
**Composant :** Server Component + Server Actions

### Champs
| Champ | Type | Required | État |
|-------|------|----------|------|
| Prénom | `text` | ❌ | `defaultValue` |
| Nom | `text` | ❌ | `defaultValue` |
| Téléphone | `tel` | ❌ | `defaultValue` |
| Pays d'origine | `text` | ❌ | `defaultValue` |
| Email | `text` | disabled | Non modifiable |
| Avatar | Upload via AvatarUpload | ❌ | Composant dédié |

### Problèmes identifiés
| Problème | Sévérité |
|---------|---------|
| Pas de validation côté client (Server Action) | MODÉRÉ |
| Pas de feedback visuel de succès après enregistrement | MODÉRÉ |
| Le champ téléphone est cast via `(profile as { phone?: string })?.phone` — cast unsafe | MINEUR |

---

## 7. Formulaire de prière — Espace Membres (`/espace-membres/priere`)

**Fichier :** `src/app/espace-membres/priere/page.tsx`
**Endpoint :** Server Actions (createPrayerRequest, prayForRequest, markPrayerAnswered, deletePrayerRequest)
**Composant :** Server Component + Server Actions

### Champs (formulaire création)
| Champ | Type | Required | Validation |
|-------|------|----------|-----------|
| Titre | `text` | ✅ | required HTML, maxLength=200 |
| Détails | `textarea` | ❌ | maxLength=1000 |
| Anonyme | `checkbox` | ❌ | aucune |

### Contrôle d'accès
- ✅ `canPost` : validated OU admin/pasteur OU groupe "support"
- ✅ Si non validé → message "Compte en attente"
- ✅ Bouton "Marquer exaucée" et "Supprimer" uniquement pour l'auteur (`isAuthor`)

### Problèmes identifiés
| Problème | Sévérité |
|---------|---------|
| Pas de pagination — toutes les prières chargées d'un coup | MODÉRÉ |
| Pas de limite de prières par utilisateur (spam possible) | MODÉRÉ |

---

## 8. Synthèse globale

| Formulaire | Fonctionnel | Validation | Sécurité | Score |
|-----------|-------------|-----------|---------|-------|
| Contact | ✅ Oui | ✅ Client + Serveur | ⚠️ No rate-limit | 7/10 |
| Don | ❌ Non | ❌ Aucune | ❌ N/A | 1/10 |
| Inscription | ✅ Oui | ✅ Multi-step | ✅ Supabase | 8/10 |
| Connexion | ✅ Oui | ✅ HTML | ✅ Supabase | 8/10 |
| MDP Oublié | ⚠️ Partiel | ✅ HTML | ✅ Supabase | 5/10 |
| Profil | ✅ Oui | ⚠️ Partiel | ✅ Server Action | 7/10 |
| Prière | ✅ Oui | ✅ maxLength | ✅ Server Action | 8/10 |
