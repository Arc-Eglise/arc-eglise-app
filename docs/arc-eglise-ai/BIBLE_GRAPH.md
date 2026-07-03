# Bible Study Graph — Conception

> **Statut :** Document de conception — en attente de validation  
> **Date :** Juin 2026

---

## 1. Concept

Le **Bible Study Graph** est une visualisation interactive des connexions entre les passages bibliques, thèmes, personnages, lieux et événements. Il transforme la Bible en un réseau de connaissance explorable visuellement.

Objectif : permettre à l'utilisateur de voir **comment les passages se relient** entre eux, de naviguer par thème ou personnage, et de découvrir des connexions non évidentes.

---

## 2. Types de nœuds

| Type | Couleur suggérée | Exemples |
|------|-----------------|----------|
| `verse` | Bleu marine `#1e2464` | Jean 3:16, Genèse 1:1 |
| `book` | Bleu clair `#8899cc` | Jean, Genèse, Psaumes |
| `theme` | Or `#b45309` | Grâce, Foi, Rédemption, Alliance |
| `character` | Violet `#6b21a8` | Jésus, Abraham, David, Paul |
| `location` | Vert `#065f46` | Jérusalem, Éden, Galilée |
| `event` | Rouge `#991b1b` | La Création, L'Exode, La Crucifixion, La Pentecôte |
| `doctrine` | Gris `#374151` | Trinité, Salut, Eschatologie |

---

## 3. Types d'arêtes (connexions)

| Type | Signification | Exemple |
|------|--------------|---------|
| `crossref` | Référence croisée directe | Jean 3:16 → Romains 3:16 |
| `fulfillment` | Accomplissement de prophétie | Ésaïe 53 → Jean 19:28 |
| `theme` | Partage un thème | Jean 3:16 ↔ Éphésiens 2:8 (grâce/foi) |
| `character` | Même personnage | Abraham en Genèse ↔ Romains 4 |
| `location` | Même lieu | Jérusalem dans les Évangiles ↔ Actes |
| `type` | Typologie AT→NT | Agneau pascal → Christ agneau de Dieu |
| `timeline` | Séquence chronologique | Création → Chute → Promise → Exode → David → Christ |

---

## 4. Source des données

### 4.1 Références croisées
- Source principale : **Scripture.api.bible** (endpoint crossrefs)  
  `GET /bibles/{id}/verses/{verseId}/crossrefs`
- Complément : **OpenBible.info** cross-reference dataset (100 000+ références, domaine public)

### 4.2 Thèmes et personnages
- Générés et mis en cache par l'IA (via Lunziko Platform) lors de la première exploration
- Stockés dans `ai_response_cache` avec TTL 7 jours

### 4.3 Structure de données (côté client)

```typescript
interface GraphNode {
  id: string            // "JHN.3.16" | "theme:grace" | "char:jesus"
  label: string         // Texte affiché
  type: NodeType
  data: {
    ref?: string        // Pour type "verse"
    text?: string       // Extrait du verset
    description?: string
    testament?: "old" | "new"
    book?: string
  }
  x?: number            // Position calculée par D3
  y?: number
}

interface GraphEdge {
  id: string
  source: string        // node id
  target: string        // node id
  type: EdgeType
  label?: string
  weight: number        // 0.1 → 1.0 (force du lien)
}

interface GraphData {
  nodes: GraphNode[]
  edges: GraphEdge[]
  center: string        // Nœud central de la vue
  depth: number
}
```

---

## 5. Rendu — Technologie recommandée

### Option A : D3.js Force Graph (recommandé V1)
```typescript
// Pas de nouvelle dépendance npm — utiliser D3 via CDN ou import dynamique
import('d3').then(d3 => {
  // Force-directed graph
  const simulation = d3.forceSimulation(nodes)
    .force('link', d3.forceLink(edges).id(d => d.id).strength(d => d.weight))
    .force('charge', d3.forceManyBody().strength(-200))
    .force('center', d3.forceCenter(width/2, height/2))
    .force('collision', d3.forceCollide(30))
})
```

**Avantages :** Léger, flexible, pas de dépendance supplémentaire (D3 est déjà dans node_modules de nombreux projets), rendu SVG natif.

**Inconvénient :** Code plus verbeux.

### Option B : react-force-graph (alternative V2)
```bash
npm install react-force-graph
```
Plus simple à intégrer mais ajoute ~500Ko.

---

## 6. Composant React — Structure

```typescript
// src/components/bible-ai/StudyGraph.tsx
"use client"

interface StudyGraphProps {
  initialCenter?: string    // verset/thème/personnage initial
  onNodeClick?: (node: GraphNode) => void  // navigation vers le verset
  height?: number
}

export default function StudyGraph({ initialCenter, onNodeClick, height = 500 }: StudyGraphProps) {
  const [graphData, setGraphData] = useState<GraphData | null>(null)
  const [center, setCenter] = useState(initialCenter ?? 'JHN.3.16')
  const [depth, setDepth] = useState(2)
  const [filterType, setFilterType] = useState<NodeType[]>([])  // [] = tous
  const svgRef = useRef<SVGSVGElement>(null)

  // Charger depuis /api/bible-ai/graph
  useEffect(() => {
    fetch('/api/bible-ai/graph', {
      method: 'POST',
      body: JSON.stringify({ center, depth, type: filterType.join(',') || undefined })
    })
    .then(r => r.json())
    .then(setGraphData)
  }, [center, depth, filterType])

  // D3 rendering
  useEffect(() => {
    if (!graphData || !svgRef.current) return
    // ... D3 force graph code
  }, [graphData])

  return (
    <div className="relative bg-arc-navy/5 rounded-2xl overflow-hidden" style={{ height }}>
      {/* Contrôles */}
      <div className="absolute top-3 left-3 flex gap-2 z-10">
        <input placeholder="Verset, thème, personnage…" onChange={e => setCenter(e.target.value)} />
        <select value={depth} onChange={e => setDepth(+e.target.value)}>
          {[1,2,3].map(d => <option key={d} value={d}>{d} niveaux</option>)}
        </select>
      </div>
      {/* Légende */}
      <div className="absolute bottom-3 left-3 flex gap-2 flex-wrap z-10">
        {/* NodeType badges */}
      </div>
      {/* Graphe SVG */}
      <svg ref={svgRef} width="100%" height="100%" />
    </div>
  )
}
```

---

## 7. Interactions utilisateur

| Action | Comportement |
|--------|-------------|
| Clic sur un nœud `verse` | Ouvre le lecteur Bible sur ce verset |
| Clic sur un nœud `theme` | Recherche tous les versets de ce thème |
| Clic sur un nœud `character` | Liste tous les passages avec ce personnage |
| Double-clic sur n'importe quel nœud | Recentre le graphe sur ce nœud |
| Survol | Tooltip avec extrait de texte |
| Drag | Déplace le nœud (fixe sa position) |
| Molette | Zoom |
| Bouton "Explorer" | Lance une session de chat IA centrée sur ce nœud |

---

## 8. API Route — Logique de construction du graphe

```typescript
// POST /api/bible-ai/graph/route.ts

async function buildGraph(center: string, depth: number, type?: string) {
  const nodes: GraphNode[] = []
  const edges: GraphEdge[] = []

  // 1. Nœud central
  nodes.push(await resolveNode(center))

  // 2. Références croisées directes (Scripture.api.bible)
  if (depth >= 1) {
    const crossrefs = await fetchCrossrefs(center)  // max 15
    crossrefs.forEach(ref => {
      nodes.push(resolveVerseNode(ref))
      edges.push({ source: center, target: ref.id, type: 'crossref', weight: ref.relevance })
    })
  }

  // 3. Thèmes (via cache ou génération IA)
  if (depth >= 2) {
    const themes = await getThemesForVerse(center)  // via ai_response_cache ou lunzikoFetch
    themes.forEach(theme => {
      nodes.push({ id: `theme:${theme}`, label: theme, type: 'theme', data: {} })
      edges.push({ source: center, target: `theme:${theme}`, type: 'theme', weight: 0.7 })
      // Autres versets du même thème
      // ...
    })
  }

  // 4. Personnages et lieux (depth >= 3)
  // ...

  return { nodes: deduplicateNodes(nodes), edges: deduplicateEdges(edges), center, depth }
}
```

---

## 9. Performance

- **Limite de nœuds :** max 80 nœuds par vue (au-delà, performance D3 dégradée)
- **Cache :** Réponses IA cachées 7 jours dans `ai_response_cache`
- **Lazy loading :** Profondeurs 2 et 3 chargées en différé au clic
- **Debounce :** 500ms sur le champ de recherche du centre

---

## 10. Évolution V2

- Export du graphe en PNG/SVG
- Partage d'une vue de graphe (lien partageable)
- Graphe de progression personnelle (versets lus, notés, mémorisés)
- Timeline chronologique de la Bible
- Intégration avec `bible_bookmarks` (marquer des nœuds comme favoris)
