<!-- src/components/layout/PropertyInspector.vue -->
<script setup lang="ts">
import { computed } from 'vue';
import { useEdgeSelectionState } from '../../composables/useEdgeSelection';
import { useSelectionState } from '../../composables/traits/useSelectable';
import EdgeInspector from '../inspectors/EdgeInspector.vue';
import NodeInspector from '../inspectors/NodeInspector.vue';

// État de sélection partagé
const { selectedEdgeId } = useEdgeSelectionState();
const { selectedNodeIds } = useSelectionState();

// Détermine quel type de sélection est actif
const selectionType = computed(() => {
  if (selectedEdgeId.value) return 'edge';
  if (selectedNodeIds.value.size === 1) return 'node';
  if (selectedNodeIds.value.size > 1) return 'multi';
  return 'none';
});

// ID de l'élément sélectionné
const selectedId = computed(() => {
  if (selectionType.value === 'edge') return selectedEdgeId.value;
  if (selectionType.value === 'node') return Array.from(selectedNodeIds.value)[0];
  return null;
});
</script>

<template>
  <aside class="property-inspector bg-white border-l flex flex-col" style="width: 320px;">
    <!-- Header -->
    <div class="p-3 border-b bg-gray-100">
      <h2 class="text-sm font-bold text-gray-800">Propriétés</h2>
    </div>

    <!-- Contenu selon le type de sélection -->
    <div class="flex-1 overflow-y-auto">
      <!-- Edge sélectionné -->
      <EdgeInspector
        v-if="selectionType === 'edge' && selectedId"
        :edge-id="selectedId"
      />

      <!-- Node sélectionné -->
      <NodeInspector
        v-else-if="selectionType === 'node' && selectedId"
        :node-id="selectedId"
      />

      <!-- Multi-sélection (TODO: MultiSelectionInspector) -->
      <div
        v-else-if="selectionType === 'multi'"
        class="p-4 text-sm text-gray-500"
      >
        <p>Multi-sélection (TODO)</p>
        <p class="mt-2 text-xs">{{ selectedNodeIds.size }} éléments sélectionnés</p>
      </div>

      <!-- Aucune sélection -->
      <div
        v-else
        class="p-4 text-sm text-gray-400 text-center mt-8"
      >
        <svg
          class="w-12 h-12 mx-auto mb-2 text-gray-300"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122"
          />
        </svg>
        <p>Aucune sélection</p>
        <p class="text-xs mt-2">Cliquez sur un élément pour voir ses propriétés</p>
      </div>
    </div>
  </aside>
</template>
