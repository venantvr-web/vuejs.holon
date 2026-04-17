// src/composables/useEdgeSelection.ts
import { ref } from 'vue';

// État global de sélection des edges
const selectedEdgeId = ref<string | null>(null);

/**
 * Composable pour gérer la sélection d'edges
 * @returns État et handlers pour la sélection d'edges
 */
export function useEdgeSelectionState() {
  function selectEdge(edgeId: string) {
    selectedEdgeId.value = edgeId;
  }

  function deselectEdge() {
    selectedEdgeId.value = null;
  }

  return {
    selectedEdgeId,
    selectEdge,
    deselectEdge,
  };
}
