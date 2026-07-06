# Guide de déploiement — ARC Église

**Stack :** Next.js 14 · Supabase (Frankfurt) · Vercel (fra1)
**Repo :** https://github.com/Arc-Eglise/arc-eglise-app
**Supabase :** `fobyvhulyjxwbhusouqz` (eu-central-1 Frankfurt — conformité nLPD/FADP)
**Team Vercel :** `arc-eglise-projects`

---

## 1. Connecter le repo GitHub à Vercel

1. Connecte-toi sur https://vercel.com avec le compte de la team `arc-eglise-projects`
2. Clique **Add New Project**
3. Sélectionne **Import Git Repository**
4. Connecte l'organisation GitHub **Arc-Eglise** (autoriser l'accès à l'org si demandé)
5. Sélectionne le repo `arc-eglise-app`
6. **Framework Preset :** Next.js (détecté automatiquement)
7. **Root Directory :** `.` (racine)
8. Ne déploie pas encore — configure d'abord les variables d'environnement (section 2)

---

## 2. Variables d'environnement à définir dans Vercel

Dans **Settings → Environment Variables** du projet Vercel, créer les variables suivantes.
Les valeurs se trouvent dans ton `.env.local` local (ne jamais les committer).

> Appliquer à : **Production**, **Preview** et **Development** sauf mention contraire.

### Supabase ARC
| Variable | Scope | Source |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | All | `https://fobyvhulyjxwbhusouqz.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | All | Supabase Dashboard → Project Settings → API → anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | **Production + Preview uniquement** | Supabase Dashboard → service_role key |

### Site
| Variable | Scope | Valeur |
|---|---|---|
| `NEXT_PUBLIC_SITE_URL` | Production | `https://arc-eglise.ch` (mettre l'URL Vercel temporaire jusqu'à activation du domaine) |
| `NEXT_PUBLIC_SITE_URL` | Preview | laisser vide (Vercel injecte `VERCEL_URL` automatiquement) |

### Bible API
| Variable | Scope | Source |
|---|---|---|
| `BIBLE_API_KEY` | All | scripture.api.bible |
| `BIBLE_API_BASE` | All | `https://api.scripture.api.bible/v1` |
| `BIBLE_DEFAULT_ID` | All | ex: `6f26e199139ea7f1-01` |

### Lunziko Platform
| Variable | Scope | Source |
|---|---|---|
| `LUNZIKO_API_URL` | All | `https://api-gules-nine-89.vercel.app/v1` |
| `LUNZIKO_SUPABASE_URL` | All | URL Supabase de Lunziko Platform |
| `LUNZIKO_SUPABASE_ANON_KEY` | All | Clé anon Supabase Lunziko |
| `LUNZIKO_EMAIL` | All | Email du compte de service Lunziko |
| `LUNZIKO_PASSWORD` | All | Mot de passe du compte de service Lunziko |

### YouTube
| Variable | Scope | Source |
|---|---|---|
| `YOUTUBE_API_KEY` | All | Google Cloud Console → APIs → YouTube Data API v3 |
| `YOUTUBE_CHANNEL_ID` | All | ID de la chaîne YouTube ARC |

### Chiffrement
| Variable | Scope | Note |
|---|---|---|
| `ARC_ENCRYPTION_KEY` | All | Exactement 32 caractères — même valeur qu'en local |

### SEO (à activer quand arc-eglise.ch sera actif)
| Variable | Scope | Source |
|---|---|---|
| `GOOGLE_SITE_VERIFICATION` | Production uniquement | Google Search Console → Vérification du domaine |

---

## 3. Stratégie de branches

| Branche | Déploiement Vercel | Usage |
|---|---|---|
| `main` | **Production** → arc-eglise.ch | Code validé, stable |
| `feature/*` | **Preview** → URL auto-générée | Développement en cours |
| `fix/*` | **Preview** → URL auto-générée | Corrections de bugs |

**Workflow recommandé :**
```
feature/ma-fonctionnalite → Pull Request → review → merge main → deploy prod automatique
```

---

## 4. Connecter le domaine arc-eglise.ch (quand réservé chez Infomaniak)

### Étape A — Ajouter le domaine dans Vercel
1. Dans Vercel → ton projet → **Settings → Domains**
2. Clique **Add Domain**
3. Entre `arc-eglise.ch`
4. Vercel affiche les enregistrements DNS à créer

### Étape B — Configurer le DNS chez Infomaniak
Se connecter sur https://manager.infomaniak.com → Domaines → arc-eglise.ch → DNS

**Enregistrements à créer :**

| Type | Nom | Valeur | TTL |
|---|---|---|---|
| `A` | `@` (racine) | `76.76.21.21` (IP Vercel) | 3600 |
| `CNAME` | `www` | `cname.vercel-dns.com` | 3600 |

> Note : Vercel peut aussi demander un enregistrement `TXT` pour vérification de domaine — suivre les instructions affichées dans l'interface Vercel au moment de l'ajout.

### Étape C — Mettre à jour NEXT_PUBLIC_SITE_URL dans Vercel
Changer `NEXT_PUBLIC_SITE_URL` (scope Production) de l'URL Vercel temporaire vers `https://arc-eglise.ch`

### Étape D — Google Search Console
Activer la variable `GOOGLE_SITE_VERIFICATION` dans Vercel (scope Production uniquement) avec la valeur fournie par Google Search Console.

---

## 5. Migrations SQL — Nouveau projet Supabase

Le projet Supabase `fobyvhulyjxwbhusouqz` est vide. Appliquer les migrations dans cet ordre :

### Prérequis — Activer les extensions dans Supabase Dashboard
Avant toute migration, activer dans **Database → Extensions** :
- `uuid-ossp` (souvent actif par défaut)
- `pgcrypto` (si chiffrement côté DB utilisé)

### Installer le CLI Supabase
```bash
npm install -g supabase
```

### Lier le projet et appliquer les migrations
```bash
cd arc-eglise-app

# Lier le projet local au nouveau Supabase
supabase login
supabase link --project-ref fobyvhulyjxwbhusouqz

# Appliquer les migrations (si répertoire migrations/ structuré)
supabase db push
```

### Si supabase db push ne fonctionne pas (fichiers plats sans config.toml)
Appliquer manuellement dans **Supabase Dashboard → SQL Editor** dans cet ordre :

```
 1. supabase/schema.sql
 2. supabase/schema-membres.sql
 3. supabase/schema-cms.sql
 4. supabase/schema-presences.sql
 5. supabase/schema-messagerie-advanced.sql
 6. supabase/schema-bible.sql
 7. supabase/schema-rsvp.sql
 8. supabase/schema-crm.sql
 9. supabase/schema-crm-tags.sql
10. supabase/schema-notes-doleances.sql
11. supabase/schema-notifications.sql
12. supabase/schema-room-bookings.sql
13. supabase/schema-roles-finance.sql
14. supabase/schema-activity-audit.sql
15. supabase/schema-auto-validate.sql
16. supabase/schema-mobile-rls.sql
17. supabase/schema-arc-eglise-ai.sql
18. supabase/schema-ai-phase2.sql
19. supabase/schema-ai-phase3.sql
20. supabase/schema-ios-reading-plans.sql
21. supabase/schema-ios-crm-contacts.sql
22. supabase/fix-profiles-columns.sql
23. supabase/fix-profiles-created-at.sql
24. supabase/fix-inscription-trigger.sql
25. supabase/fix-admin-validation.sql
26. supabase/fix-rls-recursion.sql
27. supabase/migrate-missing-tables.sql
28. supabase/phase1-spiritual-profile.sql
29. supabase/phase2-activity-progress.sql
30. supabase/reading-preferences-migration.sql
31. supabase/add-member-ai-keys.sql
32. supabase/add-notification-prefs.sql
33. supabase/create-contact-messages.sql
```

> Les fichiers `check-*.sql` sont des requêtes SELECT de vérification — ne pas les appliquer comme migrations.

---

## 6. Actions manuelles à effectuer dans les consoles tierces

Ces actions ne peuvent pas être faites par code — à faire manuellement :

### Supabase (nouveau projet fobyvhulyjxwbhusouqz)
- [ ] Activer les extensions `uuid-ossp` et `pgcrypto` (Database → Extensions)
- [ ] Vérifier que Supabase Auth est configuré (Authentication → Settings)
- [ ] Configurer les URL de redirection Auth : ajouter `https://arc-eglise.ch/**` et l'URL Vercel preview `https://*.vercel.app/**` dans **Authentication → URL Configuration → Redirect URLs**
- [ ] Configurer l'email SMTP si Resend est utilisé (Authentication → SMTP Settings) — débloqué quand arc-eglise.ch sera actif
- [ ] Créer un bucket `avatars` dans Storage (public) + policies RLS associées
- [ ] Vérifier les policies RLS après migration

### GitHub (Arc-Eglise/arc-eglise-app)
- [ ] Configurer la protection de la branche `main` (Settings → Branches → Add rule)
- [ ] Ajouter les secrets Vercel si CI/CD GitHub Actions est mis en place plus tard

### Google (si YouTube API utilisée)
- [ ] Mettre à jour les domaines autorisés dans Google Cloud Console pour la clé `YOUTUBE_API_KEY` : ajouter `arc-eglise.ch` et `*.vercel.app`

---

*Document créé le 2026-07-06 — Infrastructure ARC Église dédiée (Arc-Eglise GitHub / Supabase Frankfurt / Vercel arc-eglise-projects)*
