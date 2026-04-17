
<!-- src/components/canvas/Minimap.vue -->
<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from 'vue';
import { useGraphStore } from '../../stores/graph';
import { useViewport } from '../../composables/useViewport';
import { getNodeAbsolutePosition } from '../../composables/traits/utils/trait-helpers';

interface Props {
  /** Largeur écran du canevas principal pour calculer la viewport visible. */
  canvasWidth: number;
  /** Hauteur écran du canevas principal. */
  canvasHeight: number;
}

const props = defineProps<Props>();

const graphStore = useGraphStore();
const { pan, zoomLevel } = useViewport();

const MINIMAP_W = 200;
const MINIMAP_H = 140;
const PADDING = 20;

const root = ref<SVGSVGElement | null>(null);
const isDragging = ref(false);

// Bounding box de tous les noeuds en coordonnées monde.
const worldBounds = computed(() => {
  const nodes = Object.values(graphStore.nodes);
  if (nodes.length === 0) {
    return { x: -100, y: -100, w: 200, h: 200 };
  }
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const node of nodes) {
    const abs = getNodeAbsolutePosition(node.id);
    if (!abs) continue;
    minX = Math.min(minX, abs.x);
    minY = Math.min(minY, abs.y);
    maxX = Math.max(maxX, abs.x + node.geometry.w);
    maxY = Math.max(maxY, abs.y + node.geometry.h);
  }
  // Également englober la viewport actuelle pour que la minimap reste
  // cohérente si l'utilisateur a paté très loin.
  const viewMinX = -pan.value.x / zoomLevel.value;
  const viewMinY = -pan.value.y / zoomLevel.value;
  const viewMaxX = viewMinX + props.canvasWidth / zoomLevel.value;
  const viewMaxY = viewMinY + props.canvasHeight / zoomLevel.value;
  minX = Math.min(minX, viewMinX);
  minY = Math.min(minY, viewMinY);
  maxX = Math.max(maxX, viewMaxX);
  maxY = Math.max(maxY, viewMaxY);
  return {
    x: minX - PADDING,
    y: minY - PADDING,
    w: maxX - minX + PADDING * 2,
    h: maxY - minY + PADDING * 2,
  };
});

// Facteur d'échelle pour mapper coordonnées monde → minimap.
const scale = computed(() => {
  const bounds = worldBounds.value;
  return Math.min(MINIMAP_W / bounds.w, MINIMAP_H / bounds.h);
});

// Offset pour centrer le contenu dans la minimap.
const offset = computed(() => {
  const bounds = worldBounds.value;
  const s = scale.value;
  return {
    x: (MINIMAP_W - bounds.w * s) / 2 - bounds.x * s,
    y: (MINIMAP_H - bounds.h * s) / 2 - bounds.y * s,
  };
});

// Projection monde → minimap.
function worldToMini(x: number, y: number): { x: number; y: number } {
  const s = scale.value;
  const o = offset.value;
  return { x: x * s + o.x, y: y * s + o.y };
}

// Projection minimap (écran) → monde (absolu).
function miniToWorld(miniX: number, miniY: number): { x: number; y: number } {
  const s = scale.value;
  const o = offset.value;
  return { x: (miniX - o.x) / s, y: (miniY - o.y) / s };
}

const renderedNodes = computed(() => {
  return Object.values(graphStore.nodes)
    .filter(n => n.parentId === null) // racines uniquement — évite la duplication visuelle
    .map(node => {
      const abs = getNodeAbsolutePosition(node.id);
      if (!abs) return null;
      const tl = worldToMini(abs.x, abs.y);
      return {
        id: node.id,
        x: tl.x,
        y: tl.y,
        w: node.geometry.w * scale.value,
        h: node.geometry.h * scale.value,
        fill: node.styling?.fill ?? '#e5e7eb',
        stroke: node.styling?.stroke ?? '#9ca3af',
      };
    })
    .filter((n): n is NonNullable<typeof n> => n !== null);
});

// Rectangle de la viewport courante (zone visible dans le canevas principal).
const viewportRect = computed(() => {
  const s = scale.value;
  const o = offset.value;
  const worldX = -pan.value.x / zoomLevel.value;
  const worldY = -pan.value.y / zoomLevel.value;
  const worldW = props.canvasWidth / zoomLevel.value;
  const worldH = props.canvasHeight / zoomLevel.value;
  return {
    x: worldX * s + o.x,
    y: worldY * s + o.y,
    w: worldW * s,
    h: worldH * s,
  };
});

// --- Navigation : clic / drag sur la minimap pour déplacer la caméra ---
function getMiniCoords(event: MouseEvent): { x: number; y: number } | null {
  if (!root.value) return null;
  const rect = root.value.getBoundingClientRect();
  return { x: event.clientX - rect.left, y: event.clientY - rect.top };
}

function panToMini(miniX: number, miniY: number) {
  const world = miniToWorld(miniX, miniY);
  pan.value = {
    x: -world.x * zoomLevel.value + props.canvasWidth / 2,
    y: -world.y * zoomLevel.value + props.canvasHeight / 2,
  };
}

function handleMouseDown(event: MouseEvent) {
  event.preventDefault();
  isDragging.value = true;
  const coords = getMiniCoords(event);
  if (coords) panToMini(coords.x, coords.y);
}

function handleMouseMove(event: MouseEvent) {
  if (!isDragging.value) return;
  const coords = getMiniCoords(event);
  if (coords) panToMini(coords.x, coords.y);
}

function handleMouseUp() {
  isDragging.value = false;
}

onMounted(() => {
  window.addEventListener('mousemove', handleMouseMove);
  window.addEventListener('mouseup', handleMouseUp);
});

onUnmounted(() => {
  window.removeEventListener('mousemove', handleMouseMove);
  window.removeEventListener('mouseup', handleMouseUp);
});
</script>

<template>
  <svg
    ref="root"
    class="minimap app-surface border app-border rounded shadow-md cursor-pointer select-none"
    :width="MINIMAP_W"
    :height="MINIMAP_H"
    @mousedown="handleMouseDown"
  >
    <!-- Noeuds miniatures -->
    <rect
      v-for="node in renderedNodes"
      :key="node.id"
      :x="node.x"
      :y="node.y"
      :width="node.w"
      :height="node.h"
      :fill="node.fill"
      :stroke="node.stroke"
      stroke-width="0.5"
      opacity="0.8"
    />

    <!-- Rectangle de la viewport courante -->
    <rect
      :x="viewportRect.x"
      :y="viewportRect.y"
      :width="viewportRect.w"
      :height="viewportRect.h"
      fill="#3b82f6"
      fill-opacity="0.15"
      stroke="#3b82f6"
      stroke-width="1.5"
      class="pointer-events-none"
    />
  </svg>
</template>
