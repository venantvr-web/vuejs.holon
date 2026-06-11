<!-- src/components/layout/PropertyInspector.vue -->
<script setup lang="ts">
import { computed } from 'vue';
import { MousePointerClick } from 'lucide-vue-next';
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
    class="property-inspector app-surface border-l app-border flex flex-col"
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
        <MousePointerClick :size="40" class="mx-auto mb-2 opacity-50" aria-hidden="true" />
        <p>Aucune sélection</p>
        <p class="text-xs mt-2">Cliquez sur un élément pour voir ses propriétés</p>
      </div>
    </div>
  </aside>
</template>
