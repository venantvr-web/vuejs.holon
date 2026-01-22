// src/composables/traits/useSelectable.ts
import { ref, computed, type Ref } from 'vue';
import { useGraphStore } from '../../stores/graph';

// État global de sélection
const selectedNodeIds = ref<Set<string>>(new Set());
const focusedNodeId = ref<string | null>(null);

export interface SelectableOptions {
  nodeId: Ref<string>;
}

export interface SelectableState {
  isSelected: Ref<boolean>;
  isFocused: Ref<boolean>;
}

export interface SelectableHandlers {
  select: (addToSelection?: boolean) => void;
  deselect: () => void;
  focus: () => void;
  blur: () => void;
}

export function useSelectable(options: SelectableOptions): SelectableState & SelectableHandlers {
  const graphStore = useGraphStore();

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
