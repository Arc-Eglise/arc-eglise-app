# ARCHITECTURE CENTRALISÉE DES DONNÉES DE L'ÉGLISE

## Vue d'ensemble

Toutes les informations statiques de l'église (adresse, horaires, réseaux sociaux, contact, statistiques) proviennent maintenant d'une **table Supabase unique** appelée `church_info`.

Cette approche permet:
- ✅ Modification des données via interface admin
- ✅ Pas de données en dur dans le code
- ✅ Réutilisation dans tout le site vitrine
- ✅ Cache côté client (5 minutes)
- ✅ RLS (Row Level Security) pour l'accès contrôlé

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│           SUPABASE - Table church_info                  │
│  ┌──────────────────────────────────────────────────┐   │
│  │ • Adresse (address, city, postal_code, country)  │   │
│  │ • Contact (phone, email, whatsapp)               │   │
│  │ • Horaires (sunday_service_time, etc.)           │   │
│  │ • Réseaux sociaux (youtube, facebook, instagram) │   │
│  │ • Statistiques (total_members, total_nations)    │   │
│  │ • Leadership (pastor_name, pastor_quote)         │   │
│  │ • Métadonnées (created_at, updated_at, etc.)     │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
                           ↑
                           │ Lecture publique
                           │
        ┌──────────────────┴──────────────────┐
        │                                     │
┌───────▼────────────────┐   ┌──────────────▼───────┐
│  Hook: useChurchInfo   │   │  Admin Page           │
│  (Client Component)    │   │  /admin/church-info   │
│                        │   │                       │
│  • Cache 5 min         │   │  • Modification admin │
│  • TypeScript types    │   │  • RLS: Admin only    │
│  • Error handling      │   │  • Updated tracking   │
└──────────┬─────────────┘   └───────────────────────┘
           │
    ┌──────▼──────────────────┐
    │ Site Vitrine            │
    │ (composants réutilisés) │
    │                         │
    │ • Accueil               │
    │ • Connexion             │
    │ • Footer                │
    │ • Formulaire de contact │
    │ • Pages publiques       │
    └─────────────────────────┘
```

---

## Fichiers créés

### 1. Migration SQL
**Fichier:** `supabase/add-church-info-table.sql`

Crée la table `church_info` avec:
- Tous les champs nécessaires
- Policies RLS (lecture publique, modification admin)
- Données initiales
- Indexes pour les performances

### 2. Hook TypeScript
**Fichier:** `src/hooks/useChurchInfo.ts`

Hook React pour récupérer les données:
- `useChurchInfo()` - Hook client avec cache
- `getChurchInfo()` - Récupération serveur
- Types TypeScript complets (interface ChurchInfo)
- Gestion des erreurs
- Cache 5 minutes

### 3. Page Admin
**Fichier:** `src/app/admin/church-info/page.tsx`

Interface de modification:
- Formulaire complet pour tous les champs
- Validation côté client
- Sauvegarde en DB avec tracking
- Gestion des erreurs et succès
- Accès admin uniquement (via RLS)

---

## Comment utiliser

### Afficher les infos de l'église (côté client)

```tsx
"use client";

import { useChurchInfo } from "@/hooks/useChurchInfo";

export function MyComponent() {
  const { data: church, loading, error } = useChurchInfo();

  if (loading) return <div>Chargement...</div>;
  if (!church) return <div>Erreur</div>;

  return (
    <div>
      <p>Adresse: {church.address}, {church.city}</p>
      <p>Email: {church.main_email}</p>
      <p>Culte: Dimanche à {church.sunday_service_time}</p>
      <p>Membres: {church.total_members} de {church.total_nations} nations</p>
    </div>
  );
}
```

### Récupérer les infos (Server Component)

```tsx
import { getChurchInfo } from "@/hooks/useChurchInfo";

export default async function Page() {
  const church = await getChurchInfo();

  return (
    <footer>
      <p>{church?.address}</p>
      <p>{church?.main_email}</p>
    </footer>
  );
}
```

### Modifier les infos (Admin)

Accéder à `/admin/church-info` pour un formulaire complet

---

## Champs disponibles dans church_info

| Champ | Type | Exemple | Usage |
|-------|------|---------|-------|
| `church_name` | TEXT | Ambassade du Royaume de Christ | Branding |
| `church_acronym` | TEXT | ARC | Branding |
| `address` | TEXT | Av. Charles-Naine 39 | Contact/Horaires |
| `city` | TEXT | La Chaux-de-Fonds | Localisation |
| `main_email` | TEXT | contact@arc-eglise.ch | Contact |
| `main_phone` | TEXT | +41 XX XXX XX XX | Contact |
| `sunday_service_time` | TEXT | 09:30 | Horaires |
| `youtube_url` | TEXT | https://youtube.com/... | Réseaux sociaux |
| `facebook_url` | TEXT | https://facebook.com/... | Réseaux sociaux |
| `instagram_url` | TEXT | https://instagram.com/... | Réseaux sociaux |
| `total_members` | INTEGER | 250 | Stats site |
| `total_nations` | INTEGER | 32 | Stats site |
| `pastor_name` | TEXT | Pedro Obova | Leadership |
| `pastor_quote` | TEXT | Construisons des générations... | Leadership |
| `primary_color` | TEXT | #1e2464 | Branding (futur) |
| `secondary_color` | TEXT | #C9A227 | Branding (futur) |

---

## Prochaines étapes

1. **Exécuter la migration SQL** dans Supabase
   ```bash
   psql $SUPABASE_DATABASE_URL < supabase/add-church-info-table.sql
   ```

2. **Remplacer les données hardcodées** dans les composants:
   - `src/app/inscription/page.tsx` - "250 membres, 32 nations"
   - `src/app/espace-membres/agenda/EventsManagerClient.tsx` - `DEFAULT_LOCATION`
   - Tous les autres fichiers listés dans `AUDIT_DONNEES_EN_DUR.md`

3. **Utiliser le hook** dans les composants:
   ```tsx
   const { data: church } = useChurchInfo();
   // Utiliser church.address, church.total_members, etc.
   ```

4. **Tester l'admin**:
   - Accéder à `/admin/church-info`
   - Modifier les données
   - Vérifier que le site reflète les changements

---

## Sécurité (RLS Policies)

### Lecture publique
Tout le monde peut lire les données de `church_info`.

### Modification
Seuls les admins (utilisateurs avec `role = 'admin'` dans la table `profiles`) peuvent modifier.

### Audit
Chaque modification est tracée:
- `updated_at` - Date/heure de la modification
- `updated_by` - ID de l'utilisateur qui a modifié

---

## Performance

### Cache client
Les données sont cachées **5 minutes** côté client pour éviter trop de requêtes.

### Indexes
```sql
CREATE INDEX idx_church_info_city ON church_info(city);
CREATE INDEX idx_church_info_updated_at ON church_info(updated_at DESC);
```

### RLS optimisée
Les policies sont simples (pas de joins complexes) pour une exécution rapide.

---

## Données synchronisées du site

Ces données viennent désormais de la table `church_info`:

✅ Adresse affichée partout  
✅ Horaires des cultes  
✅ Email de contact  
✅ Numéro de téléphone  
✅ Liens réseaux sociaux  
✅ Statistiques (250 membres, 32 nations)  
✅ Nom et citation du pasteur  
✅ Couleurs de branding (futur)

---

## Support

### Bug ou question?
Vérifier:
1. La migration SQL a-t-elle été exécutée?
2. Les données initiales sont-elles en place?
3. L'utilisateur admin a-t-il le rôle correct?
4. Le hook TypeScript importe-t-il correctement?

---
