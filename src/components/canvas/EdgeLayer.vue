<!-- src/components/canvas/EdgeLayer.vue -->
<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from 'vue';
import { useGraphStore } from '../../stores/graph';
import { useEdgeSelectionState } from '../../composables/useEdgeSelection';
import { useViewport } from '../../composables/useViewport';
import { useThemeable } from '../../composables/traits/useThemeable';
import { useFilterable } from '../../composables/traits/useFilterable';
import {
  calculateEdgeIntersection,
  getNodeCenter,
  calculateArrowAngle,
  RoutingType,
  ArrowType,
  ARROW_MARKERS,
} from '../../composables/traits';
import type { Edge } from '../../types';

const { zoomLevel } = useViewport();
const { isDarkMode } = useThemeable();
// Facteur inverse du zoom pour conserver la taille d'écran des libellés.
const fontMul = computed(() => 1 / zoomLevel.value);
// Couleur neutre des arêtes et marqueurs. Doit correspondre à --edge-stroke
// dans style.css. Nécessaire en JS car les marqueurs SVG sont générés avec
// une couleur concrète pour construire leur ID unique dans <defs>.
const edgeColor = computed(() => (isDarkMode.value ? '#d1d5db' : '#333333'));

const graphStore = useGraphStore();

// Filtre DSL : les arêtes touchant un noeud écarté sont masquées ou estompées.
const filterable = useFilterable();

// État de sélection des edges (état global partagé avec PropertyInspector)
const { selectedEdgeId, selectEdge: selectEdgeGlobal, deselectEdge } = useEdgeSelectionState();

function selectEdge(edgeId: string, event: MouseEvent) {
  event.stopPropagation();
  selectEdgeGlobal(edgeId);
}

function deleteSelectedEdge() {
  if (selectedEdgeId.value) {
    graphStore.deleteEdge(selectedEdgeId.value);
    selectedEdgeId.value = null;
  }
}

function handleEdgeContextMenu(edgeId: string, event: MouseEvent) {
  event.preventDefault();
  event.stopPropagation();
  // Supprimer directement au clic droit
  graphStore.deleteEdge(edgeId);
  if (selectedEdgeId.value === edgeId) {
    selectedEdgeId.value = null;
  }
}

function handleKeyDown(event: KeyboardEvent) {
  if ((event.key === 'Delete' || event.key === 'Backspace') && selectedEdgeId.value) {
    event.preventDefault();
    deleteSelectedEdge();
  } else if (event.key === 'Escape') {
    deselectEdge();
  }
}

// Écouter les clics sur le canvas pour désélectionner
function handleGlobalClick(event: MouseEvent) {
  const target = event.target as Element;
  if (!target.closest('.edge-group')) {
    deselectEdge();
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeyDown);
  window.addEventListener('click', handleGlobalClick);
});

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown);
  window.removeEventListener('click', handleGlobalClick);
});

// Type de routage par défaut
const defaultRouting = ref<RoutingType>(RoutingType.Straight);

// Édition inline du libellé d'une arête (double-clic sur le libellé).
const editingEdgeId = ref<string | null>(null);
const editingValue = ref('');

function startEditingLabel(edgeId: string, event: MouseEvent) {
  event.stopPropagation();
  const edge = graphStore.edges[edgeId];
  if (!edge) return;
  editingEdgeId.value = edgeId;
  editingValue.value = (edge.data?.name as string) ?? '';
}

function commitEditingLabel() {
  const id = editingEdgeId.value;
  if (!id) return;
  const edge = graphStore.edges[id];
  if (edge) {
    graphStore.updateEdge(id, {
      data: { ...(edge.data ?? {}), name: editingValue.value },
    });
  }
  editingEdgeId.value = null;
}

function cancelEditingLabel() {
  editingEdgeId.value = null;
}

function handleLabelKeydown(event: KeyboardEvent) {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault();
    commitEditingLabel();
  } else if (event.key === 'Escape') {
    event.preventDefault();
    cancelEditingLabel();
  }
}

interface RenderedEdge {
  id: string;
  sourceX: number;
  sourceY: number;
  targetX: number;
  targetY: number;
  path: string;
  arrowAngle: number;
  midX: number;
  midY: number;
  label: string;
  strokeDasharray: string;
  /** Vrai si l'arête est estompée par le filtre actif. */
  dimmed: boolean;
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

/**
 * Résout l'extrémité visible d'une arête : si le noeud est caché dans un
 * conteneur replié, l'arête doit aboutir au conteneur replié le plus
 * extérieur (sinon la flèche pointait dans le vide à l'intérieur du bloc).
 */
function resolveVisibleEndpoint(nodeId: string): string {
  let effective = nodeId;
  let current = graphStore.nodes[nodeId];
  while (current?.parentId) {
    const parent = graphStore.nodes[current.parentId];
    if (parent?.data?.collapsed === true) effective = parent.id;
    current = parent;
  }
  return effective;
}

// Calcule les points de départ et d'arrivée de chaque arête avec intersection des bords
const renderedEdges = computed((): RenderedEdge[] => {
  return Object.values(graphStore.edges).map(edge => {
    const sourceNode = graphStore.nodes[edge.sourceId];
    const targetNode = graphStore.nodes[edge.targetId];

    if (!sourceNode || !targetNode) return null;
    if (filterable.isEdgeHidden(edge)) return null;

    // Reroutage vers les ancêtres repliés visibles ; une arête interne à
    // un même conteneur replié n'est pas rendue.
    const sourceVisibleId = resolveVisibleEndpoint(edge.sourceId);
    const targetVisibleId = resolveVisibleEndpoint(edge.targetId);
    if (sourceVisibleId === targetVisibleId) return null;

    // Centres des noeuds
    const sourceCenter = getNodeCenter(sourceVisibleId, graphStore.nodes);
    const targetCenter = getNodeCenter(targetVisibleId, graphStore.nodes);

    // Points d'intersection avec les bords (les flèches ne traversent plus les noeuds!)
    const sourcePoint = calculateEdgeIntersection(
      sourceVisibleId,
      targetCenter.x,
      targetCenter.y,
      graphStore.nodes
    );

    const targetPoint = calculateEdgeIntersection(
      targetVisibleId,
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

    // Dasharray dérivé du lineStyle du type de relation
    const lineStyle = edge.data?.lineStyle as string | undefined;
    const strokeDasharray =
      lineStyle === 'dashed' ? '8,4' :
      lineStyle === 'dotted' ? '2,3' :
      'none';

    return {
      id: edge.id,
      sourceX: sourcePoint.x,
      sourceY: sourcePoint.y,
      targetX: targetPoint.x,
      targetY: targetPoint.y,
      path,
      arrowAngle,
      midX: (sourcePoint.x + targetPoint.x) / 2,
      midY: (sourcePoint.y + targetPoint.y) / 2,
      label: (edge.data?.name as string) ?? '',
      strokeDasharray,
      dimmed: filterable.isEdgeDimmed(edge),
    };
  }).filter((e): e is RenderedEdge => e !== null);
});


// Helper pour obtenir les propriétés de flèche d'un edge
function getEdgeArrowProps(edge: Edge) {
  return {
    startArrow: (edge.startArrow as ArrowType) ?? ArrowType.Dot,
    endArrow: (edge.endArrow as ArrowType) ?? ArrowType.Arrow,
    size: edge.arrowSize ?? 10,
  };
}

// Helper pour générer le SVG d'un marker.
// Les générateurs d'ARROW_MARKERS produisent un SVG avec `currentColor` pour
// fill/stroke. On remplace cette valeur par la couleur demandée afin que le
// marqueur suive EXACTEMENT la couleur du trait, indépendamment de l'héritage
// CSS (sinon le trait est en gris-thème mais la flèche reste noire).
function generateMarkerSVG(type: ArrowType, size: number, color: string, _position: 'start' | 'end'): string {
  if (type === ArrowType.None) return '';

  const markerGenerator = ARROW_MARKERS[type];
  if (!markerGenerator) return '';

  const isFilled = type.includes('filled');
  return markerGenerator(size, isFilled).replace(/currentColor/g, color);
}

// Helper pour calculer refX/refY selon le type
function getMarkerRefPoint(type: ArrowType, position: 'start' | 'end', size: number): { refX: number; refY: number } {
  const center = size / 2;

  const centeredTypes = [ArrowType.Dot, ArrowType.SmallDot, ArrowType.Circle, ArrowType.FilledCircle];
  const diamondTypes = [ArrowType.Diamond, ArrowType.FilledDiamond, ArrowType.ArchiComposition, ArrowType.ArchiAggregation];
  const squareTypes = [ArrowType.Square, ArrowType.FilledSquare];

  if (centeredTypes.includes(type) || diamondTypes.includes(type) || squareTypes.includes(type)) {
    return { refX: center, refY: center };
  }

  if (position === 'end') {
    return { refX: size, refY: center };
  } else {
    return { refX: 0, refY: center };
  }
}

// Génère tous les markers uniques nécessaires
const allMarkers = computed(() => {
  const markers: Array<{ id: string; svg: string; refX: number; refY: number; orient: string; size: number }> = [];
  const seen = new Set<string>();

  // Fonction helper pour ajouter un marker
  const addMarker = (type: ArrowType, color: string, position: 'start' | 'end', size: number) => {
    if (type === ArrowType.None) return;

    // La taille fait partie de l'identité du marqueur : deux arêtes de même
    // type mais d'arrowSize différents partageaient le premier marqueur vu.
    const id = `arrow-${type}-${position}-${color.replace('#', '')}-${size}`;
    if (seen.has(id)) return;
    seen.add(id);

    const svg = generateMarkerSVG(type, size, color, position);
    const { refX, refY } = getMarkerRefPoint(type, position, size);
    const orient = position === 'end' ? 'auto' : 'auto-start-reverse';

    markers.push({ id, svg, refX, refY, orient, size });
  };

  // Parcourir tous les edges pour collecter les types de flèches utilisés
  Object.values(graphStore.edges).forEach(edge => {
    const { startArrow, endArrow, size } = getEdgeArrowProps(edge);

    // Markers normaux (couleur thème)
    addMarker(startArrow, edgeColor.value, 'start', size);
    addMarker(endArrow, edgeColor.value, 'end', size);

    // Markers sélectionnés (bleu)
    addMarker(startArrow, '#3b82f6', 'start', size);
    addMarker(endArrow, '#3b82f6', 'end', size);
  });

  return markers;
});

// Helper pour obtenir l'URL du marker pour un edge
function getMarkerUrl(edge: Edge, position: 'start' | 'end', isSelected: boolean): string {
  const { startArrow, endArrow, size } = getEdgeArrowProps(edge);
  const type = position === 'start' ? startArrow : endArrow;

  if (type === ArrowType.None) return '';

  const color = isSelected ? '#3b82f6' : edgeColor.value;
  const id = `arrow-${type}-${position}-${color.replace('#', '')}-${size}`;
  return `url(#${id})`;
}
</script>

<template>
  <g class="edge-layer">
    <!-- Définition des markers dynamiques -->
    <defs>
      <marker
        v-for="marker in allMarkers"
        :key="marker.id"
        :id="marker.id"
        :markerWidth="marker.size"
        :markerHeight="marker.size"
        :refX="marker.refX"
        :refY="marker.refY"
        :orient="marker.orient"
        markerUnits="userSpaceOnUse"
        v-html="marker.svg"
      />
    </defs>

    <!-- Arêtes existantes -->
    <g
      v-for="edge in renderedEdges"
      :key="edge.id"
      class="edge-group"
      :opacity="edge.dimmed ? 0.25 : undefined"
      @click="selectEdge(edge.id, $event)"
      @contextmenu="handleEdgeContextMenu(edge.id, $event)"
    >
      <!-- Zone de hit plus large pour la sélection -->
      <path
        :d="edge.path"
        fill="none"
        stroke="transparent"
        stroke-width="12"
        vector-effect="non-scaling-stroke"
        class="edge-hitbox cursor-pointer"
        @dblclick="startEditingLabel(edge.id, $event)"
      />
      <!-- Halo de sélection -->
      <path
        v-if="selectedEdgeId === edge.id"
        :d="edge.path"
        fill="none"
        stroke="var(--accent-selected)"
        stroke-width="6"
        stroke-opacity="0.3"
        vector-effect="non-scaling-stroke"
        class="edge-selection-halo"
      />
      <!-- Trait visible -->
      <path
        :d="edge.path"
        fill="none"
        :stroke="selectedEdgeId === edge.id ? '#3b82f6' : edgeColor"
        stroke-width="2"
        :stroke-dasharray="edge.strokeDasharray"
        vector-effect="non-scaling-stroke"
        :marker-start="getMarkerUrl(graphStore.edges[edge.id], 'start', selectedEdgeId === edge.id)"
        :marker-end="getMarkerUrl(graphStore.edges[edge.id], 'end', selectedEdgeId === edge.id)"
        class="edge-line"
      />

      <!-- Libellé (affichage) -->
      <g
        v-if="edge.label && editingEdgeId !== edge.id"
        class="edge-label cursor-text"
        @dblclick="startEditingLabel(edge.id, $event)"
      >
        <rect
          :x="edge.midX - (edge.label.length * 3.5 + 4) * fontMul"
          :y="edge.midY - 10 * fontMul"
          :width="(edge.label.length * 7 + 8) * fontMul"
          :height="18 * fontMul"
          fill="#ffffff"
          :stroke="selectedEdgeId === edge.id ? '#3b82f6' : '#d1d5db'"
          stroke-width="1"
          :rx="3 * fontMul"
          vector-effect="non-scaling-stroke"
        />
        <text
          :x="edge.midX"
          :y="edge.midY + 4 * fontMul"
          text-anchor="middle"
          :font-size="12 * fontMul"
          :fill="selectedEdgeId === edge.id ? '#1e40af' : '#333'"
          class="select-none pointer-events-none"
        >
          {{ edge.label }}
        </text>
      </g>

      <!-- Libellé vide cliquable (visible uniquement quand l'edge est sélectionnée) -->
      <g
        v-if="!edge.label && editingEdgeId !== edge.id && selectedEdgeId === edge.id"
        class="edge-label-placeholder cursor-text"
        @dblclick="startEditingLabel(edge.id, $event)"
      >
        <rect
          :x="edge.midX - 24 * fontMul"
          :y="edge.midY - 10 * fontMul"
          :width="48 * fontMul"
          :height="18 * fontMul"
          fill="#ffffff"
          stroke="var(--accent-selected)"
          stroke-width="1"
          stroke-dasharray="3,2"
          :rx="3 * fontMul"
          vector-effect="non-scaling-stroke"
        />
        <text
          :x="edge.midX"
          :y="edge.midY + 4 * fontMul"
          text-anchor="middle"
          :font-size="11 * fontMul"
          fill="#9ca3af"
          font-style="italic"
          class="select-none pointer-events-none"
        >
          + nom
        </text>
      </g>

      <!-- Libellé (édition inline) -->
      <foreignObject
        v-if="editingEdgeId === edge.id"
        :x="edge.midX - 80"
        :y="edge.midY - 12"
        width="160"
        height="24"
        @mousedown.stop
        @click.stop
      >
        <input
          v-model="editingValue"
          @keydown="handleLabelKeydown"
          @blur="commitEditingLabel"
          class="w-full h-full px-1 text-xs border border-blue-500 rounded outline-none text-center"
          autofocus
          placeholder="Nom de la relation…"
        />
      </foreignObject>
    </g>
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
