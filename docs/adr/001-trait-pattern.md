# ADR-001 : Pattern des Traits (Composables)

**Date** : 2026-04-16
**Statut** : Accepté
**Décideurs** : Équipe Architecture
**Contexte** : Projet Holon - Éditeur de modélisation d'architectures

---

## Contexte et Problématique

Le projet Holon nécessite une architecture extensible pour ajouter des comportements aux nœuds et arêtes du graphe de manière modulaire. Les fonctionnalités doivent être :

- **Composables** : Combinables librement sans dépendances rigides
- **Réutilisables** : Un même comportement applicable à différents types de nœuds
- **Testables** : Chaque comportement isolé et facilement testable
- **Maintenables** : Code organisé, prévisible et documenté

### Options Considérées

1. **Héritage de classes** : Classes `Node` et sous-classes `EditableNode`, `DraggableNode`, etc.
2. **Mixins Vue 2** : Mixins Vue classiques avec risques de collisions de noms
3. **Composables Vue 3** : Composition API avec fonctions réutilisables
4. **Système de plugins** : Architecture à base de plugins enregistrés

---

## Décision

**Nous adoptons le pattern Composables (Trait Pattern) avec une structure standardisée.**

Chaque comportement est encapsulé dans un composable Vue 3 qui suit une structure en trois parties :

### Structure Standardisée

```typescript
// 1. Interfaces de Configuration
export interface TraitOptions {
  nodeId: Ref<string>;
  // Options spécifiques au trait...
}

// 2. État Exposé
export interface TraitState {
  property: Ref<T>;
  // Propriétés réactives...
}

// 3. Actions/Handlers
export interface TraitHandlers {
  doSomething: () => void;
  // Fonctions d'action...
}

// 4. Fonction Composable
export function useTrait(options: TraitOptions): TraitState & TraitHandlers {
  const graphStore = useGraphStore();

  // Computed properties pour la réactivité
  const property = computed({
    get: () => graphStore.nodes[options.nodeId.value]?.data?.property,
    set: (value) => {
      const node = graphStore.nodes[options.nodeId.value];
      graphStore.updateNode(options.nodeId.value, {
        data: { ...node.data, property: value }
      });
    }
  });

  // Handlers (fonctions)
  function doSomething() {
    // Logique...
  }

  // Retour unifié : État + Handlers
  return {
    property,
    doSomething
  };
}
```

### Principes du Pattern

1. **Séparation Options/State/Handlers** : Structure claire et prévisible
2. **Computed Properties** : Réactivité bidirectionnelle pour l'état
3. **Accès via graphStore** : Source unique de vérité (Single Source of Truth)
4. **Retour unifié** : `{ ...state, ...handlers }` pour simplicité d'usage
5. **TypeScript strict** : Typage complet pour sécurité et auto-complétion

---

## Rationale

### Avantages du Pattern Choisi

✅ **Composition > Héritage**
- Évite les problèmes de hiérarchies de classes complexes
- Flexibilité totale : combiner N traits sans limites

✅ **Réactivité Native Vue 3**
- Computed properties intégrées naturellement
- Pas de gestion manuelle de watchers

✅ **Isolation et Testabilité**
- Chaque trait est une fonction pure
- Mocks simples du graphStore pour tests unitaires

✅ **Extensibilité**
- Ajouter un nouveau trait = créer un nouveau fichier
- Pas de modification du code existant (Open/Closed Principle)

✅ **Cohérence du Codebase**
- Pattern répété 28 fois → équipe productive instantanément
- Code review facilité par la structure prévisible

✅ **Performance**
- Computed properties memoized par Vue
- Pas de re-calculs inutiles

### Compromis et Limitations

⚠️ **Duplication potentielle**
- Pattern répété peut créer du boilerplate
- **Mitigation** : Helpers `createTraitComputedProperty()` (v2)

⚠️ **Dépendance au graphStore**
- Tous les traits dépendent du store Pinia
- **Mitigation** : Architecture acceptée, cohérence garantie

⚠️ **Pas de garanties de type pour node.data**
- `node.data` est `Record<string, any>` flexible mais non typé
- **Mitigation** : Validation à l'exécution, types utilitaires (ADR-002)

---

## Exemples d'Utilisation

### Trait Simple (useEditable)

```typescript
const { isEditing, displayValue, startEditing, commitEdit } = useEditable({
  nodeId: ref('node-123'),
  field: 'name'
});

// Double-clic pour éditer
<div @dblclick="startEditing">{{ displayValue }}</div>

// Input d'édition
<input v-if="isEditing" v-model="editValue" @blur="commitEdit" />
```

### Composition de Traits

```typescript
// Dans NodeRenderer.vue
const nodeIdRef = ref(props.node.id);

const editable = useEditable({ nodeId: nodeIdRef });
const draggable = useDraggable({ nodeId: nodeIdRef, zoomLevel });
const resizable = useResizable({ nodeId: nodeIdRef });
const styleable = useStyleable({ nodeId: nodeIdRef });

// Tous les traits fonctionnent ensemble sans interférence
```

---

## Conséquences

### Positives

- ✅ 28 traits implémentés avec succès en suivant ce pattern
- ✅ Codebase cohérent et facile à naviguer
- ✅ Nouveaux développeurs productifs rapidement
- ✅ Tests unitaires simples et rapides
- ✅ Zéro régression lors de l'ajout de nouveaux traits

### Négatives

- ⚠️ Nécessite discipline pour respecter le pattern
- ⚠️ Documentation essentielle pour éviter déviations

### Neutres

- 📊 Nombre de fichiers élevé (28+ traits) mais organisation claire
- 📊 Export centralisé dans `index.ts` compense la dispersion

---

## Alternatives Rejetées

### 1. Héritage de Classes

**Pourquoi rejeté** :
- Hiérarchie rigide : difficile de combiner `Editable + Draggable + Resizable`
- Problème du diamant (multiple inheritance)
- Moins idiomatique en Vue 3

### 2. Mixins Vue 2

**Pourquoi rejeté** :
- Collisions de noms (plusieurs mixins avec `data()` similaires)
- Ordre d'application non évident
- Pattern obsolète en Vue 3

### 3. Système de Plugins

**Pourquoi rejeté** :
- Complexité excessive pour le besoin
- Overhead de registration/lifecycle
- Moins transparent (magie cachée)

---

## Validation et Mesures de Succès

### Critères de Conformité

Un trait est conforme s'il :
- ✅ Exporte 3 interfaces : `Options`, `State`, `Handlers`
- ✅ Fonction principale nommée `useTrait()`
- ✅ Utilise `graphStore` comme source d'état
- ✅ Retourne `{ ...state, ...handlers }`
- ✅ Computed properties pour propriétés réactives

### Métriques

- **Couverture de tests** : Objectif 85%+ par trait
- **Duplication de code** : < 5% entre traits (DRY)
- **Lignes moyennes** : 100-300 lignes par trait (indication de complexité)

---

## Évolution Future

### Améliorations Planifiées

1. **Helpers de création** (v1.1)
   - `createTraitComputedProperty<T>()` pour réduire boilerplate
   - `withErrorHandling()` wrapper automatique

2. **Types Génériques** (v1.2)
   - `TraitOptions<T>`, `TraitState<T>`, `TraitHandlers<T>`
   - Amélioration du type-checking

3. **Composition Automatique** (v2.0)
   - `useNodeTraits(nodeId, ['editable', 'draggable', 'resizable'])`
   - Activation déclarative de multiples traits

---

## Références

- [Vue 3 Composition API](https://vuejs.org/guide/extras/composition-api-faq.html)
- [Composition vs Inheritance](https://en.wikipedia.org/wiki/Composition_over_inheritance)
- [Martin Fowler - Mixin](https://martinfowler.com/bliki/Mixin.html)
- Codebase : `/src/composables/traits/` (28 exemples)

---

## Historique

| Version | Date | Changement |
|---------|------|------------|
| 1.0 | 2026-04-16 | Version initiale - Pattern établi |
