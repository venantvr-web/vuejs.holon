# ADR-002 : Stratégie de Gestion d'Erreurs

**Date** : 2026-04-16
**Statut** : Accepté
**Décideurs** : Équipe Architecture
**Contexte** : Projet Holon - Gestion robuste des erreurs

---

## Contexte et Problématique

L'application Holon manipule des graphes complexes avec des opérations potentiellement risquées :

- Accès à des nœuds/arêtes inexistants
- Modifications d'état invalides
- Opérations sur des données corrompues
- Violations de contraintes (Archimate, hiérarchie, etc.)

### Problèmes à Résoudre

1. **Cohérence** : Comment gérer les erreurs de manière uniforme ?
2. **Visibilité** : Comment aider au debugging en développement ?
3. **Production** : Comment éviter de polluer la console en production ?
4. **Récupération** : Comment permettre à l'application de récupérer gracieusement ?

### Options Considérées

1. **Console.error() ad-hoc** : Logging manuel dispersé dans le code
2. **Try/catch systématique** : Enrober toutes les fonctions de try/catch
3. **Classes d'erreurs typées + Logger centralisé** : Approche structurée
4. **Error Boundaries Vue** : Composants d'erreur pour capture UI

---

## Décision

**Nous adoptons une stratégie hybride avec classes d'erreurs typées et logging centralisé.**

### Hiérarchie des Erreurs

```typescript
TraitError (classe de base)
├── ValidationError (données invalides)
├── StateError (opération dans état invalide)
├── NodeNotFoundError (nœud manquant)
└── EdgeNotFoundError (arête manquante)
```

### Logger Centralisé

```typescript
function logError(error: Error, context?: string): void {
  if (import.meta.env.DEV) {
    // Développement : affichage complet
    console.error(`[${context}]`, error);
  }
  // Production : envoi à service de monitoring (optionnel)
  // if (import.meta.env.PROD) {
  //   sentryClient.captureException(error);
  // }
}
```

### Wrapper d'Error Handling

```typescript
function withErrorHandling<T extends Function>(
  fn: T,
  context?: string
): T {
  return ((...args) => {
    try {
      const result = fn(...args);
      // Support async
      if (result instanceof Promise) {
        return result.catch(error => {
          logError(error, context);
          throw error;
        });
      }
      return result;
    } catch (error) {
      logError(error, context);
      throw error;
    }
  }) as T;
}
```

---

## Rationale

### Avantages

✅ **Typage Fort**
- `instanceof NodeNotFoundError` pour gestion spécifique
- Propriétés typées (ex: `error.nodeId`)

✅ **Debugging Facilité**
- Stack trace préservée avec `Error.captureStackTrace`
- Context optionnel pour traçabilité

✅ **Séparation Dev/Prod**
- Console verbose en dev
- Silencieux en prod (optionnel monitoring)

✅ **Extensibilité**
- Ajout facile de nouvelles classes d'erreurs
- Intégration future avec Sentry/LogRocket triviale

✅ **Pas de Boilerplate Excessif**
- `withErrorHandling()` wrapper réutilisable
- Pas de try/catch à chaque fonction

### Compromis

⚠️ **Pas d'Error Boundaries**
- Vue 3 n'a pas de mécanisme natif équivalent à React
- **Mitigation** : Utiliser `onErrorCaptured` dans composants racines si nécessaire

⚠️ **Logging Synchrone**
- `console.error` peut bloquer le thread principal
- **Mitigation** : Impact négligeable en développement, désactivé en prod

---

## Principes de Gestion d'Erreurs

### 1. Fail Fast

Les erreurs critiques doivent être levées immédiatement :

```typescript
function getNodeOrThrow(nodeId: string): Node {
  const node = graphStore.nodes[nodeId];
  if (!node) {
    throw new NodeNotFoundError(nodeId);
  }
  return node;
}
```

**Raison** : Détection précoce des bugs, évite états incohérents.

### 2. Fail Safe pour UI

Les computed properties doivent retourner des valeurs par défaut sûres :

```typescript
const displayValue = computed(() => {
  const node = graphStore.nodes[nodeId.value];
  if (!node) return ''; // Pas d'exception, valeur par défaut
  return node.data.name || node.id.substring(0, 8);
});
```

**Raison** : L'UI reste fonctionnelle même si données manquantes.

### 3. Log Context-Rich

Toujours fournir un contexte lors du logging :

```typescript
// ❌ Mauvais
logError(error);

// ✅ Bon
logError(error, 'useDraggable.handleMouseMove');
```

**Raison** : Facilite le debugging en identifiant l'origine exacte.

### 4. Ne Pas Silencer

Jamais de `catch {}` vide sans raison valable :

```typescript
// ❌ Mauvais
try {
  await someOperation();
} catch {}

// ✅ Bon
try {
  await someOperation();
} catch (error) {
  logError(error, 'someOperation');
  // Décider de re-throw ou non selon le cas
}
```

---

## Exemples d'Utilisation

### Cas 1 : Validation de Données

```typescript
export class ValidationError extends TraitError {
  constructor(message: string, public field?: string, public value?: unknown) {
    super(message);
    this.name = 'ValidationError';
  }
}

function setArchimateType(type: ArchimateType) {
  if (!isValidType(type)) {
    throw new ValidationError(
      `Invalid Archimate type: ${type}`,
      'archimateType',
      type
    );
  }
  // ...
}

// Utilisation
try {
  setArchimateType('invalid-type');
} catch (error) {
  if (error instanceof ValidationError) {
    console.warn(`Validation failed for field ${error.field}: ${error.message}`);
  }
}
```

### Cas 2 : État Invalide

```typescript
function commitEdit() {
  if (!isEditing.value) {
    throw new StateError(
      'Cannot commit edit when not editing',
      'idle',
      'editing'
    );
  }
  // ...
}
```

### Cas 3 : Handler avec Error Handling Automatique

```typescript
const handleMouseMove = withErrorHandling((event: MouseEvent) => {
  const node = getNodeOrThrow(nodeId.value);
  // ... logique de drag
}, 'useDraggable.handleMouseMove');

// Erreurs automatiquement loggées avec contexte
```

---

## Gestion Spécifique par Type

### Erreurs de Validation

**Stratégie** : Afficher à l'utilisateur, ne pas crasher

```typescript
catch (error) {
  if (error instanceof ValidationError) {
    showToast(`Validation error: ${error.message}`, 'warning');
    return; // Ne pas re-throw
  }
  throw error;
}
```

### Erreurs d'État

**Stratégie** : Logger et ignorer ou réinitialiser

```typescript
catch (error) {
  if (error instanceof StateError) {
    logError(error, context);
    resetState(); // Récupération gracieuse
    return;
  }
  throw error;
}
```

### Erreurs de Nœud/Arête Manquant

**Stratégie** : Nettoyer références invalides

```typescript
catch (error) {
  if (error instanceof NodeNotFoundError) {
    logError(error, 'deleteEdgesForNode');
    // Supprimer arêtes orphelines
    cleanupOrphanedEdges();
  }
}
```

---

## Intégration Future avec Monitoring

### Sentry (Exemple)

```typescript
// Ajouter dans logError()
if (import.meta.env.PROD && window.Sentry) {
  window.Sentry.captureException(error, {
    tags: { context },
    level: error instanceof ValidationError ? 'warning' : 'error'
  });
}
```

### Métriques Personnalisées

```typescript
// Tracking des types d'erreurs
const errorMetrics = ref<Record<string, number>>({});

function logError(error: Error, context?: string): void {
  errorMetrics.value[error.name] = (errorMetrics.value[error.name] || 0) + 1;
  // ... logging normal
}
```

---

## Testing

### Test des Erreurs

```typescript
it('should throw NodeNotFoundError for invalid node', () => {
  expect(() => {
    getNodeOrThrow('non-existent-id');
  }).toThrow(NodeNotFoundError);
});

it('should log error with context', () => {
  const consoleSpy = vi.spyOn(console, 'error');
  logError(new Error('test'), 'test-context');
  expect(consoleSpy).toHaveBeenCalledWith('[test-context]', expect.any(Error));
});
```

---

## Alternatives Rejetées

### 1. Console.error() Ad-Hoc

**Pourquoi rejeté** :
- Incohérence : chaque développeur fait à sa façon
- Pas de typage : impossible de différencier types d'erreurs
- Production : impossible de désactiver facilement

### 2. Try/Catch Partout

**Pourquoi rejeté** :
- Boilerplate excessif
- Masque potentiellement les vrais bugs
- Performance dégradée (V8 dé-optimise try/catch)

### 3. Error Boundaries Seulement

**Pourquoi rejeté** :
- Vue 3 n'a pas de mécanisme natif complet
- Capture seulement erreurs de rendu
- Ne capture pas erreurs asynchrones

---

## Métriques de Succès

- ✅ Zéro `console.error` sauvage (hors logError)
- ✅ Toutes les erreurs levées sont des instances de `TraitError`
- ✅ 100% des handlers critiques utilisent `withErrorHandling()` ou try/catch explicite
- ✅ Aucune erreur non catchée en production (monitoring)

---

## Évolution Future

### v1.1 - Toast/Notifications

Intégrer système de notification utilisateur :

```typescript
function logError(error: Error, context?: string): void {
  // ... logging normal
  if (error instanceof ValidationError) {
    showToast(error.message, 'error');
  }
}
```

### v1.2 - Error Recovery

Stratégies de récupération automatique :

```typescript
function withAutoRecovery(fn: Function, recoveryFn: Function) {
  return (...args) => {
    try {
      return fn(...args);
    } catch (error) {
      logError(error);
      return recoveryFn(error);
    }
  };
}
```

### v2.0 - Offline Error Queue

En mode offline, queue les erreurs et envoie lors de reconnexion :

```typescript
const errorQueue = [];

function logError(error: Error, context?: string): void {
  if (!navigator.onLine) {
    errorQueue.push({ error, context, timestamp: Date.now() });
  } else {
    sendToMonitoring(error, context);
  }
}
```

---

## Références

- [MDN - Error](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Error)
- [Error Handling Best Practices](https://www.joyent.com/node-js/production/design/errors)
- Codebase : `/src/composables/traits/utils/errors.ts`

---

## Historique

| Version | Date | Changement |
|---------|------|------------|
| 1.0 | 2026-04-16 | Version initiale |
