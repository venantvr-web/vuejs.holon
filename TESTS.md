# Tests - Holon Architecture Modeler

## Configuration

- **Framework** : Vitest
- **Environnement** : happy-dom
- **Utilitaires** : @vue/test-utils

## Lancer les tests

```bash
# Mode watch (développement)
npm run test

# Exécution unique
npm run test:run
```

## Structure des tests

```
src/composables/traits/__tests__/
├── useResizable.test.ts    # 11 tests - Autosize et redimensionnement
├── useAnchorable.test.ts   # 12 tests - Points d'ancrage et intersection
├── useDraggable.test.ts    #  7 tests - Déplacement et notification parent
└── useRoutable.test.ts     # 12 tests - Calcul des routes d'edges
```

## Tests par fichier

### useResizable.test.ts (11 tests)

Tests de la fonctionnalité d'autosize qui permet aux parents d'englober automatiquement leurs enfants.

| Test | Description |
|------|-------------|
| `calculateChildrenBounds` - null sans enfants | Vérifie que bounds est null si pas d'enfants |
| `calculateChildrenBounds` - 1 enfant | Calcul correct des limites pour un seul enfant |
| `calculateChildrenBounds` - plusieurs enfants | Calcul min/max correct pour N enfants |
| `calculateChildrenBounds` - coordonnées négatives | Gère les enfants positionnés en négatif |
| `applyAutosize` - redimensionnement | Le parent se redimensionne avec le padding |
| `applyAutosize` - décalage enfants | Les enfants sont décalés pour respecter le padding |
| `applyAutosize` - positions relatives | Les positions relatives entre enfants sont préservées |
| `applyAutosize` - coordonnées négatives | Repositionnement correct des enfants en négatif |
| `applyAutosize` - désactivé | Ne fait rien si autosize=false |
| `effectivePadding` - zoom | Le padding s'ajuste selon le niveau de zoom |
| `fitToChildren` | Force l'autosize même si désactivé |

### useAnchorable.test.ts (12 tests)

Tests des points d'ancrage et du calcul d'intersection avec les bords des noeuds.

| Test | Description |
|------|-------------|
| `getNodeCenter` - noeud simple | Calcul du centre d'un noeud racine |
| `getNodeCenter` - noeud enfant | Position absolue en tenant compte du parent |
| `getNodeCenter` - hiérarchie profonde | Accumulation correcte sur plusieurs niveaux |
| `calculateEdgeIntersection` - bord droit | Intersection sur le bord droit |
| `calculateEdgeIntersection` - bord gauche | Intersection sur le bord gauche |
| `calculateEdgeIntersection` - bord haut | Intersection sur le bord haut |
| `calculateEdgeIntersection` - bord bas | Intersection sur le bord bas |
| `calculateEdgeIntersection` - diagonale | Intersection en coin (45°) |
| `calculateEdgeIntersection` - centre | Retourne le centre si cible = centre |
| Composable - 9 points d'ancrage | Tous les points cardinaux + centre |
| Composable - ancre la plus proche | Trouve l'ancre la plus proche d'un point |
| Composable - getAnchorPoint | Retourne le bon point pour une position |

### useDraggable.test.ts (7 tests)

Tests du déplacement des noeuds et de la notification automatique au parent.

| Test | Description |
|------|-------------|
| `handleDragStart` - initialisation | Configure correctement l'état de drag |
| `handleDragStart` - ignore clic droit | Seul le clic gauche démarre le drag |
| `handleDragStart` - callback | Appelle onDragStart si fourni |
| `notifyParentAutosize` - enfant | Émet child-moved pour un enfant |
| `notifyParentAutosize` - racine | Pas d'événement pour un noeud racine |
| `notifyParentAutosize` - désactivé | Pas d'événement si notifyParentOnMove=false |
| Zoom level | Le déplacement s'ajuste selon le zoom |

### useRoutable.test.ts (12 tests)

Tests du calcul des routes d'edges avec différents types de routage.

| Test | Description |
|------|-------------|
| `calculateArrowAngle` - droite | Angle 0° vers la droite |
| `calculateArrowAngle` - bas | Angle 90° vers le bas |
| `calculateArrowAngle` - gauche | Angle 180° vers la gauche |
| `calculateArrowAngle` - haut | Angle -90° vers le haut |
| `calculateArrowAngle` - diagonale | Angle 45° en diagonale |
| `calculateEdgeRoute` - Straight | Path M...L pour ligne droite |
| `calculateEdgeRoute` - Orthogonal | Path avec H et V |
| `calculateEdgeRoute` - Curved | Path avec Q (quadratique) |
| `calculateEdgeRoute` - Bezier | Path avec C (cubique) |
| `calculateEdgeRoute` - source inexistant | Retourne null |
| `calculateEdgeRoute` - target inexistant | Retourne null |
| Noeuds imbriqués | Calcul correct des intersections pour enfants |

## Mock de la base de données

Tous les tests mockent la base de données Dexie pour éviter les effets de bord :

```typescript
vi.mock('../../../db', () => ({
  db: {
    nodes: {
      put: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      clear: vi.fn(),
      toArray: vi.fn().mockResolvedValue([]),
    },
    edges: {
      put: vi.fn(),
      delete: vi.fn(),
      clear: vi.fn(),
      toArray: vi.fn().mockResolvedValue([]),
    },
  },
}));
```

## Événements personnalisés testés

### child-moved

Événement émis par `useDraggable` quand un enfant est déplacé :

```typescript
window.dispatchEvent(new CustomEvent('child-moved', {
  detail: {
    childId: string,
    parentId: string,
  }
}));
```

Écouté par `useResizable` pour déclencher l'autosize.

## Couverture actuelle

| Catégorie | Tests | Status |
|-----------|-------|--------|
| Autosize (useResizable) | 11 | ✅ |
| Ancrage (useAnchorable) | 12 | ✅ |
| Drag (useDraggable) | 7 | ✅ |
| Routage (useRoutable) | 12 | ✅ |
| **Total** | **42** | ✅ |

## Ajouter des tests

1. Créer un fichier `useTrait.test.ts` dans `__tests__/`
2. Importer et mocker la base de données
3. Utiliser `setActivePinia(createPinia())` dans `beforeEach`
4. Créer les noeuds/edges via `graphStore.createNode()` / `createEdge()`
5. Tester les fonctions du composable
