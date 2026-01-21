
<!-- src/components/canvas/NodeRenderer.vue -->
<script setup lang="ts">
import { computed, defineAsyncComponent } from 'vue';
import { useGraphStore } from '../../stores/graph';

const props = defineProps<{ nodeId: string }>();

const graphStore = useGraphStore();

const node = computed(() => graphStore.nodes[props.nodeId]);

// Pour la récursion, on utilise un composant async
const ChildNodeRenderer = defineAsyncComponent(() => import('./NodeRenderer.vue'));

const children = computed(() => {
  if (node.value.type !== 'container') return [];
  return Object.values(graphStore.nodes).filter(n => n.parentId === props.nodeId);
});

// La transformation est relative au parent
const transform = computed(() => `translate(${node.value.geometry.x} ${node.value.geometry.y})`);

// TODO: Logique de Drag & Drop pour déplacer/reparenter les noeuds
// TODO: Logique de double-clic pour le "Drill-Down"

</script>

<template>
  <g v-if="node" :transform="transform">
    <!-- Rendu de la forme du noeud -->
    <rect
      :width="node.geometry.w"
      :height="node.geometry.h"
      :fill="node.styling.fill"
      :stroke="node.styling.stroke"
      :stroke-width="node.styling.strokeWidth"
    />

    <!-- Si c'est un conteneur, on rend ses enfants de manière récursive -->
    <template v-if="node.type === 'container' && children.length">
      <ChildNodeRenderer
        v-for="child in children"
        :key="child.id"
        :node-id="child.id"
      />
    </template>

     <!-- TODO: Afficher le texte ou d'autres données du noeud -->
    <text x="10" y="20">{{ node.data.name || node.id.substring(0, 5) }}</text>
  </g>
</template>
