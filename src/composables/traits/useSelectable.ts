// src/composables/traits/useSelectable.ts
import { ref, computed, type Ref } from 'vue';
import { useGraphStore } from '../../stores/graph';

// État global de sélection
const selectedNodeIds = ref<Set<string>>(new Set());
const focusedNodeId = ref<string | null>(null);

/**
 * Options de configuration pour le trait Selectable.
 */
export interface SelectableOptions {
  /** Identifiant réactif du noeud */
  nodeId: Ref<string>;
}

/**
 * État réactif géré par le trait Selectable.
 */
export interface SelectableState {
  /** Indique si le noeud est sélectionné */
  isSelected: Ref<boolean>;
  /** Indique si le noeud a le focus */
  isFocused: Ref<boolean>;
}

/**
 * Gestionnaires d'actions fournis par le trait Selectable.
 */
export interface SelectableHandlers {
  /** Sélectionne le noeud et lui donne le focus */
  select: (addToSelection?: boolean) => void;
  /** Désélectionne le noeud */
  deselect: () => void;
  /** Donne le focus au noeud sans modifier la sélection */
  focus: () => void;
  /** Retire le focus du noeud */
  blur: () => void;
}

/**
 * Ajoute la capacité de sélection et de focus à un noeud.
 *
 * Gère la sélection multiple via un état global partagé et permet de
 * distinguer le noeud ayant le focus parmi les noeuds sélectionnés.
 *
 * @param options - Configuration du trait
 * @returns État réactif et gestionnaires pour la sélection et le focus
 */
export function useSelectable(options: SelectableOptions): SelectableState & SelectableHandlers {
  const isSelected = computed(() => selectedNodeIds.value.has(options.nodeId.value));
  const isFocused = computed(() => focusedNodeId.value === options.nodeId.value);

  function select(addToSelection = false) {
    if (!addToSelection) {
      selectedNodeIds.value.clear();
    }
    selectedNodeIds.value.add(options.nodeId.value);
    focusedNodeId.value = options.nodeId.value;
  }

  function deselect() {
    selectedNodeIds.value.delete(options.nodeId.value);
    if (focusedNodeId.value === options.nodeId.value) {
      focusedNodeId.value = null;
    }
  }

  function focus() {
    focusedNodeId.value = options.nodeId.value;
  }

  function blur() {
    if (focusedNodeId.value === options.nodeId.value) {
      focusedNodeId.value = null;
    }
  }

  return {
    isSelected,
    isFocused,
    select,
    deselect,
    focus,
    blur,
  };
}

// Export de l'état global pour le canvas
export function useSelectionState() {
  return {
    selectedNodeIds,
    focusedNodeId,
    clearSelection: () => {
      selectedNodeIds.value.clear();
      focusedNodeId.value = null;
    },
    deleteSelected: () => {
      const graphStore = useGraphStore();
      for (const id of selectedNodeIds.value) {
        graphStore.deleteNode(id);
      }
      selectedNodeIds.value.clear();
      focusedNodeId.value = null;
    },
  };
}
