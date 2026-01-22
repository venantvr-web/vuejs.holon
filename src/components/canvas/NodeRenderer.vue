<!-- src/components/canvas/NodeRenderer.vue -->
<script setup lang="ts">
import { computed, defineAsyncComponent, ref, toRef } from 'vue';
import { useGraphStore } from '../../stores/graph';
import {
  useDraggable,
  useResizable,
  useDockable,
  useEditable,
  useStyleable,
  useSelectable,
  useTooltipable,
  useCollapsible,
  useZIndexable,
  useLockable,
  useShapeable,
  useTypeable,
  PRESET_COLORS,
  NodeShape,
  generateShapePath,
  getShapesByCategory,
  ARCHIMATE_TYPES,
  getAllArchimateTypes,
} from '../../composables/traits';

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
const nodeIdRef = toRef(props, 'nodeId');
const zoomLevelRef = computed(() => props.zoomLevel ?? 1);

// --- Traits de base ---
const { isDragging, handleDragStart } = useDraggable({
  nodeId: nodeIdRef,
  zoomLevel: zoomLevelRef,
  onDragMove: () => docking.updatePotentialParent(),
  onDragEnd: () => docking.commitDocking(),
});

const { isResizing, handleResizeStart } = useResizable({
  nodeId: nodeIdRef,
  zoomLevel: zoomLevelRef,
});

const docking = useDockable({
  nodeId: nodeIdRef,
  isDragging,
});

const { isEditing, editValue, displayValue, startEditing, commitEdit, handleEditKeydown } = useEditable({
  nodeId: nodeIdRef,
});

const { isStylePanelOpen, currentStyle, toggleStylePanel, updateFill, updateStroke } = useStyleable({
  nodeId: nodeIdRef,
});

const { isSelected, select } = useSelectable({
  nodeId: nodeIdRef,
});

const tooltip = useTooltipable({
  nodeId: nodeIdRef,
});

// --- Nouveaux traits ---
const collapsible = useCollapsible({
  nodeId: nodeIdRef,
});

const zIndexable = useZIndexable({
  nodeId: nodeIdRef,
});

const lockable = useLockable({
  nodeId: nodeIdRef,
});

const shapeable = useShapeable({
  nodeId: nodeIdRef,
});

const typeable = useTypeable({
  nodeId: nodeIdRef,
});

// --- État local ---
const isHovered = ref(false);
const showShapePanel = ref(false);
const showTypePanel = ref(false);
const node = computed(() => graphStore.nodes[props.nodeId]);

// Pour la récursion
const ChildNodeRenderer = defineAsyncComponent(() => import('./NodeRenderer.vue'));

const children = computed(() => {
  if (node.value?.type !== 'container') return [];
  if (collapsible.isCollapsed.value) return []; // Ne pas afficher les enfants si collapsed
  return Object.values(graphStore.nodes)
    .filter(n => n.parentId === props.nodeId)
    .sort((a, b) => (a.data?.zIndex ?? 0) - (b.data?.zIndex ?? 0)); // Tri par z-index
});

const transform = computed(() => `translate(${node.value?.geometry.x ?? 0} ${node.value?.geometry.y ?? 0})`);

const showResizeHandle = computed(() => {
  if (lockable.isSizeLocked.value) return false;
  return (isHovered.value || isSelected.value) && !isDragging.value && !props.connectionMode;
});

const isDropTarget = computed(() => {
  return node.value?.type === 'container' && docking.potentialParent.value === props.nodeId;
});

// Path SVG pour la forme
const shapePath = computed(() => {
  if (!node.value) return '';
  return generateShapePath(shapeable.shape.value, node.value.geometry.w, node.value.geometry.h);
});

// Groupes de formes pour le panneau
const shapeGroups = getShapesByCategory();

// Types Archimate pour le panneau
const archimateTypes = getAllArchimateTypes();

// --- Handlers ---
function handleMouseDown(event: MouseEvent) {
  if (event.button !== 0) return;
  if (lockable.isPositionLocked.value && !props.connectionMode) return;

  // Mode connexion
  if (props.connectionMode) {
    emit('finish-connection', props.nodeId);
    return;
  }

  // Shift + clic pour connexion
  if (event.shiftKey) {
    event.stopPropagation();
    emit('start-connection', props.nodeId);
    return;
  }

  // Sélection
  select(event.ctrlKey || event.metaKey);

  // Démarrer le drag (sauf si verrouillé)
  if (!lockable.isPositionLocked.value) {
    handleDragStart(event);
  }
}

function handleDoubleClick(event: MouseEvent) {
  event.stopPropagation();

  // Container: toggle collapse
  if (node.value.type === 'container' && collapsible.canCollapse.value) {
    collapsible.toggle();
    return;
  }

  // Si enfant d'un container, extraire
  if (node.value.parentId !== null) {
    docking.undockFromParent();
  } else if (!lockable.isContentLocked.value) {
    // Sinon, éditer le label
    startEditing();
  }
}

function handleKeyDown(event: KeyboardEvent) {
  if (isEditing.value || tooltip.isEditingComment.value) return;

  if (event.key === 'Delete' || event.key === 'Backspace') {
    if (!lockable.isLocked.value) {
      event.preventDefault();
      graphStore.deleteNode(props.nodeId);
    }
  } else if (event.key === 'F2' || event.key === 'Enter') {
    if (!lockable.isContentLocked.value) {
      event.preventDefault();
      startEditing();
    }
  } else if (event.key === 'l' && event.ctrlKey) {
    // Ctrl+L pour lock/unlock
    event.preventDefault();
    lockable.toggleLock();
  } else if (event.key === 'ArrowUp' && event.ctrlKey) {
    // Ctrl+Up pour bring forward
    event.preventDefault();
    zIndexable.bringForward();
  } else if (event.key === 'ArrowDown' && event.ctrlKey) {
    // Ctrl+Down pour send backward
    event.preventDefault();
    zIndexable.sendBackward();
  }
}

function handleContextMenu(event: MouseEvent) {
  event.preventDefault();
  event.stopPropagation();
  toggleStylePanel();
}

function handleMouseEnter() {
  isHovered.value = true;
  tooltip.showTooltip();
}

function handleMouseLeave() {
  isHovered.value = false;
  tooltip.hideTooltip();

  // Fermer les panneaux si on quitte le noeud
  if (isStylePanelOpen.value) {
    setTimeout(() => {
      if (!isHovered.value) {
        isStylePanelOpen.value = false;
      }
    }, 200);
  }
}

function handleCommentKeydown(event: KeyboardEvent) {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault();
    tooltip.commitComment();
  } else if (event.key === 'Escape') {
    event.preventDefault();
    tooltip.cancelEditComment();
  }
}

function handleResizeStartIfNotLocked(event: MouseEvent) {
  if (lockable.isSizeLocked.value) return;
  handleResizeStart(event);
}
</script>

<template>
  <g
    v-if="node"
    :transform="transform"
    @mousedown="handleMouseDown"
    @dblclick="handleDoubleClick"
    @keydown="handleKeyDown"
    @contextmenu="handleContextMenu"
    @mouseenter="handleMouseEnter"
    @mouseleave="handleMouseLeave"
    tabindex="0"
    :class="[
      'focus:outline-none',
      lockable.isPositionLocked.value ? 'cursor-not-allowed' : 'cursor-move'
    ]"
  >
    <!-- Forme du noeud (utilise path pour les formes complexes) -->
    <path
      v-if="shapeable.shape.value !== NodeShape.Rectangle && shapeable.shape.value !== NodeShape.RoundedRectangle"
      :d="shapePath"
      :fill="typeable.typeColor.value !== '#ffffff' ? typeable.typeColor.value : currentStyle.fill"
      :stroke="connectionMode ? '#3b82f6' : (isDropTarget ? '#22c55e' : (isSelected ? '#3b82f6' : currentStyle.stroke))"
      :stroke-width="connectionMode || isDropTarget || isSelected ? 3 : currentStyle.strokeWidth"
      :stroke-dasharray="isDropTarget ? '5,5' : 'none'"
      :opacity="currentStyle.opacity"
    />
    <!-- Rectangle standard -->
    <rect
      v-else
      :width="node.geometry.w"
      :height="node.geometry.h"
      :fill="typeable.typeColor.value !== '#ffffff' ? typeable.typeColor.value : currentStyle.fill"
      :stroke="connectionMode ? '#3b82f6' : (isDropTarget ? '#22c55e' : (isSelected ? '#3b82f6' : currentStyle.stroke))"
      :stroke-width="connectionMode || isDropTarget || isSelected ? 3 : currentStyle.strokeWidth"
      :stroke-dasharray="isDropTarget ? '5,5' : 'none'"
      :opacity="currentStyle.opacity"
      :rx="shapeable.shape.value === NodeShape.RoundedRectangle ? 8 : 4"
    />

    <!-- Indicateur collapsed -->
    <g v-if="collapsible.isCollapsed.value" class="pointer-events-none">
      <text
        :x="node.geometry.w / 2"
        :y="node.geometry.h / 2 + 5"
        text-anchor="middle"
        font-size="20"
        fill="#666"
      >
        ▶
      </text>
      <text
        :x="node.geometry.w / 2"
        :y="node.geometry.h - 8"
        text-anchor="middle"
        font-size="10"
        fill="#999"
      >
        {{ collapsible.childCount.value }} enfant(s)
      </text>
    </g>

    <!-- Indicateur de drop potentiel -->
    <rect
      v-if="isDragging && docking.potentialParent.value"
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

    <!-- Enfants récursifs (si pas collapsed) -->
    <template v-if="node.type === 'container' && !collapsible.isCollapsed.value && children.length">
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

    <!-- Icône type Archimate -->
    <text
      v-if="typeable.typeIcon.value"
      x="8"
      :y="node.geometry.h - 8"
      font-size="16"
      class="pointer-events-none"
    >
      {{ typeable.typeIcon.value }}
    </text>

    <!-- Label (mode lecture) -->
    <text
      v-if="!isEditing"
      :x="10"
      :y="20"
      fill="#333"
      font-size="14"
      pointer-events="none"
      class="select-none"
    >
      {{ displayValue }}
    </text>

    <!-- Label (mode édition) -->
    <foreignObject
      v-if="isEditing"
      x="4"
      y="4"
      :width="node.geometry.w - 8"
      height="24"
    >
      <input
        v-model="editValue"
        @keydown="handleEditKeydown"
        @blur="commitEdit"
        class="w-full h-full px-1 text-sm border border-blue-500 rounded outline-none"
        autofocus
      />
    </foreignObject>

    <!-- Badge enfant -->
    <circle
      v-if="node.parentId"
      cx="8"
      cy="8"
      r="4"
      fill="#8b5cf6"
      class="pointer-events-none"
    />

    <!-- Indicateur verrouillé -->
    <text
      v-if="lockable.isLocked.value"
      :x="node.geometry.w - 20"
      :y="node.geometry.h - 8"
      font-size="12"
      fill="#666"
      class="pointer-events-none"
    >
      🔒
    </text>

    <!-- Bouton collapse (pour containers) -->
    <g
      v-if="node.type === 'container' && collapsible.canCollapse.value && (isHovered || isSelected)"
      class="cursor-pointer"
      @click.stop="collapsible.toggle"
    >
      <circle
        :cx="node.geometry.w / 2"
        cy="-8"
        r="8"
        fill="#e5e7eb"
        stroke="#9ca3af"
        stroke-width="1"
      />
      <text
        :x="node.geometry.w / 2"
        y="-4"
        text-anchor="middle"
        font-size="10"
        font-weight="bold"
        fill="#666"
        pointer-events="none"
      >
        {{ collapsible.isCollapsed.value ? '+' : '-' }}
      </text>
    </g>

    <!-- Icône commentaire "?" (coin supérieur droit) -->
    <g
      v-if="isHovered || isSelected || tooltip.hasComment.value"
      class="cursor-pointer"
      @click.stop="tooltip.startEditComment"
      @mouseenter="tooltip.showTooltip"
      @mouseleave="tooltip.hideTooltip"
    >
      <circle
        :cx="node.geometry.w - 10"
        :cy="10"
        r="8"
        :fill="tooltip.hasComment.value ? '#fbbf24' : '#e5e7eb'"
        :stroke="tooltip.hasComment.value ? '#f59e0b' : '#9ca3af'"
        stroke-width="1"
      />
      <text
        :x="node.geometry.w - 10"
        :y="14"
        text-anchor="middle"
        font-size="12"
        font-weight="bold"
        :fill="tooltip.hasComment.value ? '#78350f' : '#6b7280'"
        pointer-events="none"
      >
        ?
      </text>
    </g>

    <!-- Tooltip (commentaire affiché au survol) -->
    <foreignObject
      v-if="tooltip.isTooltipVisible.value && tooltip.hasComment.value && !tooltip.isEditingComment.value"
      :x="node.geometry.w + 8"
      y="-10"
      width="200"
      height="120"
    >
      <div
        class="bg-yellow-50 border border-yellow-300 rounded-lg shadow-lg p-2 text-sm text-gray-700"
        @mouseenter="tooltip.showTooltip"
        @mouseleave="tooltip.hideTooltip"
      >
        <div class="whitespace-pre-wrap">{{ tooltip.tooltipContent.value }}</div>
      </div>
    </foreignObject>

    <!-- Éditeur de commentaire -->
    <foreignObject
      v-if="tooltip.isEditingComment.value"
      :x="node.geometry.w + 8"
      y="-10"
      width="220"
      height="140"
    >
      <div
        class="bg-white border border-blue-400 rounded-lg shadow-lg p-2"
        @mousedown.stop
        @click.stop
      >
        <div class="text-xs font-medium text-gray-600 mb-1">Commentaire</div>
        <textarea
          v-model="tooltip.editCommentValue.value"
          @keydown="handleCommentKeydown"
          class="w-full h-20 px-2 py-1 text-sm border border-gray-300 rounded resize-none outline-none focus:border-blue-500"
          placeholder="Ajouter un commentaire..."
          autofocus
        />
        <div class="flex justify-between mt-2">
          <button
            v-if="tooltip.hasComment.value"
            @click="tooltip.deleteComment"
            class="text-xs text-red-500 hover:text-red-700"
          >
            Supprimer
          </button>
          <div class="flex gap-2 ml-auto">
            <button
              @click="tooltip.cancelEditComment"
              class="px-2 py-1 text-xs text-gray-600 hover:text-gray-800"
            >
              Annuler
            </button>
            <button
              @click="tooltip.commitComment"
              class="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              OK
            </button>
          </div>
        </div>
      </div>
    </foreignObject>

    <!-- Point de connexion -->
    <circle
      v-if="!connectionMode && (isHovered || isSelected)"
      :cx="node.geometry.w"
      :cy="node.geometry.h / 2"
      r="6"
      fill="#3b82f6"
      class="cursor-crosshair hover:r-8 transition-all"
      @mousedown.stop.prevent="$emit('start-connection', nodeId)"
    />

    <!-- Poignée de redimensionnement -->
    <g
      v-if="showResizeHandle || isResizing"
      @mousedown="handleResizeStartIfNotLocked"
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

    <!-- Panneau de style (clic droit) -->
    <foreignObject
      v-if="isStylePanelOpen"
      :x="node.geometry.w + 8"
      y="0"
      width="280"
      height="500"
    >
      <div
        class="bg-white border rounded-lg shadow-lg p-3 text-sm max-h-96 overflow-y-auto"
        @mousedown.stop
        @click.stop
      >
        <!-- Couleurs -->
        <div class="font-medium mb-2">Couleur de fond</div>
        <div class="grid grid-cols-6 gap-1 mb-3">
          <button
            v-for="color in PRESET_COLORS.slice(0, 24)"
            :key="'fill-' + color"
            :style="{ backgroundColor: color }"
            class="w-6 h-6 rounded border border-gray-300 hover:scale-110 transition-transform"
            :class="{ 'ring-2 ring-blue-500': currentStyle.fill === color }"
            @click="updateFill(color)"
          />
        </div>

        <div class="font-medium mb-2">Couleur de bordure</div>
        <div class="grid grid-cols-6 gap-1 mb-3">
          <button
            v-for="color in PRESET_COLORS.slice(0, 24)"
            :key="'stroke-' + color"
            :style="{ backgroundColor: color }"
            class="w-6 h-6 rounded border border-gray-300 hover:scale-110 transition-transform"
            :class="{ 'ring-2 ring-blue-500': currentStyle.stroke === color }"
            @click="updateStroke(color)"
          />
        </div>

        <!-- Formes -->
        <div class="border-t pt-3 mt-3">
          <div class="font-medium mb-2 flex justify-between items-center">
            <span>Forme: {{ shapeable.shapeLabel.value }}</span>
            <button
              @click="showShapePanel = !showShapePanel"
              class="text-xs text-blue-500 hover:text-blue-700"
            >
              {{ showShapePanel ? 'Masquer' : 'Changer' }}
            </button>
          </div>
          <div v-if="showShapePanel" class="space-y-2">
            <div v-for="(shapes, category) in shapeGroups" :key="category">
              <div class="text-xs text-gray-500 mb-1 capitalize">{{ category }}</div>
              <div class="grid grid-cols-4 gap-1">
                <button
                  v-for="shapeItem in shapes"
                  :key="shapeItem.shape"
                  @click="shapeable.setShape(shapeItem.shape)"
                  class="p-1 text-xs border rounded hover:bg-gray-100"
                  :class="{ 'bg-blue-100 border-blue-500': shapeable.shape.value === shapeItem.shape }"
                  :title="shapeItem.label"
                >
                  {{ shapeItem.label.slice(0, 6) }}
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Types Archimate -->
        <div class="border-t pt-3 mt-3">
          <div class="font-medium mb-2 flex justify-between items-center">
            <span>Type: {{ typeable.typeLabel.value || 'Aucun' }}</span>
            <button
              @click="showTypePanel = !showTypePanel"
              class="text-xs text-blue-500 hover:text-blue-700"
            >
              {{ showTypePanel ? 'Masquer' : 'Changer' }}
            </button>
          </div>
          <div v-if="showTypePanel" class="space-y-2 max-h-40 overflow-y-auto">
            <button
              @click="typeable.clearType()"
              class="w-full text-left p-1 text-xs hover:bg-gray-100 rounded"
              :class="{ 'bg-gray-200': !typeable.archimateType.value }"
            >
              Aucun type
            </button>
            <div v-for="(layerConfig, layerKey) in ARCHIMATE_TYPES" :key="layerKey">
              <div
                class="text-xs font-medium px-1 py-0.5 rounded mb-1"
                :style="{ backgroundColor: layerConfig.color }"
              >
                {{ layerConfig.label }}
              </div>
              <div class="grid grid-cols-2 gap-1">
                <button
                  v-for="(typeConfig, typeKey) in layerConfig.types"
                  :key="typeKey"
                  @click="typeable.setType(typeKey)"
                  class="p-1 text-xs border rounded hover:bg-gray-100 text-left"
                  :class="{ 'ring-2 ring-blue-500': typeable.archimateType.value === typeKey }"
                >
                  {{ typeConfig.icon }} {{ typeConfig.label }}
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Actions -->
        <div class="border-t pt-3 mt-3 space-y-2">
          <div class="font-medium mb-2">Actions</div>
          <div class="flex flex-wrap gap-2">
            <button
              @click="lockable.toggleLock()"
              class="px-2 py-1 text-xs border rounded hover:bg-gray-100"
              :class="{ 'bg-yellow-100': lockable.isLocked.value }"
            >
              {{ lockable.isLocked.value ? '🔓 Déverrouiller' : '🔒 Verrouiller' }}
            </button>
            <button
              @click="zIndexable.bringToFront()"
              class="px-2 py-1 text-xs border rounded hover:bg-gray-100"
            >
              ↑ Devant
            </button>
            <button
              @click="zIndexable.sendToBack()"
              class="px-2 py-1 text-xs border rounded hover:bg-gray-100"
            >
              ↓ Derrière
            </button>
          </div>
        </div>
      </div>
    </foreignObject>
  </g>
</template>

<style scoped>
g:focus > rect:first-of-type,
g:focus > path:first-of-type {
  stroke: #3b82f6;
  stroke-width: 2;
}
</style>
