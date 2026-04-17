<!-- src/components/layout/PropertyInspector.vue -->
<script setup lang="ts">
import { computed } from 'vue';
import { useEdgeSelectionState } from '../../composables/useEdgeSelection';
import { useSelectionState } from '../../composables/traits/useSelectable';
import EdgeInspector from '../inspectors/EdgeInspector.vue';
import NodeInspector from '../inspectors/NodeInspector.vue';

const { selectedEdgeId } = useEdgeSelectionState();
const { selectedNodeIds } = useSelectionState();

const selectionType = computed(() => {
  if (selectedEdgeId.value) return 'edge';
  if (selectedNodeIds.value.size === 1) return 'node';
  if (selectedNodeIds.value.size > 1) return 'multi';
  return 'none';
});

const selectedId = computed(() => {
  if (selectionType.value === 'edge') return selectedEdgeId.value;
  if (selectionType.value === 'node') return Array.from(selectedNodeIds.value)[0];
  return null;
});
</script>

<template>
  <aside
    class="property-inspector app-surface border-l flex flex-col"
    style="width: 320px;"
  >
    <div class="flex-1 overflow-y-auto">
      <EdgeInspector
        v-if="selectionType === 'edge' && selectedId"
        :edge-id="selectedId"
      />
      <NodeInspector
        v-else-if="selectionType === 'node' && selectedId"
        :node-id="selectedId"
      />
      <div
        v-else-if="selectionType === 'multi'"
        class="p-4 text-sm app-muted"
      >
        <p>Multi-sélection</p>
        <p class="mt-2 text-xs">{{ selectedNodeIds.size }} éléments sélectionnés</p>
      </div>
      <div
        v-else
        class="p-4 text-sm app-subtle text-center mt-8"
      >
        <svg class="w-12 h-12 mx-auto mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
            d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
        </svg>
        <p>Aucune sélection</p>
        <p class="text-xs mt-2">Cliquez sur un élément pour voir ses propriétés</p>
      </div>
    </div>
  </aside>
</template>
