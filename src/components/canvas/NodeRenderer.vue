<!-- src/components/canvas/NodeRenderer.vue -->
<script setup lang="ts">
import { computed, defineAsyncComponent, ref } from 'vue';
import { useGraphStore } from '../../stores/graph';
import { useGeometry } from '../../composables/useGeometry';

const props = defineProps<{
  nodeId: string;
  connectionMode?: boolean;
  zoomLevel?: number;
}>();

const emit = defineEmits<{
  (e: 'start-connection', nodeId: string): void;
  (e: 'finish-connection', nodeId: string): void;
}>();

const graphStore = useGraphStore();
const { getNodeAbsolutePosition, findContainerAtPoint, convertCoordinates } = useGeometry();

const node = computed(() => graphStore.nodes[props.nodeId]);

// Pour la récursion
const ChildNodeRenderer = defineAsyncComponent(() => import('./NodeRenderer.vue'));

const children = computed(() => {
  if (node.value?.type !== 'container') return [];
  return Object.values(graphStore.nodes).filter(n => n.parentId === props.nodeId);
});

const transform = computed(() => `translate(${node.value?.geometry.x ?? 0} ${node.value?.geometry.y ?? 0})`);

// --- État ---
const isDragging = ref(false);
const isResizing = ref(false);
const dragStart = ref({ x: 0, y: 0 });
const initialPos = ref({ x: 0, y: 0 });
const initialSize = ref({ w: 0, h: 0 });
const potentialParent = ref<string | null>(null);
const isHovered = ref(false);

// --- Drag pour déplacer les noeuds ---
function handleMouseDown(event: MouseEvent) {
  if (event.button !== 0) return;

  if (props.connectionMode) {
    emit('finish-connection', props.nodeId);
    return;
  }

  if (event.shiftKey) {
    event.stopPropagation();
    emit('start-connection', props.nodeId);
    return;
  }

  event.stopPropagation();
  isDragging.value = true;
  dragStart.value = { x: event.clientX, y: event.clientY };
  initialPos.value = { x: node.value.geometry.x, y: node.value.geometry.y };

  window.addEventListener('mousemove', handleMouseMove);
  window.addEventListener('mouseup', handleMouseUp);
}

function handleMouseMove(event: MouseEvent) {
  if (!isDragging.value) return;

  const zoom = props.zoomLevel ?? 1;
  const dx = (event.clientX - dragStart.value.x) / zoom;
  const dy = (event.clientY - dragStart.value.y) / zoom;

  graphStore.updateNode(props.nodeId, {
    geometry: {
      ...node.value.geometry,
      x: initialPos.value.x + dx,
      y: initialPos.value.y + dy,
    },
  });

  // Trouver le container potentiel
  const absPos = getNodeAbsolutePosition(props.nodeId);
  const centerX = absPos.x + node.value.geometry.w / 2;
  const centerY = absPos.y + node.value.geometry.h / 2;
  potentialParent.value = findContainerAtPoint(centerX, centerY, props.nodeId);
}

function handleMouseUp() {
  if (isDragging.value && potentialParent.value !== null) {
    const currentParent = node.value.parentId;
    if (potentialParent.value !== currentParent) {
      const newCoords = convertCoordinates(props.nodeId, currentParent, potentialParent.value);
      graphStore.updateNode(props.nodeId, {
        parentId: potentialParent.value,
        geometry: {
          ...node.value.geometry,
          x: newCoords.x,
          y: newCoords.y,
        },
      });
    }
  }

  isDragging.value = false;
  potentialParent.value = null;
  window.removeEventListener('mousemove', handleMouseMove);
  window.removeEventListener('mouseup', handleMouseUp);
}

// --- Redimensionnement par poignée ---
// Stocker les tailles initiales des enfants pour le redimensionnement proportionnel
const initialChildrenGeometry = ref<Map<string, { x: number; y: number; w: number; h: number }>>(new Map());

function collectChildrenGeometry(parentId: string, map: Map<string, { x: number; y: number; w: number; h: number }>) {
  const childNodes = Object.values(graphStore.nodes).filter(n => n.parentId === parentId);
  for (const child of childNodes) {
    map.set(child.id, { ...child.geometry });
    collectChildrenGeometry(child.id, map);
  }
}

function handleResizeStart(event: MouseEvent) {
  event.preventDefault();
  event.stopPropagation();

  isResizing.value = true;
  dragStart.value = { x: event.clientX, y: event.clientY };
  initialSize.value = { w: node.value.geometry.w, h: node.value.geometry.h };

  // Collecter la géométrie initiale de tous les enfants
  initialChildrenGeometry.value.clear();
  collectChildrenGeometry(props.nodeId, initialChildrenGeometry.value);

  window.addEventListener('mousemove', handleResizeMove);
  window.addEventListener('mouseup', handleResizeEnd);
}

function handleResizeMove(event: MouseEvent) {
  if (!isResizing.value) return;

  const zoom = props.zoomLevel ?? 1;
  const dx = (event.clientX - dragStart.value.x) / zoom;
  const dy = (event.clientY - dragStart.value.y) / zoom;

  const minSize = 30;

  // Nouvelle taille (libre, pas proportionnel)
  let newW = Math.max(minSize, initialSize.value.w + dx);
  let newH = Math.max(minSize, initialSize.value.h + dy);

  // Calculer les facteurs d'échelle pour les enfants
  const scaleX = newW / initialSize.value.w;
  const scaleY = newH / initialSize.value.h;

  // Mettre à jour ce noeud
  graphStore.updateNode(props.nodeId, {
    geometry: {
      ...node.value.geometry,
      w: newW,
      h: newH,
    },
  });

  // Redimensionner les enfants proportionnellement
  resizeChildrenFromInitial(props.nodeId, scaleX, scaleY);
}

function handleResizeEnd() {
  isResizing.value = false;
  initialChildrenGeometry.value.clear();
  window.removeEventListener('mousemove', handleResizeMove);
  window.removeEventListener('mouseup', handleResizeEnd);
}

// Redimensionne récursivement tous les enfants à partir de leur géométrie initiale
function resizeChildrenFromInitial(parentId: string, scaleX: number, scaleY: number) {
  const childNodes = Object.values(graphStore.nodes).filter(n => n.parentId === parentId);

  for (const child of childNodes) {
    const initial = initialChildrenGeometry.value.get(child.id);
    if (!initial) continue;

    const minSize = 20;
    const newW = Math.max(minSize, initial.w * scaleX);
    const newH = Math.max(minSize, initial.h * scaleY);

    graphStore.updateNode(child.id, {
      geometry: {
        x: initial.x * scaleX,
        y: initial.y * scaleY,
        w: newW,
        h: newH,
      },
    });

    // Récursion
    resizeChildrenFromInitial(child.id, scaleX, scaleY);
  }
}

// Extraire du container
function handleDoubleClick(event: MouseEvent) {
  if (node.value.parentId !== null) {
    event.stopPropagation();
    const newCoords = convertCoordinates(props.nodeId, node.value.parentId, null);
    graphStore.updateNode(props.nodeId, {
      parentId: null,
      geometry: {
        ...node.value.geometry,
        x: newCoords.x,
        y: newCoords.y,
      },
    });
  }
}

function handleKeyDown(event: KeyboardEvent) {
  if (event.key === 'Delete' || event.key === 'Backspace') {
    graphStore.deleteNode(props.nodeId);
  }
}

// Indicateur visuel
const isDropTarget = computed(() => {
  return node.value?.type === 'container' && potentialParent.value === props.nodeId;
});

const showResizeHandle = computed(() => {
  return isHovered.value && !isDragging.value && !props.connectionMode;
});
</script>

<template>
  <g
    v-if="node"
    :transform="transform"
    @mousedown="handleMouseDown"
    @dblclick="handleDoubleClick"
    @keydown="handleKeyDown"
    @mouseenter="isHovered = true"
    @mouseleave="isHovered = false"
    tabindex="0"
    class="cursor-move focus:outline-none"
  >
    <!-- Forme du noeud -->
    <rect
      :width="node.geometry.w"
      :height="node.geometry.h"
      :fill="node.styling.fill"
      :stroke="connectionMode ? '#3b82f6' : (isDropTarget ? '#22c55e' : node.styling.stroke)"
      :stroke-width="connectionMode || isDropTarget ? 3 : node.styling.strokeWidth"
      :stroke-dasharray="isDropTarget ? '5,5' : 'none'"
      rx="4"
    />

    <!-- Indicateur de drop -->
    <rect
      v-if="isDragging && potentialParent"
      :width="node.geometry.w + 8"
      :height="node.geometry.h + 8"
      x="-4"
      y="-4"
      fill="none"
      stroke="#22c55e"
      stroke-width="2"
      stroke-dasharray="4,4"
      rx="6"
      class="pointer-events-none"
    />

    <!-- Enfants récursifs -->
    <template v-if="node.type === 'container' && children.length">
      <ChildNodeRenderer
        v-for="child in children"
        :key="child.id"
        :node-id="child.id"
        :connection-mode="connectionMode"
        :zoom-level="zoomLevel"
        @start-connection="$emit('start-connection', $event)"
        @finish-connection="$emit('finish-connection', $event)"
      />
    </template>

    <!-- Nom -->
    <text
      :x="10"
      :y="20"
      fill="#333"
      font-size="14"
      pointer-events="none"
    >
      {{ node.data.name || node.id.substring(0, 5) }}
    </text>

    <!-- Badge enfant -->
    <circle
      v-if="node.parentId"
      cx="8"
      cy="8"
      r="4"
      fill="#8b5cf6"
      class="pointer-events-none"
    />

    <!-- Point de connexion -->
    <circle
      v-if="!connectionMode"
      :cx="node.geometry.w"
      :cy="node.geometry.h / 2"
      r="6"
      fill="#3b82f6"
      class="opacity-0 hover:opacity-100 transition-opacity cursor-crosshair"
      @mousedown.stop.prevent="$emit('start-connection', nodeId)"
    />

    <!-- Poignée de redimensionnement (coin bas-droit) -->
    <g
      v-if="showResizeHandle || isResizing"
      @mousedown="handleResizeStart"
      class="cursor-nwse-resize"
    >
      <rect
        :x="node.geometry.w - 12"
        :y="node.geometry.h - 12"
        width="14"
        height="14"
        fill="transparent"
      />
      <path
        :d="`M ${node.geometry.w - 2} ${node.geometry.h - 10} L ${node.geometry.w - 2} ${node.geometry.h - 2} L ${node.geometry.w - 10} ${node.geometry.h - 2}`"
        fill="none"
        stroke="#666"
        stroke-width="2"
        stroke-linecap="round"
      />
    </g>
  </g>
</template>

<style scoped>
g:focus rect:first-of-type {
  stroke: #3b82f6;
  stroke-width: 2;
}
</style>
