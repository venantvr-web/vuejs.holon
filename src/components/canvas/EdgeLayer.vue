
<!-- src/components/canvas/EdgeLayer.vue -->
<script setup lang="ts">
import { computed } from 'vue';
import { useGraphStore } from '../../stores/graph';
import { useGeometry } from '../../composables/useGeometry';

const graphStore = useGraphStore();
const { getNodeAbsolutePosition } = useGeometry();

// Calcule les points de départ et d'arrivée de chaque arête en coordonnées absolues
const renderedEdges = computed(() => {
  return Object.values(graphStore.edges).map(edge => {
    const sourceNode = graphStore.nodes[edge.sourceId];
    const targetNode = graphStore.nodes[edge.targetId];

    if (!sourceNode || !targetNode) return null;

    // Position absolue du noeud source et cible
    const sourceAbs = getNodeAbsolutePosition(edge.sourceId);
    const targetAbs = getNodeAbsolutePosition(edge.targetId);

    // Point de connexion au centre du noeud (pour l'exemple)
    // TODO: Implémenter des points d'ancrage plus sophistiqués
    const x1 = sourceAbs.x + sourceNode.geometry.w / 2;
    const y1 = sourceAbs.y + sourceNode.geometry.h / 2;
    const x2 = targetAbs.x + targetNode.geometry.w / 2;
    const y2 = targetAbs.y + targetNode.geometry.h / 2;

    return { id: edge.id, x1, y1, x2, y2 };
  }).filter(e => e !== null);
});

// TODO: Logique pour le mode "Connexion"
</script>

<template>
  <g class="edge-layer">
    <line
      v-for="edge in renderedEdges"
      :key="edge.id"
      :x1="edge.x1"
      :y1="edge.y1"
      :x2="edge.x2"
      :y2="edge.y2"
      stroke="#333"
      stroke-width="2"
    />
  </g>
</template>
