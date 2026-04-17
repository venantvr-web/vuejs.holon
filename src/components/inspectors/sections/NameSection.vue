
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
  <section class="p-3 border-b">
    <h3 class="text-sm font-semibold mb-2 text-gray-700">Identité</h3>
    <label class="block text-xs text-gray-600 mb-1" for="node-name">Nom</label>
    <input
      id="node-name"
      v-model="name"
      type="text"
      placeholder="Nom du noeud…"
      class="w-full px-2 py-1 text-sm border border-gray-300 rounded outline-none focus:border-blue-500"
    />
  </section>
</template>
