// src/composables/traits/useUndoable.ts
import { ref, computed, watch, type Ref } from 'vue';
import { useGraphStore } from '../../stores/graph';
import type { Node, Edge } from '../../types';

export interface UndoableOptions {
  maxHistory?: number;
}

export interface UndoableState {
  canUndo: Ref<boolean>;
  canRedo: Ref<boolean>;
  historyLength: Ref<number>;
  currentIndex: Ref<number>;
}

export interface UndoableHandlers {
  undo: () => void;
  redo: () => void;
  clearHistory: () => void;
  snapshot: () => void;
}

interface GraphSnapshot {
  nodes: Record<string, Node>;
  edges: Record<string, Edge>;
  timestamp: number;
}

// État global de l'historique
const history = ref<GraphSnapshot[]>([]);
const currentIndex = ref(-1);
const isUndoRedoAction = ref(false);
const maxHistory = ref(50);

export function useUndoable(options: UndoableOptions = {}): UndoableState & UndoableHandlers {
  const graphStore = useGraphStore();

  if (options.maxHistory) {
    maxHistory.value = options.maxHistory;
  }

  const canUndo = computed(() => currentIndex.value > 0);
  const canRedo = computed(() => currentIndex.value < history.value.length - 1);
  const historyLength = computed(() => history.value.length);

  // Crée un snapshot de l'état actuel
  function snapshot() {
    if (isUndoRedoAction.value) return;

    const snap: GraphSnapshot = {
      nodes: JSON.parse(JSON.stringify(graphStore.nodes)),
      edges: JSON.parse(JSON.stringify(graphStore.edges)),
      timestamp: Date.now(),
    };

    // Si on est au milieu de l'historique, supprimer les états futurs
    if (currentIndex.value < history.value.length - 1) {
      history.value = history.value.slice(0, currentIndex.value + 1);
    }

    history.value.push(snap);

    // Limiter la taille de l'historique
    if (history.value.length > maxHistory.value) {
      history.value = history.value.slice(history.value.length - maxHistory.value);
    }

    currentIndex.value = history.value.length - 1;
  }

  // Restaure un snapshot
  async function restoreSnapshot(snap: GraphSnapshot) {
    isUndoRedoAction.value = true;

    try {
      // Effacer tout et recréer
      await graphStore.clearAll();

      // Recréer les noeuds
      for (const node of Object.values(snap.nodes)) {
        const { id, ...nodeData } = node;
        // Utiliser directement l'API DB pour éviter les watchers
        await graphStore.createNode(nodeData as Omit<Node, 'id'>, node.parentId);
      }

      // Recréer les edges
      for (const edge of Object.values(snap.edges)) {
        await graphStore.createEdge(edge.sourceId, edge.targetId, edge.routing);
      }

      // Recharger depuis la DB pour synchroniser
      await graphStore.loadFromDB();
    } finally {
      isUndoRedoAction.value = false;
    }
  }

  function undo() {
    if (!canUndo.value) return;

    currentIndex.value--;
    const snap = history.value[currentIndex.value];
    if (snap) {
      restoreSnapshot(snap);
    }
  }

  function redo() {
    if (!canRedo.value) return;

    currentIndex.value++;
    const snap = history.value[currentIndex.value];
    if (snap) {
      restoreSnapshot(snap);
    }
  }

  function clearHistory() {
    history.value = [];
    currentIndex.value = -1;
    // Créer un snapshot initial
    snapshot();
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
  };
}

// Hook pour auto-snapshot sur les changements du store
export function useAutoSnapshot() {
  const graphStore = useGraphStore();
  const { snapshot } = useUndoable();
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;

  // Debounce les snapshots pour éviter d'en créer trop
  function debouncedSnapshot() {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }
    debounceTimer = setTimeout(() => {
      snapshot();
    }, 500);
  }

  // Watch les changements
  watch(
    () => [graphStore.nodes, graphStore.edges],
    () => {
      debouncedSnapshot();
    },
    { deep: true }
  );

  return { snapshot };
}

// Export de l'état global pour debug/UI
export function useUndoState() {
  return {
    history,
    currentIndex,
    isUndoRedoAction,
  };
}
