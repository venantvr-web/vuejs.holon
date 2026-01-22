<!-- src/components/canvas/EdgeLayer.vue -->
<script setup lang="ts">
import { computed, ref } from 'vue';
import { useGraphStore } from '../../stores/graph';
import {
  calculateEdgeIntersection,
  getNodeCenter,
  calculateArrowAngle,
  RoutingType,
} from '../../composables/traits';
import type { Edge } from '../../types';

const props = defineProps<{
  pendingConnection?: {
    sourceId: string;
    mouseX: number;
    mouseY: number;
  } | null;
}>();

const graphStore = useGraphStore();

// Type de routage par défaut
const defaultRouting = ref<RoutingType>(RoutingType.Straight);

interface RenderedEdge {
  id: string;
  sourceX: number;
  sourceY: number;
  targetX: number;
  targetY: number;
  path: string;
  arrowAngle: number;
}

// Calcule le path SVG selon le type de routage
function calculatePath(
  sourceX: number,
  sourceY: number,
  targetX: number,
  targetY: number,
  routing: RoutingType
): string {
  switch (routing) {
    case RoutingType.Straight:
      return `M ${sourceX} ${sourceY} L ${targetX} ${targetY}`;

    case RoutingType.Orthogonal: {
      const dx = targetX - sourceX;
      const dy = targetY - sourceY;
      const midX = sourceX + dx / 2;
      const midY = sourceY + dy / 2;

      if (Math.abs(dx) > Math.abs(dy)) {
        return `M ${sourceX} ${sourceY} H ${midX} V ${targetY} H ${targetX}`;
      }
      return `M ${sourceX} ${sourceY} V ${midY} H ${targetX} V ${targetY}`;
    }

    case RoutingType.Curved: {
      const dx = targetX - sourceX;
      const dy = targetY - sourceY;
      const cx = sourceX + dx / 2;
      const cy = sourceY + dy / 2 - Math.min(Math.abs(dx), Math.abs(dy)) / 4;
      return `M ${sourceX} ${sourceY} Q ${cx} ${cy} ${targetX} ${targetY}`;
    }

    case RoutingType.Bezier: {
      const dx = targetX - sourceX;
      const cp1x = sourceX + dx * 0.3;
      const cp1y = sourceY;
      const cp2x = targetX - dx * 0.3;
      const cp2y = targetY;
      return `M ${sourceX} ${sourceY} C ${cp1x} ${cp1y} ${cp2x} ${cp2y} ${targetX} ${targetY}`;
    }

    default:
      return `M ${sourceX} ${sourceY} L ${targetX} ${targetY}`;
  }
}

// Calcule les points de départ et d'arrivée de chaque arête avec intersection des bords
const renderedEdges = computed((): RenderedEdge[] => {
  return Object.values(graphStore.edges).map(edge => {
    const sourceNode = graphStore.nodes[edge.sourceId];
    const targetNode = graphStore.nodes[edge.targetId];

    if (!sourceNode || !targetNode) return null;

    // Centres des noeuds
    const sourceCenter = getNodeCenter(edge.sourceId, graphStore.nodes);
    const targetCenter = getNodeCenter(edge.targetId, graphStore.nodes);

    // Points d'intersection avec les bords (les flèches ne traversent plus les noeuds!)
    const sourcePoint = calculateEdgeIntersection(
      edge.sourceId,
      targetCenter.x,
      targetCenter.y,
      graphStore.nodes
    );

    const targetPoint = calculateEdgeIntersection(
      edge.targetId,
      sourceCenter.x,
      sourceCenter.y,
      graphStore.nodes
    );

    // Type de routage (depuis l'edge ou par défaut)
    const routing = (edge.routing as RoutingType) ?? defaultRouting.value;

    // Calculer le path
    const path = calculatePath(
      sourcePoint.x,
      sourcePoint.y,
      targetPoint.x,
      targetPoint.y,
      routing
    );

    // Angle pour la flèche (vers le point cible)
    const arrowAngle = calculateArrowAngle(
      sourcePoint.x,
      sourcePoint.y,
      targetPoint.x,
      targetPoint.y
    );

    return {
      id: edge.id,
      sourceX: sourcePoint.x,
      sourceY: sourcePoint.y,
      targetX: targetPoint.x,
      targetY: targetPoint.y,
      path,
      arrowAngle,
    };
  }).filter((e): e is RenderedEdge => e !== null);
});

// Connexion en cours (preview)
const pendingEdge = computed(() => {
  if (!props.pendingConnection) return null;

  const sourceNode = graphStore.nodes[props.pendingConnection.sourceId];
  if (!sourceNode) return null;

  const sourceCenter = getNodeCenter(props.pendingConnection.sourceId, graphStore.nodes);
  const sourcePoint = calculateEdgeIntersection(
    props.pendingConnection.sourceId,
    props.pendingConnection.mouseX,
    props.pendingConnection.mouseY,
    graphStore.nodes
  );

  return {
    sourceX: sourcePoint.x,
    sourceY: sourcePoint.y,
    targetX: props.pendingConnection.mouseX,
    targetY: props.pendingConnection.mouseY,
    path: `M ${sourcePoint.x} ${sourcePoint.y} L ${props.pendingConnection.mouseX} ${props.pendingConnection.mouseY}`,
  };
});

// Génère le marker SVG pour les flèches
const arrowSize = 10;
</script>

<template>
  <g class="edge-layer">
    <!-- Définition du marker flèche -->
    <defs>
      <marker
        id="arrowhead"
        markerWidth="10"
        markerHeight="7"
        refX="9"
        refY="3.5"
        orient="auto"
        markerUnits="userSpaceOnUse"
      >
        <polygon points="0 0, 10 3.5, 0 7" fill="#333" />
      </marker>
      <marker
        id="arrowhead-blue"
        markerWidth="10"
        markerHeight="7"
        refX="9"
        refY="3.5"
        orient="auto"
        markerUnits="userSpaceOnUse"
      >
        <polygon points="0 0, 10 3.5, 0 7" fill="#3b82f6" />
      </marker>
    </defs>

    <!-- Arêtes existantes -->
    <g v-for="edge in renderedEdges" :key="edge.id" class="edge-group">
      <!-- Zone de hit plus large pour la sélection -->
      <path
        :d="edge.path"
        fill="none"
        stroke="transparent"
        stroke-width="10"
        class="edge-hitbox cursor-pointer"
      />
      <!-- Trait visible -->
      <path
        :d="edge.path"
        fill="none"
        stroke="#333"
        stroke-width="2"
        marker-end="url(#arrowhead)"
        class="edge-line"
      />
    </g>

    <!-- Connexion en cours (preview) -->
    <path
      v-if="pendingEdge"
      :d="pendingEdge.path"
      fill="none"
      stroke="#3b82f6"
      stroke-width="2"
      stroke-dasharray="5,5"
      marker-end="url(#arrowhead-blue)"
      class="edge-pending"
    />
  </g>
</template>

<style scoped>
.edge-hitbox:hover + .edge-line {
  stroke: #3b82f6;
  stroke-width: 3;
}

.edge-group:hover .edge-line {
  stroke: #3b82f6;
}
</style>
