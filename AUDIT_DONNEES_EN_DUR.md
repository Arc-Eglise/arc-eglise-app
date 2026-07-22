╔════════════════════════════════════════════════════════════════════════════╗
║             AUDIT EXHAUSTIF - DONNÉES EN DUR RESTANTES                     ║
║                   ARC ÉGLISE - arc-eglise.ch                              ║
║                   Date: 2026-07-22                                        ║
╚════════════════════════════════════════════════════════════════════════════╝

RÉSUMÉ EXÉCUTIF
===============
- Total de données en dur identifiées: 15+
- Bloc de statistiques supprimé: OUI ✅ (commit f2c2a1a)
- Sévérité: Modérée
- Urgence de correction: Moyenne (données plutôt métier que stats volatiles)


════════════════════════════════════════════════════════════════════════════

CATÉGORIE 1: STATISTIQUES & DONNÉES QUANTITATIVES
═════════════════════════════════════════════════

❌ FICHIER: src/app/inscription/page.tsx
   LIGNE: 60
   CODE: <p className="text-sm text-white/60 mb-8">Une communauté de 250 membres issus de 32 nations.</p>
   TYPE: Statistiques hardcodées
   IMPACT: Haute (visible aux nouveaux inscrits)
   ACTION: ⚠️  Créer table organization_stats en Supabase

✅ FICHIER: src/app/connexion/page.tsx
   LIGNE: 109-116 [SUPPRIMÉ]
   CODE: [["250", "Membres"], ["32", "Nations"], ["6", "Ans"]]
   STATUS: CORRIGÉ dans commit f2c2a1a


════════════════════════════════════════════════════════════════════════════

CATÉGORIE 2: ADRESSES & LOCALISATION
═════════════════════════════════════

❌ FICHIER: src/app/admin/evenements/page.tsx
   LIGNE: ~250 (formulaire)
   CODE: defaultValue={editing?.location ?? "Av. Charles-Naine 39, La Chaux-de-Fonds"}
   TYPE: Adresse par défaut
   IMPACT: Moyenne
   ACTION: ⚠️  Créer constante env: NEXT_PUBLIC_CHURCH_ADDRESS

❌ FICHIER: src/app/espace-membres/agenda/EventsManagerClient.tsx
   LIGNE: ~5
   CODE: const DEFAULT_LOCATION = "Av. Charles-Naine 39, La Chaux-de-Fonds";
   TYPE: Constante locale
   IMPACT: Haute
   ACTION: ⚠️  Remplacer par env var

❌ FICHIER: src/app/espace-membres/EspaceMembresClient.tsx
   LIGNE: ~2850
   CODE: <textarea ... placeholder="Av. Charles-Naine 39, 2300 La Chaux-de-Fonds" .../>
   TYPE: Adresse en placeholder
   IMPACT: Basse

❌ FICHIER: src/app/espace-membres/EspaceMembresClient.tsx
   LIGNE: ~2600
   CODE: <div style={{fontSize:11,color:"#8890aa",marginBottom:4}}>Dimanche à 9h30 · La Chaux-de-Fonds</div>
   TYPE: Horaire + localisation
   IMPACT: Moyenne
   NOTE: "Dimanche à 9h30" n'est pas configurable

❌ FICHIER: src/app/espace-membres/EspaceMembresClient.tsx
   LIGNE: ~2700
   CODE: <div style={{fontSize:11,color:"#8890aa",marginTop:4}}>📍 La Chaux-de-Fonds</div>
   TYPE: Localisation seule
   IMPACT: Basse


════════════════════════════════════════════════════════════════════════════

CATÉGORIE 3: NOMS & IDENTITÉS DE PERSONNES
═══════════════════════════════════════════

❌ FICHIER: src/app/connexion/page.tsx
   LIGNE: 106
   CODE: <div className="text-sm text-white/50">— Pasteur Pedro Obova · Fondateur ARC</div>
   TYPE: Nom du fondateur/pasteur
   IMPACT: Haute (visible page publique)
   ACTION: ⚠️  Configurable env: NEXT_PUBLIC_PASTOR_NAME

❌ FICHIER: src/api/copilot/route.ts
   LIGNE: ~30
   CODE: "Pasteur : Pedro Obova. " +
   TYPE: Système prompt IA
   IMPACT: Moyenne
   ACTION: ⚠️  Env var: NEXT_PUBLIC_PASTOR_NAME

❌ FICHIER: src/app/espace-membres/EspaceMembresClient.tsx
   LIGNE: ~2900
   CODE: placeholder="Ex : Pasteur Pedro Obova & l'équipe"
   TYPE: Texte exemple
   IMPACT: Basse


════════════════════════════════════════════════════════════════════════════

CATÉGORIE 4: CITATIONS & CONTENU ÉDITORIAL
═══════════════════════════════════════════

⚠️  FICHIER: src/app/connexion/page.tsx
   LIGNE: 103-104
   CODE: "Construisons des générations de disciples qui influencent positivement leur environnement."
   TYPE: Citation du Pasteur
   IMPACT: Basse
   NOTE: Contenu éditorial stable - peut rester en code, mais idéalement configurable


════════════════════════════════════════════════════════════════════════════

CATÉGORIE 5: ÉNUMÉRATIONS & RÔLES/FONCTIONS
═════════════════════════════════════════════

❌ FICHIER: src/app/espace-membres/crm/[id]/page.tsx
   LIGNE: ~100
   CODE: pasteur:"Pasteur",chorale:"Chorale",media:"Équipe Média",social:"Social & Hospitalité",
   TYPE: Mapping rôles → libellés
   IMPACT: Haute (utilisé dans l'UI)
   ACTION: ⚠️  Table oles en Supabase

❌ FICHIER: src/app/espace-membres/EspaceMembresClient.tsx
   LIGNE: ~110
   CODE: const GD_GROUP_LABELS: Record<string,string> = {
           admin:"Admin",
           pasteur:"Pasteur",
           media:"Média",
           chorale:"Chorale",
           jeunesse:"Jeunesse",
           femmes:"Femmes",
           social:"Social",
           hospitalite:"Hospit.",
           sanitaire:"Sanit.",
           finance:"Finance",
           ecodim:"Écodim",
           suivi:"Suivi",
           communication:"Comm.",
           support:"Support"
         };
   TYPE: Énumération complète des fonctions/groupes
   IMPACT: TRÈS HAUTE (15 rôles hardcodés)
   ACTION: 🔴 PRIORITÉ - Créer table oles en Supabase

❌ FICHIER: src/app/espace-membres/EspaceMembresClient.tsx
   LIGNE: ~150
   CODE: {name:"Pasteur", slug:"pasteur", count:0, hex:"#92400e", hexBg:"#fffbeb"},
   TYPE: Configuration de rôle avec couleurs
   IMPACT: TRÈS HAUTE
   ACTION: 🔴 PRIORITÉ - Stocker rôles + couleurs en BD


════════════════════════════════════════════════════════════════════════════

CATÉGORIE 6: MÉTADONNÉES SEO & BRANDING
════════════════════════════════════════

⚠️  FICHIER: src/app/layout.tsx
   LIGNE: ~15-20
   CODE: title: "ARC — Ambassade du Royaume de Christ · La Chaux-de-Fonds"
         description: "Une communauté évangélique vivante, fondée sur la Parole de Dieu, ouverte à toutes les nations. La Chaux-de-Fonds, Suisse."
   TYPE: Métadonnées SEO
   IMPACT: Basse
   NOTE: Texte stable - peut rester en code ou env var

⚠️  FICHIER: src/app/manifest.ts
   LIGNE: ~15
   CODE: description: "Site officiel de l'église ARC à La Chaux-de-Fonds"
   TYPE: Manifeste PWA
   IMPACT: Basse


════════════════════════════════════════════════════════════════════════════

ANALYSE: POURQUOI LE BLOC STATS N'A PAS ÉTÉ DÉTECTÉ INITIALEMENT
═══════════════════════════════════════════════════════════════════

1. 📍 LOCALISATION SPATIALE
   → Lignes 109-116 : en bas du composant, après beaucoup de contenu
   → Souvent moins scrutées lors d'une revue rapide

2. 🎭 PAS DE PATTERN NOMMÉ ÉVIDENT
   → Pas de constante: const STATS = [...]
   → Pas de composant isolé: <StatisticsBlock />
   → Juste: {[["250", "Membres"], ["32", "Nations"], ["6", "Ans"]].map(...)}
   → Facile à confondre avec du layout ordinaire

3. 👁️  RENDU CONDITIONNEL INVISIBLE
   → Code: className="hidden lg:flex" (desktop uniquement)
   → Si on développe/teste sur mobile, le bloc est invisible
   → Facile d'oublier ce qui est hidden

4. 🚫 ABSENCE DE NOMMAGE DESCRIPTIF
   → Pas de commentaire: /* Bloc de stats */
   → Juste du code JSX brut sans intention explicite
   → Dur à identifier par grep/recherche

5. ⏰ TIMING DU NETTOYAGE
   → Le précédent nettoyage a probablement utilisé grep sur des patterns spécifiques
   → Pattern: const ... = [...]; ou DATA_STATS = ... 
   → Mais PAS: {[...].map(...)} dans un JSX return


════════════════════════════════════════════════════════════════════════════

PLAN D'ACTION RECOMMANDÉ
═════════════════════════

🔴 CRITIQUE (à faire en premier):
   1. Table oles en Supabase avec:
      - id, slug, name, display_name, color_hex, color_bg, order
      - Remplacer GD_GROUP_LABELS et les mappings

🟡 HAUTE PRIORITÉ (semaine 1):
   2. Variable env: NEXT_PUBLIC_CHURCH_ADDRESS
   3. Variable env: NEXT_PUBLIC_PASTOR_NAME
   4. Table organization_stats (250 members, 32 nations)

🟢 MOYENNE PRIORITÉ (semaine 2):
   5. Table church_info avec: horaires cultes, adresse, contact, etc.
   6. Centraliser configuration site dans un fichier config.ts

🔵 BASSE PRIORITÉ (refactoring futur):
   7. Citations et descriptions → contentlayer ou CMS

════════════════════════════════════════════════════════════════════════════

CHECKLIST DE PRÉVENTION POUR L'AVENIR
══════════════════════════════════════

☐ Ajouter au workflow de revue: "Grep pour chiffres/dates/noms en dur"
☐ Ajouter au ESLint: règle custom pour détecter les [["...","..."]] patterns
☐ Documenter liste blanche: quelles données peuvent rester en dur (branding stable)
☐ Créer test: vérifier que stats ne sont jamais hardcodées
☐ Ajouter: commentaire explicite sur chaque constante locale (WHY elle n'est pas en BD)

════════════════════════════════════════════════════════════════════════════
