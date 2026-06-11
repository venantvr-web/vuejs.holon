<!-- src/components/inspectors/NodeInspector.vue -->
<script setup lang="ts">
import { computed } from 'vue';
import { useGraphStore } from '../../stores/graph';
import NameSection from './sections/NameSection.vue';
import StyleSection from './sections/StyleSection.vue';
import TagsSection from './sections/TagsSection.vue';
import PropertiesSection from './sections/PropertiesSection.vue';
import ConfidenceSection from './sections/ConfidenceSection.vue';

interface NodeInspectorProps { nodeId: string; }
const props = defineProps<NodeInspectorProps>();
const graphStore = useGraphStore();

const node = computed(() => graphStore.nodes[props.nodeId]);
const typeLabel = computed(() => node.value?.type ?? '');
</script>

<template>
  <div v-if="node" class="node-inspector">
    <header class="px-3 py-3 border-b app-surface-2 app-border">
      <h2 class="text-xs font-semibold uppercase tracking-wide app-muted">Propriétés du noeud</h2>
      <p class="text-xs app-subtle mt-0.5 font-mono">
        {{ typeLabel }} · {{ nodeId.substring(0, 8) }}…
      </p>
    </header>

    <NameSection :node-id="nodeId" />
    <StyleSection :node-id="nodeId" />
    <TagsSection :node-id="nodeId" />
    <ConfidenceSection :node-id="nodeId" />
    <PropertiesSection :node-id="nodeId" />
  </div>
</template>
