# ARC Église — Bilan Projet Complet
**Document de référence — État réel du projet au 20 juillet 2026**  
Généré pour partage avec parties prenantes et évaluation du socle API.

---

## 1. Vue d'ensemble

**Projet :** Site web + espace membres + IA biblique pour l'église ARC (Ambassade du Royaume de Christ)  
**Adresse physique :** Av. Charles-Naine 39, 2300 La Chaux-de-Fonds, Suisse  
**Site live :** https://arc-eglise.ch ✅ En production  
**Démarrage :** Juin–juillet 2026 (7 sessions de développement)

### Stack technologique
| Couche | Technologie |
|---|---|
| Frontend | Next.js 14 App Router + Tailwind CSS |
| Backend | Supabase (PostgreSQL + Auth + Storage) |
| Déploiement | Vercel (prod + preview) |
| Emails transactionnels | Resend |
| Emails boîtes internes | Microsoft Graph API (M365) |
| Authentification | Supabase Auth (email + password) |
| IA | ARC AI Engine (Groq, Gemini, Mistral, Anthropic, DeepSeek, OpenAI, Ollama local) |
| Paiements | Stripe (configuré, désactivé) |
| Vidéo live | YouTube API |
| Gestion versions | GitHub (Arc-Eglise/arc-eglise-app) |
| DNS | Infomaniak + Vercel DNS |
| Email hébergement | Microsoft 365 |

---

## 2. Infrastructure

### URLs & Identifiants techniques
| Ressource | URL / Valeur |
|---|---|
| Site live | https://arc-eglise.ch |
| GitHub | https://github.com/Arc-Eglise/arc-eglise-app |
| Vercel project | arc-eglise-projects/arc-eglise-app |
| Supabase | Frankfurt eu-central-1 (ID: fobyvhulyjxwbhusouqz) |
| DNS provider | Infomaniak (nsany1/nsany2.infomaniak.com) |

### Variables d'environnement Vercel (état au 20/07/2026)
| Variable | Statut | Note |
|---|---|---|
| NEXT_PUBLIC_SUPABASE_URL | ✅ | |
| NEXT_PUBLIC_SUPABASE_ANON_KEY | ✅ | |
| SUPABASE_SERVICE_ROLE_KEY | ✅ | Server-only |
| NEXT_PUBLIC_SITE_URL | ✅ | |
| RESEND_API_KEY | ✅ | |
| BIBLE_API_KEY / BASE / ID | ✅ | |
| YOUTUBE_API_KEY / CHANNEL_ID | ✅ | |
| ARC_ENCRYPTION_KEY | ✅ | |
| GRAPH_TENANT_ID / CLIENT_ID | ✅ | |
| GRAPH_CLIENT_SECRET | ✅ Mis à jour 20/07/2026 | Nouveau secret Azure AD |
| GROQ_API_KEY | ✅ | Provider AI primaire |
| GEMINI_API_KEY | ✅ | gemini-2.0-flash |
| DEEPSEEK_API_KEY | ✅ | |
| ANTHROPIC_API_KEY | ✅ mais crédit épuisé | |
| OPENAI_API_KEY | ✅ mais quota 429 | |
| OLLAMA_BASE_URL | ✅ Ajouté 20/07/2026 | https://perfected-reproach-monitor.ngrok-free.dev/v1 |
| STRIPE_SECRET_KEY | ✅ (clés TEST) | |
| NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY | ✅ (clés TEST) | |
| NEXT_PUBLIC_DONS_ENABLED | ❌ Non défini | Dons désactivés intentionnellement |
| STRIPE_WEBHOOK_SECRET | ❌ | À configurer Stripe Webhooks |
| LUNZIKO_* (4 vars) | ✅ | Intégration plateforme Lunziko |
| MISTRAL_API_KEY | ❌ | Non configuré |
| GOOGLE_SITE_VERIFICATION | ❌ | Search Console en attente |

### DNS arc-eglise.ch
| Enregistrement | Valeur | Statut |
|---|---|---|
| A (racine) | 76.76.21.21 (Vercel) | ✅ |
| CNAME www | Vercel | ✅ |
| MX | arceglise-ch0i.mail.protection.outlook.com | ✅ M365 |
| SPF TXT | v=spf1 include:spf.protection.outlook.com include:spf.resend.com -all | ✅ |
| DKIM Resend | resend._domainkey TXT | ✅ |
| DKIM M365 selector1 | CNAME → Microsoft | ✅ |
| DKIM M365 selector2 | CNAME → Microsoft | ✅ |
| DMARC | **⚠️ DEUX ENREGISTREMENTS EN CONFLIT** | ❌ À corriger Infomaniak |
| PWA manifest | display:standalone, thème #1e2464 | ✅ |

> **Action requise DMARC :** Supprimer les 2 enregistrements `_dmarc` existants dans Infomaniak et les remplacer par un seul :  
> `v=DMARC1; p=reject; rua=mailto:contact@arc-eglise.ch; ruf=mailto:contact@arc-eglise.ch; adkim=r; aspf=r; pct=100;`

---

## 3. Architecture applicative

### Structure pages (Next.js App Router)

```
/                           → Site vitrine (public)
/espace-membres             → Hub espace membres (auth requise)
/espace-membres/annuaire    → Annuaire membres
/espace-membres/agenda      → Agenda événements
/espace-membres/streaming   → Streaming cultes (YouTube Live)
/espace-membres/bible       → Lecteur Bible
/espace-membres/ai-biblique → ARC AI Engine (chat + dict + plans)
/espace-membres/admin       → Administration (admin/pasteur/comm/support)
```

### Route Handlers API (Next.js)
```
/api/bible-ai/chat          → Chat AI biblique (streaming)
/api/bible-ai/dictionary    → Dictionnaire théologique + personnes bibliques
/api/bible-ai/sermons       → Résumés AI sermons (CRUD)
/api/bible-ai/plans         → Plans de lecture (non vérifié)
/api/members                → Actions membres (CRUD profils, notes CRM, groupes)
/api/sermons                → Gestion sermons (pasteurs, visiteurs)
/api/crm                    → Actions CRM (rôles, block/unblock/delete)
/api/mail                   → Boîtes mail M365 via Graph
/api/agenda                 → Événements (CRUD + récurrence)
/api/streaming              → Config streaming YouTube
/api/testimonials           → Témoignages
/api/admin                  → Actions admin (site settings, thème, photos)
/api/stripe/checkout        → Checkout dons (désactivé)
/api/stripe/webhook         → Webhook Stripe (à configurer)
```

---

## 4. Base de données Supabase

### Tables principales
| Table | Description |
|---|---|
| `profiles` | Membres (rôle, groupes, stage pastoral, données personnelles) |
| `sermons` | Sermons + résumés AI + pasteur (membre/visiteur/manuel) |
| `visiting_pastors` | Pasteurs visiteurs (CRUD complet) |
| `events` | Événements avec récurrence (type/interval/end_date) |
| `testimonials` | Témoignages (avec statut) |
| `notes` | Notes pastorales sur membres |
| `theological_dictionary` | Dictionnaire théologique (créé via AI) |
| `site_settings` | Config globale site (thème, bannière, verset, etc.) |

### Colonnes site_settings (clés configurées)
`theme_accent_color`, `theme_accent_until`, `announcement_*` (5 clés bannière), `verset_mode`, `verset_auto_interval`, `verset_theme_interval`, `about_photo_url`, `about_photo_caption`, `don_twint_numero`, `don_iban`, `social_*`, `zoom_url`/`zoom_custom`

### Hiérarchie RBAC
```
4 RÔLES : visiteur | membre | pasteur | admin

12 FONCTIONS (profiles.groups[]) :
  pasteur | chorale | media | social | sanitaire | finance
  support | jeunesse | femmes | ecodim | suivi | communication

PIPELINE PASTORAL (profiles.pastoral_stage) :
  visiteur → intégration → actif → formation → responsable

PERMISSIONS ADMIN :
  canAdmin     = isAdmin || isPasteur || canCommFunc || canSupportFunc
  canAdminFull = isAdmin || isPasteur
  Gestion droits : isAdmin uniquement
  RustDesk     : isAdmin || canSupportFunc
```

### Migrations exécutées (16 fichiers SQL, sessions 5-6, 17/07/2026)
| Fichier | Contenu |
|---|---|
| add-visiting-pastors.sql | Table pasteurs visiteurs + FK sermons |
| add-crm-pipeline.sql | Pipeline pastoral + followup_date |
| add-events-recurrence-testimonials-status.sql | Récurrence événements + statut témoignages |
| add-events-image.sql | Image URL sur événements |
| add-theme-override.sql | Thème accent couleur (dynamique) |
| add-verset-mode-settings.sql | Mode verset automatique |
| add-banner-settings.sql | 5 clés bannière announcement_* |
| add-group-managers.sql | Gestionnaires de groupes (managed_groups[]) |
| fix-vitrine-photo.sql | Photo À Propos + légende |
| seed-don-settings.sql | TWINT + IBAN (vides, à remplir) |
| setup-admin-arceglise.sql | Compte admin arceglise.cdf@gmail.com |
| fix-emerance-pasteur.sql | Profil pasteur Emerance Obova |
| fix-rbac-pasteur-function-sync.sql | Sync fonction pasteur |
| fix-kylian-luzolo.sql | Profil membre Kylian Luzolo |
| add-full-name-column.sql | Colonne full_name STORED sur profiles |
| add-role-auth-sync.sql | Triggers sync rôle auth ↔ profiles |
| add-social-zoom-custom-links.sql | Liens sociaux + Zoom dans site_settings |
| migrations/20260717000001_theological_dictionary.sql | Dictionnaire théologique |

---

## 5. Fonctionnalités — État détaillé

### 5.1 Site vitrine (public)
| Fonctionnalité | État | Notes |
|---|---|---|
| Page d'accueil complète | ✅ | Hero, À propos, Sermons, Features, Footer |
| Thème couleur dynamique | ✅ | buildThemeCss + ThemeOverridePicker (53 couleurs) |
| Bandeau d'annonces | ✅ | AnnouncementMarquee + config admin |
| Lecteur sermon en vedette | ✅ | Vidéo embed directe (SermonsClient) |
| Photo À Propos admin | ✅ | about_photo_url + caption |
| Liens sociaux configurables | ✅ | Facebook, Instagram, YouTube, WhatsApp, Telegram |
| PWA (Progressive Web App) | ✅ | manifest.ts, display:standalone |
| SEO | ⚠️ Basique | Google Search Console non configuré |

### 5.2 Authentification & Membres
| Fonctionnalité | État | Notes |
|---|---|---|
| Inscription / connexion | ✅ | Supabase Auth email+password |
| Profil membre complet | ✅ | Nom, prénom, tel, adresse, photo, groupes, rôle |
| Pipeline pastoral (stage) | ✅ | CRM avec 5 étapes |
| Annuaire membres | ✅ | Filtres rôle/groupe, recherche |
| Notes pastorales | ✅ | Notes sur chaque membre |
| Invitations membres | ✅ | Réservé admin/pasteur |
| Gestion des droits | ✅ | Rôles + groupes modifiables |
| Gestionnaires de groupes | ✅ | managed_groups[] max 2 par groupe |

### 5.3 Sermons
| Fonctionnalité | État | Notes |
|---|---|---|
| Liste sermons | ✅ | Affichage vitrine + espace membres |
| Lecteur vidéo fullscreen | ✅ | VideoPlayer.tsx, API Fullscreen native |
| Gestion pasteurs (3 modes) | ✅ | Membre ARC / Visiteur / Manuel |
| Pasteurs visiteurs CRUD | ✅ | Table visiting_pastors |
| Résumés AI sermons | ✅ | Génération Groq, édition, suppression |
| Versets clés (tags) | ✅ | Éditables via interface |
| Thèmes théologiques (tags) | ✅ | Cliquables → popup AI |

### 5.4 ARC AI Engine (/espace-membres/ai-biblique)
| Fonctionnalité | État | Notes |
|---|---|---|
| Chat biblique streaming | ✅ | Multi-provider avec fallback |
| Dictionnaire théologique | ✅ | Termes + personnes bibliques |
| Dictionnaire personnes bibliques | ✅ | Profil complet, relations, thèmes |
| Plans de lecture | ✅ | Création AI |
| Recherche thèmes (popup) | ✅ | Depuis résumés sermons |
| Lookup verset (popup) | ✅ | Depuis résumés sermons |
| Lecture Bible intégrée | ✅ | API Bible externe |
| Boutons retour contextuels | ✅ | Vers espace membres ou AI biblique |

**Fallback chain AI :** Groq → Gemini → Mistral → Anthropic → DeepSeek → OpenAI → Ollama (qwen/deepseek/glm)

**Modèles Ollama locaux disponibles :**
- `arc-llm-qwen` (Qwen2.5 7B — multilingue FR/EN/AR)
- `arc-llm-deepseek` (DeepSeek-R1 7B — raisonnement théologique)
- `arc-llm-glm` (GLM4 — très long contexte)
- Tunnel ngrok actif : https://perfected-reproach-monitor.ngrok-free.dev/v1

### 5.5 Agenda & Événements
| Fonctionnalité | État | Notes |
|---|---|---|
| Affichage agenda | ✅ | Liste + vue mois |
| CRUD événements | ✅ | Admin/pasteur |
| Récurrence | ✅ | quotidien/hebdo/mensuel + date fin |
| Image événement | ✅ | image_url |
| Lien Zoom | ✅ | Zoom URL ou lien custom |

### 5.6 Streaming
| Fonctionnalité | État | Notes |
|---|---|---|
| Page streaming espace membres | ✅ | Embed YouTube + chat |
| Lecteur fullscreen | ✅ | VideoPlayer.tsx |
| Config YouTube | ⚠️ | YouTube Channel ID placeholder (UCxxxxxxxx) |
| YouTube Live ID réel | ❌ | À câbler avec l'ID de la chaîne ARC |

### 5.7 Communication email (Administration)
| Fonctionnalité | État | Notes |
|---|---|---|
| Lecture boîtes mail | ✅ | Via Microsoft Graph API |
| Envoi emails depuis boîtes | ✅ | From explicite + saveToSentItems |
| Réponse/transfer emails | ✅ | replyToMessage + forwardMessage |
| Emails Resend (transactionnels) | ✅ | Invitations, notifications |
| SPF / DKIM | ✅ | Configuré M365 + Resend |
| DMARC | ❌ 2 enregistrements conflits | À corriger Infomaniak |
| Boîtes disponibles | 13 | contact@, chorale@, communication@, ecodim@, media@, finance@, femmes@, jeunesse@, pasteurs@, sanitaire@, hospitalite@, pastoral@, support@ |

### 5.8 Administration & CRM
| Fonctionnalité | État | Notes |
|---|---|---|
| Tableau de bord admin | ✅ | Onglets par rôle |
| Gestion membres (admin view) | ✅ | Vue complète avec droits |
| CRM pastoral (pipeline) | ✅ | Étapes + dates suivi |
| Support RustDesk | ✅ | Onglet support (admin/support) |
| Paramètres site | ✅ | Thème, bannière, verset, photo, dons |
| Gestion témoignages | ✅ | CRUD + statut |

### 5.9 Dons & Paiements
| Fonctionnalité | État | Notes |
|---|---|---|
| Page dons | ✅ Codée | Désactivée intentionnellement |
| Stripe intégration | ✅ (clés TEST) | Prête à activer |
| TWINT | ⚠️ | Config Stripe TWINT Payment Method requise |
| Virement IBAN | ✅ | À renseigner dans site_settings |
| NEXT_PUBLIC_DONS_ENABLED | ❌ non défini | Activer quand Stripe prêt |
| STRIPE_WEBHOOK_SECRET | ❌ | À créer dans Stripe Dashboard |

---

## 6. Infrastructure Ollama (IA locale)

### Tunnel ngrok — Configuré 20/07/2026
| Élément | Valeur |
|---|---|
| URL publique | https://perfected-reproach-monitor.ngrok-free.dev |
| Port local | 11434 (Ollama) |
| Config | C:\Users\Joe\AppData\Local\ngrok\ngrok.yml |
| Auto-démarrage | Tâche planifiée Windows "ARC-Ollama-Tunnel" |
| Script | C:\Users\Joe\AppData\Local\ngrok\start-ollama-tunnel.ps1 |
| Vercel env | OLLAMA_BASE_URL = https://perfected-reproach-monitor.ngrok-free.dev/v1 |

> ⚠️ Le tunnel ne fonctionne que quand la machine de Joe est allumée et connectée. C'est un fallback de dernier recours — Groq/Gemini/DeepSeek prennent le relais si Ollama est indisponible.

---

## 7. Ce qui reste à faire

### 🔴 Urgent (bloquant)
| Tâche | Description | Où agir |
|---|---|---|
| Corriger DMARC | Supprimer 2 enregistrements conflits → 1 seul | Infomaniak DNS |

### 🟡 Priorité haute
| Tâche | Description | Où agir |
|---|---|---|
| Stripe production | Clés live + TWINT PM + activer DONS_ENABLED | Stripe Dashboard + Vercel |
| STRIPE_WEBHOOK_SECRET | Créer endpoint webhook Stripe → env Vercel | Stripe Dashboard |
| don_twint_numero + don_iban | Renseigner les vraies valeurs | Admin site_settings |
| YouTube Live ID | Remplacer UCxxxxxxxx par l'ID chaîne ARC | Admin streaming |
| GRAPH_CLIENT_SECRET expiry | Créer nouveau secret Azure AD avant expiration | Azure Portal |

### 🟢 Améliorations
| Tâche | Description |
|---|---|
| Google Search Console | Ajouter GOOGLE_SITE_VERIFICATION |
| MISTRAL_API_KEY | Ajouter pour compléter la chain AI |
| Anthropic crédit | Recharger le compte Anthropic |
| OpenAI quota | Résoudre le 429 (upgrade plan ou attendre reset) |
| Icônes ministères | <Icon name="chorale"> selon profile.groups[] |
| Notifications push | PWA push notifications (ServiceWorker) |

---

## 8. Contexte pour le socle API

### APIs REST existantes
L'application dispose déjà de **13 Route Handlers** Next.js couvrant :
- Membres / CRM / profils
- Sermons / pasteurs
- Événements / agenda
- IA biblique (chat, dictionnaire, plans, résumés)
- Mail M365
- Streaming
- Administration / site settings
- Stripe (paiements)

### Ce que le socle API devrait apporter
1. **Authentification standardisée** : tokens JWT inter-services (actuellement Supabase Auth seulement)
2. **Versioning** : `/api/v1/*` — actuellement sans versioning
3. **Rate limiting** : pas de protection anti-abus côté API
4. **Webhooks entrants** : Stripe, YouTube Live events, M365 mail push
5. **SDK client** : Pour une future app mobile ou autres intégrations
6. **Documentation OpenAPI** : Aucune spec auto-générée
7. **Monitoring API** : Pas de logging centralisé des appels API
8. **Multi-tenant** : Si ARC veut déployer pour d'autres églises

### Architecture actuelle vs socle API recommandé
```
ACTUEL :
Browser/Mobile → Next.js Route Handlers → Supabase | Graph | AI | Stripe

AVEC SOCLE API :
Browser/Mobile → API Gateway (auth + rate limit + monitoring)
                     → Service Membres
                     → Service Sermons + AI
                     → Service Communication (Mail/Notif)
                     → Service Paiements
                     → Next.js (frontend uniquement)
```

### Points d'intégration critiques
- `createAdminClient()` → server-only, jamais exposé
- `SUPABASE_SERVICE_ROLE_KEY` → jamais client-side
- Graph API secrets → jamais exposés
- Stripe secret → jamais exposé
- Toutes les actions sensibles nécessitent vérification du rôle côté serveur

---

## 9. Historique des sessions

| Session | Date | Livraisons principales |
|---|---|---|
| 1-2 | Juin 2026 | Site vitrine, Supabase, auth, déploiement initial |
| 3 | Juillet 2026 | Espace membres, annuaire, agenda de base |
| 4 | 17/07/2026 | ARC AI Engine, chat biblique, dictionnaire théologique |
| 5 | 17/07/2026 | Résumés sermons AI, personnes bibliques, gestion pasteurs, VideoPlayer, fix emails Graph |
| 6 | 17/07/2026 | 16 migrations SQL, thème dynamique, boutons EM, RBAC étendu, CLAUDE.md |
| 7 | 20/07/2026 | GRAPH_CLIENT_SECRET Vercel, tunnel Ollama ngrok, git sync complet |

---

## 10. Contacts & Accès

| Ressource | Accès |
|---|---|
| Vercel | arceglise.cdf@gmail.com |
| GitHub | Arc-Eglise org |
| Supabase | arceglise.cdf@gmail.com |
| Infomaniak DNS | À vérifier |
| Microsoft 365 | Azure Portal (tenant 83f431e0-...) |
| Stripe | À vérifier |
| ngrok | arceglise.cdf@gmail.com |
| Google/YouTube | À vérifier |

---

*Document généré le 20 juillet 2026 — Session 7*  
*Dossier projet : `C:\Users\Joe\Desktop\Maj projet\arc-eglise-app`*
