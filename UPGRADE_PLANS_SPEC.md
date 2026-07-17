# SPÉCIFICATION: Mise à niveau Plans de Lecture Biblique

## Résumé exécutif

Amélioration du système de plans de lecture biblique avec:
1. Trois types de plans (Chronologique, Thématique, Intégral)
2. Cinq méthodologies d'étude (Observation, Compréhension, Appropriation, Lectio Divina, Inductive)
3. Système de rattrapage flexible
4. Adaptation du rythme personnalisée

---

## Types de plans

### 1. Chronologique
**Description:** Textes lus dans l'ordre chronologique des événements historiques
**Exemple:** Job avant Exode, Rois avant Chroniques
**Prompt spécialisé:** Valider l'ordre chronologique des livres bibliques
**Use case:** Comprendre la progression historique

### 2. Thématique
**Description:** Passages concentrés sur un sujet précis
**Exemples de thèmes:** La Grâce, La Foi, Les Paraboles, L'Amour, La Prière
**Prompt spécialisé:** Sélectionner versets qui illustrent le thème (AT + NT)
**Use case:** Étude approfondie d'une doctrine ou sujet

### 3. Intégral ("Bible en un an")
**Description:** AT + Psaume + NT chaque jour
**Structure quotidienne:** 
- 1 passage Ancien Testament (2-3 chapitres)
- 1 Psaume ou passage sagesse
- 1 passage Nouveau Testament (2-3 chapitres)
**Use case:** Couvrir l'intégralité de la Bible avec variété

### 4. Personnalisé (défaut)
**Description:** Plan flexible, adaptable à l'utilisateur
**Use case:** Thème libre + équilibre AT/NT

---

## Méthodologies d'étude (3 étapes bibliques)

### Observation: "Que dit le texte?"
**Questions guidées:**
- Qui parle?
- À qui parle-t-il?
- Quel est le contexte historique/culturel?
- Quels sont les mots clés?
**Champ JSON:** observation

### Compréhension: "Quel est le contexte? Comment s'applique-t-il?"
**Questions guidées:**
- Quel est le contexte de l'époque?
- Quel est le message principal?
- Comment cela s'applique-t-il aujourd'hui?
- Y a-t-il des principes universels?
**Champ JSON:** comprehension

### Appropriation: "Comment cela parle-t-il à ma vie?"
**Questions guidées:**
- Comment ce passage parle-t-il à ma situation actuelle?
- Qu'est-ce que je veux retenir?
- Comment puis-je appliquer cela?
- Qu'est-ce que Dieu me dit?
**Champ JSON:** appropriation

### Bonus: Lectio Divina (4 étapes monastiques)
**Étapes:**
1. Lectio (Lecture): Lire le texte attentivement, lentement
2. Meditatio (Méditation): Réfléchir sur le sens, ruminer
3. Oratio (Prière): Répondre à Dieu, prier le texte
4. Contemplatio (Contemplation): Recevoir la Parole de Dieu

### Bonus: Inductive (3 phases)
**Phases:**
1. Observation: Que dit le texte? (Qui, quoi, quand, où, pourquoi)
2. Interprétation: Que signifie-t-il? (Contexte, culture, théologie)
3. Application: Comment s'applique-t-il à ma vie?

---

## Flexibilité et adaptation

### Rattrapage (Catch-up)
**Problème:** Utilisateur manque un jour de lecture
**Solution:**
- Tracker les jours manqués
- Offrir rattrapage optionnel
- Ne pas pénaliser la progression

**API:** GET /api/bible-ai/plans { action: "get_catch_up", plan_id }

**Réponse:**
{
  "missed_days": [2, 5, 8],
  "total_completed": 15,
  "total_days": 30,
  "completion_percentage": 50,
  "catch_up_enabled": true
}

### Rythme flexible (Flexible Pacing)
**Problème:** Utilisateur veut adapter le nombre de passages par jour
**Solution:**
- Permettre ajustement: 1, 2, 3, ou 4 passages par jour
- Recalculer la progression
- Persister la préférence

**API:** POST /api/bible-ai/plans { action: "adjust_pace", plan_id, new_daily_passages: 4 }

### Régularité
**Recommandation:** Fixer un créneau quotidien (matin, midi, soir)
**Support:** Notifications optionnelles rappelant le moment habituel

### Durée personnalisée
**Options:** 5min, 10min, 15min, 20min, 30min
**Calcul:** Adapte le nombre de passages par jour selon la durée

---

## Implémentation backend

### Nouvelles colonnes Supabase

#### Table ai_reading_plans
```sql
ALTER TABLE ai_reading_plans ADD COLUMN (
  plan_type VARCHAR DEFAULT 'personnalise',
  metadata JSONB DEFAULT '{}'
);
```

#### Table ai_reading_plan_days
```sql
ALTER TABLE ai_reading_plan_days ADD COLUMN (
  study_notes JSONB DEFAULT '{}'
);
```

### Exemple de données

**ai_reading_plans record:**
{
  id: "uuid-123",
  user_id: "user-uuid",
  title: "Plan chronologique",
  plan_type: "chronologique",
  duration_days: 365,
  metadata: {
    "plan_type": "chronologique",
    "study_methodology": "inductive",
    "catch_up_enabled": true,
    "flexible_pacing": true,
    "daily_duration_minutes": 20,
    "daily_passages": 3
  }
}

**ai_reading_plan_days record:**
{
  id: "uuid-day-1",
  plan_id: "uuid-123",
  day_number: 1,
  title: "Genèse et Job",
  passages: ["Genèse 1:1-31", "Job 1:1-22"],
  reflection: "Qu'observe-t-on sur la nature et la souffrance?",
  prayer_guide: "Prie pour comprendre l'ordre créé.",
  study_notes: {
    "observation": "Qui parle? Quel est le contexte?",
    "comprehension": "Comment cela s'applique-t-il?",
    "appropriation": "Que cela me dit-il?"
  }
}

---

## Actions API

### action: "create" (amélioré)

**Paramètres:**
{
  action: "create",
  title?: "Titre personnalisé",
  plan_type: "chronologique|thematique|integral|personnalise",
  study_methodology: "observation|comprehension|appropriation|lectio-divina|inductive",
  duration_days: 30,
  level: "enfant|debutant|intermediaire|avance|enseignant",
  language: "fr|en|es",
  focus?: "La Grâce" (pour thématique),
  catch_up_enabled: true,
  flexible_pacing: true,
  daily_duration_minutes?: 15,
  generate: true
}

### action: "list" (amélioré)

Retourne tous les plans avec metadata et plan_type

### action: "get_days" (amélioré)

Retourne jours avec study_notes

### action: "get_catch_up" (NOUVEAU)

**Paramètres:**
{
  action: "get_catch_up",
  plan_id: "uuid"
}

**Réponse:**
{
  missed_days: [2, 5, 8],
  total_completed: 15,
  total_days: 30,
  completion_percentage: 50,
  catch_up_enabled: true
}

### action: "adjust_pace" (NOUVEAU)

**Paramètres:**
{
  action: "adjust_pace",
  plan_id: "uuid",
  new_daily_passages: 4
}

---

## Prompts IA spécialisés

### Pour plan_type = "chronologique"
"Les textes doivent être lus dans l'ordre chronologique exact où les événements
historiques se sont déroulés. Exemple: Job avant Exode, Rois avant Chroniques.
Vérifier les dates et reordonner les livres bibliques en conséquence."

### Pour plan_type = "thematique"
"Tous les passages sélectionnés doivent traiter du thème: '[focus]'.
Choisir des versets de l'Ancien Testament ET Nouveau Testament qui illustrent
ce sujet de manière cohérente et progressive."

### Pour plan_type = "integral"
"Proposer chaque jour:
- 1 passage Ancien Testament (2-3 chapitres)
- 1 Psaume ou passage sagesse
- 1 passage Nouveau Testament (2-3 chapitres)
Cela crée une variété littéraire et couvre la Bible intégralement."

### Pour study_methodology = "observation"
"Ajouter champ 'observation' avec une question simple:
Qui parle? À qui? Quel est le contexte? Quels mots clés?"

### Pour study_methodology = "lectio-divina"
"Structurer chaque jour autour des 4 étapes Lectio Divina:
1. Lectio (Lecture attentive)
2. Meditatio (Méditation du sens)
3. Oratio (Prière-réaction)
4. Contemplatio (Recevoir la Parole)"

---

## Cas d'usage

### Cas 1: "Je veux lire la Bible en un an de manière équilibrée"
→ plan_type: "integral", duration_days: 365, study_methodology: "inductive"
→ Reçoit AT + Psaume + NT chaque jour
→ Méthodologie guidée: Observation → Interprétation → Application

### Cas 2: "Je veux étudier la Grâce en profondeur"
→ plan_type: "thematique", focus: "La Grâce", duration_days: 30
→ Tous les versets traitent de la Grâce (AT + NT)
→ Méthodologie: Lectio Divina pour contemplation

### Cas 3: "Je manque une journée, comment rattraper?"
→ GET /api/bible-ai/plans { action: "get_catch_up", plan_id }
→ Reçoit liste des jours manqués et % complété
→ Peut cliquer pour marquer rattrapage

### Cas 4: "C'est trop long, je veux adapter le rythme"
→ POST /api/bible-ai/plans { action: "adjust_pace", plan_id, new_daily_passages: 2 }
→ Plan recalculé avec 2 passages/jour au lieu de 3
→ Durée de 30 jours devient ~45 jours

---

## Checklist d'implémentation

Backend:
- [ ] Ajouter colonnes Supabase: plan_type, metadata, study_notes
- [ ] Mettre à jour POST create avec nouveaux paramètres
- [ ] Ajouter helpers buildPlanTitle, buildPlanSystemPrompt
- [ ] Implémenter action "get_catch_up"
- [ ] Implémenter action "adjust_pace"
- [ ] Mettre à jour action "list" et "get_days"
- [ ] Tester génération plans (chronologique, thématique, intégral)
- [ ] Tester méthodologies dans study_notes

Frontend:
- [ ] Sélecteur type de plan (dropdown)
- [ ] Sélecteur méthodologie (radio)
- [ ] Affichage study_notes (observation/compréhension/appropriation)
- [ ] Widget rattrapage (jours manqués + % complété)
- [ ] Slider ajusteur de rythme

---

## Améliorations futures

1. **Audio support:** Lectures bibliques audio structurées par plan
2. **Notifications:** Rappels quotidiens au moment préféré
3. **Partage:** Partager un plan de lecture avec un ami/groupe
4. **Progression visuelle:** Calendrier avec case à cocher
5. **Statistiques:** Temps de lecture total, versets favoris, thèmes explorés
6. **Export:** Exporter le plan en PDF/iCal
