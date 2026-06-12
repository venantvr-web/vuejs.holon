// src/composables/traits/useConnectable.ts
import { ref, type Ref } from 'vue'
import { useGraphStore } from '../../stores/graph'

/**
 * Options de configuration pour le trait Connectable.
 */
export interface ConnectableOptions {
  /**
   * Référence réactive vers l'ID du noeud concerné.
   */
  nodeId: Ref<string>
}

/**
 * État réactif exposé par le trait Connectable.
 */
export interface ConnectableState {
  /**
   * Indique si ce noeud est la source d'une connexion en cours.
   */
  isConnectionSource: Ref<boolean>
}

/**
 * Handlers (actions) exposés par le trait Connectable.
 */
export interface ConnectableHandlers {
  /**
   * Démarre une nouvelle connexion depuis ce noeud.
   */
  startConnection: () => void
  /**
   * Termine la connexion en cours vers un noeud cible.
   * @param targetId - ID du noeud cible
   */
  finishConnection: (targetId: string) => void
  /**
   * Annule la connexion en cours.
   */
  cancelConnection: () => void
}

// État global pour la connexion en cours (partagé entre tous les noeuds)
const globalConnectionSource = ref<string | null>(null)
const globalConnectionMode = ref(false)

/**
 * Trait permettant de créer des connexions (edges) entre noeuds de manière interactive.
 *
 * Gère l'état global de connexion partagé entre tous les noeuds pour permettre
 * la création d'edges par clic source puis clic cible.
 *
 * @param options - Configuration du trait
 * @returns État réactif et handlers pour la création de connexions
 *
 * @example
 * ```typescript
 * const { startConnection, finishConnection } = useConnectable({ nodeId: ref('node-123') });
 * startConnection(); // Démarre la connexion
 * // ... l'utilisateur clique sur le noeud cible
 * finishConnection('node-456'); // Crée l'edge
 * ```
 */
export function useConnectable(options: ConnectableOptions): ConnectableState &
  ConnectableHandlers & {
    connectionMode: Ref<boolean>
    connectionSource: Ref<string | null>
  } {
  const graphStore = useGraphStore()

  const isConnectionSource = ref(false)

  function startConnection() {
    globalConnectionMode.value = true
    globalConnectionSource.value = options.nodeId.value
    isConnectionSource.value = true
  }

  function finishConnection(targetId: string) {
    if (globalConnectionSource.value && globalConnectionSource.value !== targetId) {
      graphStore.createEdge(globalConnectionSource.value, targetId)
    }
    cancelConnection()
  }

  function cancelConnection() {
    globalConnectionMode.value = false
    globalConnectionSource.value = null
    isConnectionSource.value = false
  }

  return {
    isConnectionSource,
    connectionMode: globalConnectionMode,
    connectionSource: globalConnectionSource,
    startConnection,
    finishConnection,
    cancelConnection,
  }
}

// Export des états globaux pour le canvas
export function useConnectionState() {
  return {
    connectionMode: globalConnectionMode,
    connectionSource: globalConnectionSource,
    cancelConnection: () => {
      globalConnectionMode.value = false
      globalConnectionSource.value = null
    },
  }
}
