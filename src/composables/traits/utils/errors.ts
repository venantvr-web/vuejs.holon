// src/composables/traits/utils/errors.ts

/**
 * Erreur de base pour tous les traits.
 * Utilisée pour signaler des problèmes lors de l'utilisation des traits.
 */
export class TraitError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'TraitError'

    // Maintient la stack trace correcte pour V8
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, TraitError)
    }
  }
}

/**
 * Erreur de validation levée quand les données ne respectent pas les contraintes.
 */
export class ValidationError extends TraitError {
  public readonly field?: string
  public readonly value?: unknown

  constructor(message: string, field?: string, value?: unknown) {
    super(message)
    this.name = 'ValidationError'
    this.field = field
    this.value = value
  }
}

/**
 * Erreur d'état levée quand une opération est tentée dans un état invalide.
 */
export class StateError extends TraitError {
  public readonly currentState?: string
  public readonly expectedState?: string

  constructor(message: string, currentState?: string, expectedState?: string) {
    super(message)
    this.name = 'StateError'
    this.currentState = currentState
    this.expectedState = expectedState
  }
}

/**
 * Erreur de noeud manquant levée quand un noeud référencé n'existe pas.
 */
export class NodeNotFoundError extends TraitError {
  public readonly nodeId: string

  constructor(nodeId: string) {
    super(`Node with ID "${nodeId}" not found`)
    this.name = 'NodeNotFoundError'
    this.nodeId = nodeId
  }
}

/**
 * Erreur d'arête manquante levée quand une arête référencée n'existe pas.
 */
export class EdgeNotFoundError extends TraitError {
  public readonly edgeId: string

  constructor(edgeId: string) {
    super(`Edge with ID "${edgeId}" not found`)
    this.name = 'EdgeNotFoundError'
    this.edgeId = edgeId
  }
}

/**
 * Logger d'erreurs avec support développement/production.
 * En développement : affiche l'erreur complète dans la console
 * En production : silencieux, peut être connecté à un service de monitoring
 */
export function logError(error: Error, context?: string): void {
  if (import.meta.env.DEV) {
    if (context) {
      console.error(`[${context}]`, error)
    } else {
      console.error(error)
    }
  }
  // En production, on pourrait envoyer à Sentry, LogRocket, etc.
  // if (import.meta.env.PROD) {
  //   sentryClient.captureException(error, { tags: { context } });
  // }
}

/**
 * Wrapper pour ajouter une gestion d'erreur automatique à une fonction.
 * Capture les erreurs, les log, et les re-lance.
 */
export function withErrorHandling<T extends (...args: any[]) => any>(fn: T, context?: string): T {
  return ((...args: Parameters<T>): ReturnType<T> => {
    try {
      const result = fn(...args)

      // Gestion des promesses
      if (result instanceof Promise) {
        return result.catch((error) => {
          logError(error, context)
          throw error
        }) as ReturnType<T>
      }

      return result
    } catch (error) {
      logError(error as Error, context)
      throw error
    }
  }) as T
}
