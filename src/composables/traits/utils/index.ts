// src/composables/traits/utils/index.ts
// Export centralisé de tous les utilitaires pour les traits

export {
  TraitError,
  ValidationError,
  StateError,
  NodeNotFoundError,
  EdgeNotFoundError,
  logError,
  withErrorHandling,
} from './errors'

export {
  createTraitComputedProperty,
  createTraitObjectProperty,
  nodeExists,
  getNodeOrThrow,
  getNodeAbsolutePosition,
  getNodeCenter,
  getNodeChildren,
  getNodeDescendants,
  isAncestorOf,
  getNodeDepth,
} from './trait-helpers'
