
<!-- src/components/canvas/GraphCanvas.vue -->
<script setup lang="ts">
import { ref, computed } from 'vue';
import { useGraphStore } from '../../stores/graph';
import { useGeometry } from '../../composables/useGeometry';
import NodeRenderer from './NodeRenderer.vue';
import EdgeLayer from './EdgeLayer.vue';

const graphStore = useGraphStore();
const { screenToLocalCoordinates } = useGeometry();

const svgRoot = ref<SVGSVGElement | null>(null);
const zoomLevel = ref(1);
const pan = ref({ x: 0, y: 0 });

// Calcule la transformation pour le groupe SVG principal
const transform = computed(() => `translate(${pan.value.x} ${pan.value.y}) scale(${zoomLevel.value})`);

const rootNodes = computed(() => {
  return Object.values(graphStore.nodes).filter(n => n.parentId === null);
});

function handleDrop(event: DragEvent) {
  event.preventDefault();
  const itemJSON = event.dataTransfer?.getData('application/json');
  if (!itemJSON || !svgRoot.value) return;

  const item = JSON.parse(itemJSON);

  // Convertir les coordonnées de drop
  const { x, y } = screenToLocalCoordinates(
    event.clientX,
    event.clientY,
    svgRoot.value,
    null // On droppe sur la racine
  );

  // Créer le noeud
  graphStore.createNode(
    { ...item, geometry: { ...item.geometry, x, y } },
    null
  );
}

function handleDragOver(event: DragEvent) {
  event.preventDefault(); // Nécessaire pour autoriser le drop
}

// TODO: Implémenter la logique de Zoom et Pan (wheel, mousedown, mousemove)

</script>

<template>
  <div class="flex-grow h-full bg-gray-50" @drop="handleDrop" @dragover="handleDragOver">
    <svg ref="svgRoot" width="100%" height="100%">
      <g :transform="transform">
        <!-- Rendu récursif des noeuds racines -->
        <NodeRenderer v-for="node in rootNodes" :key="node.id" :node-id="node.id" />

        <!-- Calque global pour les arêtes -->
        <EdgeLayer />
      </g>
    </svg>
  </div>
</template>
