
<!-- src/components/inspectors/sections/NameSection.vue -->
<script setup lang="ts">
import { computed } from 'vue';
import { useGraphStore } from '../../../stores/graph';

interface Props {
  nodeId: string;
}
const props = defineProps<Props>();
const graphStore = useGraphStore();
const node = computed(() => graphStore.nodes[props.nodeId]);

const name = computed({
  get: () => (node.value?.data?.name as string) ?? '',
  set: (value: string) => {
    const current = node.value;
    if (!current) return;
    graphStore.updateNode(props.nodeId, { data: { ...(current.data ?? {}), name: value } });
  },
});
</script>

<template>
  <section class="p-3 border-b app-border">
    <h3 class="app-section-title mb-2">Identité</h3>
    <label class="block text-xs app-muted mb-1" for="node-name">Nom</label>
    <input
      id="node-name"
      v-model="name"
      type="text"
      placeholder="Nom du noeud…"
      class="app-input w-full px-2 py-1 text-sm"
    />
  </section>
</template>
