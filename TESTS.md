# Tests — Holon Architecture Modeler

## Configuration

- **Framework** : Vitest 4.
- **Environnement** : happy-dom.
- **Utilitaires de composants** : `@vue/test-utils`.
- **Couverture** : `@vitest/coverage-v8`, rapports `text`, `html` et `lcov`.

## Lancer les tests

```bash
# Mode watch (développement)
npm run test

# Exécution unique en CI
npm run test:run

# Avec couverture (rapport html dans ./coverage)
npm run test:coverage
```

## Organisation

Les tests vivent à côté du code dans des dossiers `__tests__/`. Par convention,
on garde un fichier de test par composable ou utilitaire :

- `src/composables/__tests__/` — composables hors trait (`useGeometry`,
  `useViewport`).
- `src/composables/traits/__tests__/` — un fichier par trait testé
  (`useResizable`, `useAnchorable`, `useDraggable`, `useRoutable`,
  `useUndoable`, `useImportable`, `useFilterable`, `useClipboardable`,
  `useSelectable`, `useConnectable`, `useValidatable`, `useExportable`,
  `useFocusable`, `useBackupable`, `filter-dsl`).
- `src/composables/traits/utils/__tests__/` — utilitaires bas niveau
  (`position-cache`).
- `src/stores/__tests__/` — store Pinia central (`graph.spec.ts`).

## Conventions

1. Stub Dexie : toutes les opérations base de données sont mockées via
   `vi.mock('../../../db', …)` pour éviter les effets de bord. Le mock retourne
   des méthodes `put`, `delete`, `clear`, `bulkPut`, `toArray`, `update` et
   un `transaction` qui exécute la fonction passée.
2. Réinitialisation Pinia à chaque test : `setActivePinia(createPinia())`
   dans `beforeEach`.
3. Construction du graphe via `store.importNode` et `store.importEdge` plutôt
   que `createNode`, pour préserver les identifiants et faciliter les
   assertions.
4. Les états module-level partagés (sélection, focus, mode connexion,
   filtres) doivent être réinitialisés explicitement entre les tests pour
   éviter les fuites.

## Tests asynchrones et rAF

`useDraggable` et `Minimap` utilisent `requestAnimationFrame` pour throttler
les évènements pointeur. Les tests doivent attendre une frame avant
d'observer les effets sur le store :

```typescript
await new Promise((resolve) => requestAnimationFrame(() => resolve(null)))
```

Pour les animations longues (`fitWorldBox`, `resetView`, `animateViewport`),
soit on attend la durée nominale (`await new Promise(r => setTimeout(r, 400))`),
soit on appelle l'API avec `animate = false`.

## Évènements personnalisés testés

### `child-moved`

Émis par `useDraggable` quand un enfant change de position. Écouté par
`useResizable` pour déclencher l'autosize du parent.

```typescript
window.dispatchEvent(
  new CustomEvent('child-moved', {
    detail: { childId: string, parentId: string },
  })
)
```

### `node-focused`

Émis par `useFocusable` lors d'un changement de focus (Tab, flèches, focus
programmatique). Permet aux composants extérieurs (Minimap, breadcrumb) de
recadrer le viewport sur le noeud focalisé.

## Ajouter un test

1. Créer un fichier `useMonTrait.spec.ts` dans le dossier `__tests__/` adapté.
2. Recopier le bloc `vi.mock('../../../db', …)` standard.
3. Importer le trait, `setActivePinia` dans `beforeEach`, construire un
   graphe minimal via `store.importNode` / `store.importEdge`.
4. Pour chaque cas testé, écrire un `it('comportement attendu', …)` court et
   précis, avec une seule assertion principale quand c'est possible.
5. Si l'état du trait est module-level, ajouter une réinitialisation
   explicite en `beforeEach`.
