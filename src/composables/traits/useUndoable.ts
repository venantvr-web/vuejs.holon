// src/composables/traits/useUndoable.ts
import { ref, computed, watch, type Ref } from 'vue'
import { useGraphStore } from '../../stores/graph'
import type { Node, Edge } from '../../types'

/**
 * Clone profond « déproxifié » pour les snapshots.
 *
 * `structuredClone` est plus rapide mais lève `DataCloneError` sur les Proxy
 * réactifs de Vue (les `readonly()` exposés par le store). Le cycle JSON
 * matérialise les valeurs en objets natifs en un passage, ce qui est à la
 * fois sûr et suffisant : tous les champs de Node/Edge sont des primitives,
 * objets imbriqués ou tableaux JSON-compatibles.
 */
function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value))
}

/**
 * Options de configuration pour le trait Undoable.
 */
export interface UndoableOptions {
  /** Nombre maximum d'états conservés dans l'historique (défaut: 50) */
  maxHistory?: number
}

/**
 * État réactif géré par le trait Undoable.
 */
export interface UndoableState {
  /** Indique si une opération d'annulation est possible */
  canUndo: Ref<boolean>
  /** Indique si une opération de rétablissement est possible */
  canRedo: Ref<boolean>
  /** Nombre total d'états dans l'historique */
  historyLength: Ref<number>
  /** Index de l'état actuel dans l'historique */
  currentIndex: Ref<number>
}

/**
 * Gestionnaires d'actions fournis par le trait Undoable.
 */
export interface UndoableHandlers {
  /** Annule la dernière modification en restaurant l'état précédent */
  undo: () => void
  /** Rétablit la modification annulée suivante */
  redo: () => void
  /** Efface tout l'historique et crée un snapshot initial */
  clearHistory: () => void
  /** Crée un snapshot de l'état actuel du graphe */
  snapshot: () => void
}

interface GraphSnapshot {
  nodes: Record<string, Node>
  edges: Record<string, Edge>
  /**
   * Version `mutationVersion` du store au moment de la capture. Sert d'index
   * d'égalité pour éviter de pousser un snapshot identique au précédent
   * (cas typique : undo suivi d'un auto-snapshot débouncé).
   */
  version: number
  timestamp: number
}

// État global de l'historique
const history = ref<GraphSnapshot[]>([])
const currentIndex = ref(-1)
const isUndoRedoAction = ref(false)
const maxHistory = ref(50)

/**
 * Ajoute la capacité d'annulation et de rétablissement au graphe.
 *
 * Gère un historique global de snapshots du graphe complet (noeuds et arêtes)
 * permettant d'annuler et de rétablir les modifications avec une limite
 * configurable d'états conservés.
 *
 * @param options - Configuration du trait
 * @returns État réactif et gestionnaires pour l'undo/redo
 */
export function useUndoable(options: UndoableOptions = {}): UndoableState & UndoableHandlers {
  const graphStore = useGraphStore()

  if (options.maxHistory) {
    maxHistory.value = options.maxHistory
  }

  const canUndo = computed(() => currentIndex.value > 0)
  const canRedo = computed(() => currentIndex.value < history.value.length - 1)
  const historyLength = computed(() => history.value.length)

  // Crée un snapshot de l'état actuel
  function snapshot() {
    if (isUndoRedoAction.value) return

    const version = graphStore.mutationVersion

    // Idempotence : si la version du store n'a pas bougé depuis le snapshot
    // courant, l'état est strictement identique — pas la peine de cloner. Le
    // simple compteur évite la double sérialisation JSON utilisée auparavant
    // pour comparer.
    const current = history.value[currentIndex.value]
    if (current && current.version === version) return

    const snap: GraphSnapshot = {
      nodes: deepClone(graphStore.nodes as Record<string, Node>),
      edges: deepClone(graphStore.edges as Record<string, Edge>),
      version,
      timestamp: Date.now(),
    }

    // Si on est au milieu de l'historique, supprimer les états futurs
    if (currentIndex.value < history.value.length - 1) {
      history.value = history.value.slice(0, currentIndex.value + 1)
    }

    history.value.push(snap)

    // Limiter la taille de l'historique
    if (history.value.length > maxHistory.value) {
      history.value = history.value.slice(history.value.length - maxHistory.value)
    }

    currentIndex.value = history.value.length - 1
  }

  // Restaure un snapshot en préservant les IDs (crucial pour la cohérence
  // des références source/target des arêtes et des parentId).
  async function restoreSnapshot(snap: GraphSnapshot) {
    isUndoRedoAction.value = true

    try {
      await graphStore.replaceAll(snap.nodes, snap.edges)
    } finally {
      // Laisser passer le cycle de watch avant de réactiver l'auto-snapshot,
      // sinon replaceAll déclencherait un nouveau snapshot parasite.
      setTimeout(() => {
        isUndoRedoAction.value = false
      }, 0)
    }
  }

  function undo() {
    if (!canUndo.value) return

    currentIndex.value--
    const snap = history.value[currentIndex.value]
    if (snap) {
      restoreSnapshot(snap)
    }
  }

  function redo() {
    if (!canRedo.value) return

    currentIndex.value++
    const snap = history.value[currentIndex.value]
    if (snap) {
      restoreSnapshot(snap)
    }
  }

  function clearHistory() {
    history.value = []
    currentIndex.value = -1
    // Créer un snapshot initial
    snapshot()
  }

  return {
    canUndo,
    canRedo,
    historyLength,
    currentIndex: computed(() => currentIndex.value),
    undo,
    redo,
    clearHistory,
    snapshot,
  }
}

// Hook pour auto-snapshot sur les changements du store
export function useAutoSnapshot() {
  const graphStore = useGraphStore()
  const { snapshot } = useUndoable()
  let debounceTimer: ReturnType<typeof setTimeout> | null = null

  // Debounce les snapshots pour éviter d'en créer trop
  function debouncedSnapshot() {
    if (debounceTimer) {
      clearTimeout(debounceTimer)
    }
    debounceTimer = setTimeout(() => {
      snapshot()
    }, 500)
  }

  // Avant : `watch([nodes, edges], …, { deep: true })` faisait parcourir
  // récursivement tout le graphe à chaque mutation — O(n) pour un signal
  // binaire (« quelque chose a changé »). On écoute désormais le compteur
  // `mutationVersion` du store, incrémenté par chaque action mutante. Le
  // résultat est strictement équivalent et coûte O(1) par mutation.
  watch(
    () => graphStore.mutationVersion,
    () => {
      debouncedSnapshot()
    }
  )

  return { snapshot }
}

// Export de l'état global pour debug/UI
export function useUndoState() {
  return {
    history,
    currentIndex,
    isUndoRedoAction,
  }
}
