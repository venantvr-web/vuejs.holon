<!-- src/components/canvas/GraphCanvas.vue -->
<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useGraphStore } from '../../stores/graph';
import { useGeometry } from '../../composables/useGeometry';
import NodeRenderer from './NodeRenderer.vue';
import EdgeLayer from './EdgeLayer.vue';

const graphStore = useGraphStore();
const { screenToLocalCoordinates } = useGeometry();

const svgRoot = ref<SVGSVGElement | null>(null);
const zoomLevel = ref(1);
const pan = ref({ x: 0, y: 0 });

// État pour le pan avec la souris
const isPanning = ref(false);
const lastMousePos = ref({ x: 0, y: 0 });

// État pour le mode connexion
const connectionMode = ref(false);
const connectionSource = ref<string | null>(null);
const connectionPreview = ref<{ x: number; y: number } | null>(null);

// Transformation pour le groupe SVG principal
const transform = computed(() => `translate(${pan.value.x} ${pan.value.y}) scale(${zoomLevel.value})`);

const rootNodes = computed(() => {
  return Object.values(graphStore.nodes).filter(n => n.parentId === null);
});

// --- Drop depuis la sidebar ---
function handleDrop(event: DragEvent) {
  event.preventDefault();
  const itemJSON = event.dataTransfer?.getData('application/json');
  if (!itemJSON || !svgRoot.value) return;

  const item = JSON.parse(itemJSON);
  const { x, y } = screenToLocalCoordinates(
    event.clientX,
    event.clientY,
    svgRoot.value,
    null
  );

  // Ajuster pour le zoom et le pan
  const adjustedX = (x - pan.value.x) / zoomLevel.value;
  const adjustedY = (y - pan.value.y) / zoomLevel.value;

  graphStore.createNode(
    { ...item, geometry: { ...item.geometry, x: adjustedX, y: adjustedY } },
    null
  );
}

function handleDragOver(event: DragEvent) {
  event.preventDefault();
}

// --- Zoom avec la molette ---
function handleWheel(event: WheelEvent) {
  event.preventDefault();

  const zoomFactor = event.deltaY > 0 ? 0.9 : 1.1;
  const newZoom = Math.max(0.1, Math.min(5, zoomLevel.value * zoomFactor));

  if (svgRoot.value) {
    const rect = svgRoot.value.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;

    // Zoom centré sur la souris
    const zoomRatio = newZoom / zoomLevel.value;
    pan.value.x = mouseX - (mouseX - pan.value.x) * zoomRatio;
    pan.value.y = mouseY - (mouseY - pan.value.y) * zoomRatio;
  }

  zoomLevel.value = newZoom;
}

// --- Pan avec clic milieu ou espace + clic ---
function handleMouseDown(event: MouseEvent) {
  // Clic milieu pour pan
  if (event.button === 1) {
    event.preventDefault();
    isPanning.value = true;
    lastMousePos.value = { x: event.clientX, y: event.clientY };
  }
}

function handleMouseMove(event: MouseEvent) {
  if (isPanning.value) {
    const dx = event.clientX - lastMousePos.value.x;
    const dy = event.clientY - lastMousePos.value.y;
    pan.value.x += dx;
    pan.value.y += dy;
    lastMousePos.value = { x: event.clientX, y: event.clientY };
  }

  // Mise à jour de l'aperçu de connexion
  if (connectionMode.value && connectionSource.value && svgRoot.value) {
    const { x, y } = screenToLocalCoordinates(event.clientX, event.clientY, svgRoot.value, null);
    connectionPreview.value = {
      x: (x - pan.value.x) / zoomLevel.value,
      y: (y - pan.value.y) / zoomLevel.value,
    };
  }
}

function handleMouseUp() {
  isPanning.value = false;
}

// --- Mode connexion ---
function startConnection(nodeId: string) {
  connectionMode.value = true;
  connectionSource.value = nodeId;
}

function finishConnection(targetId: string) {
  if (connectionSource.value && connectionSource.value !== targetId) {
    graphStore.createEdge(connectionSource.value, targetId);
  }
  cancelConnection();
}

function cancelConnection() {
  connectionMode.value = false;
  connectionSource.value = null;
  connectionPreview.value = null;
}

// Gestion des touches clavier
function handleKeyDown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    cancelConnection();
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeyDown);
  window.addEventListener('mouseup', handleMouseUp);
});

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown);
  window.removeEventListener('mouseup', handleMouseUp);
});

// Exposer la ref SVG pour l'export
defineExpose({ svgRoot, pan, zoomLevel });
</script>

<template>
  <div
    class="flex-grow h-full bg-gray-50 overflow-hidden relative"
    @drop="handleDrop"
    @dragover="handleDragOver"
  >
    <!-- Indicateur de mode connexion -->
    <div
      v-if="connectionMode"
      class="absolute top-2 left-1/2 -translate-x-1/2 bg-blue-500 text-white px-3 py-1 rounded-full text-sm z-10"
    >
      Mode connexion - Cliquez sur un noeud cible (Echap pour annuler)
    </div>

    <svg
      ref="svgRoot"
      width="100%"
      height="100%"
      @wheel="handleWheel"
      @mousedown="handleMouseDown"
      @mousemove="handleMouseMove"
      :class="{ 'cursor-grab': !isPanning, 'cursor-grabbing': isPanning }"
    >
      <g :transform="transform">
        <!-- Calque des arêtes (en dessous des noeuds) -->
        <EdgeLayer />

        <!-- Aperçu de la connexion en cours -->
        <line
          v-if="connectionMode && connectionSource && connectionPreview"
          :x1="(graphStore.nodes[connectionSource]?.geometry.x ?? 0) + (graphStore.nodes[connectionSource]?.geometry.w ?? 0) / 2"
          :y1="(graphStore.nodes[connectionSource]?.geometry.y ?? 0) + (graphStore.nodes[connectionSource]?.geometry.h ?? 0) / 2"
          :x2="connectionPreview.x"
          :y2="connectionPreview.y"
          stroke="#3b82f6"
          stroke-width="2"
          stroke-dasharray="5,5"
        />

        <!-- Rendu récursif des noeuds racines -->
        <NodeRenderer
          v-for="node in rootNodes"
          :key="node.id"
          :node-id="node.id"
          :connection-mode="connectionMode"
          :zoom-level="zoomLevel"
          @start-connection="startConnection"
          @finish-connection="finishConnection"
        />
      </g>
    </svg>
  </div>
</template>
