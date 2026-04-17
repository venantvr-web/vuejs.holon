
<!-- src/components/inspectors/NodeInspector.vue -->
<script setup lang="ts">
import { computed } from 'vue';
import { useGraphStore } from '../../stores/graph';
import NameSection from './sections/NameSection.vue';
import TagsSection from './sections/TagsSection.vue';
import PropertiesSection from './sections/PropertiesSection.vue';
import ConfidenceSection from './sections/ConfidenceSection.vue';

interface NodeInspectorProps {
  nodeId: string;
}

const props = defineProps<NodeInspectorProps>();
const graphStore = useGraphStore();

const node = computed(() => graphStore.nodes[props.nodeId]);
const typeLabel = computed(() => node.value?.type ?? '');
</script>

<template>
  <div v-if="node" class="node-inspector">
    <div class="px-3 py-2 border-b bg-gray-50">
      <h2 class="text-sm font-bold text-gray-800">Propriétés du noeud</h2>
      <p class="text-xs text-gray-500 mt-0.5">
        {{ typeLabel }} · {{ nodeId.substring(0, 8) }}…
      </p>
    </div>

    <NameSection :node-id="nodeId" />
    <TagsSection :node-id="nodeId" />
    <ConfidenceSection :node-id="nodeId" />
    <PropertiesSection :node-id="nodeId" />
  </div>
</template>
