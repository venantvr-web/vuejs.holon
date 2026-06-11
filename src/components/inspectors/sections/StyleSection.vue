
<!-- src/components/inspectors/sections/StyleSection.vue -->
<script setup lang="ts">
import { toRef, ref, computed } from 'vue';
import { useStyleable, PRESET_COLORS } from '../../../composables/traits/useStyleable';
import { useTypeable } from '../../../composables/traits/useTypeable';
import { useGraphStore } from '../../../stores/graph';

interface Props {
  nodeId: string;
}
const props = defineProps<Props>();
const nodeIdRef = toRef(props, 'nodeId');

const graphStore = useGraphStore();
const {
  currentStyle,
  updateFill,
  updateStroke,
  updateStrokeWidth,
  updateOpacity,
} = useStyleable({ nodeId: nodeIdRef });

// Lecture du type Archimate pour permettre à l'utilisateur de revenir à la
// couleur de la layer s'il a surchargé manuellement.
const { archimateType, typeLabel, typeTintFill } = useTypeable({ nodeId: nodeIdRef });

const node = computed(() => graphStore.nodes[props.nodeId]);
const hasCustomFill = computed(() => node.value?.data?.customFill === true);

// Quand l'utilisateur pique une couleur, on active le flag customFill pour
// qu'il prenne le pas sur le tint Archimate dans NodeRenderer.
function pickFill(color: string) {
  updateFill(color);
  flagCustomFill(true);
}

function flagCustomFill(value: boolean) {
  const current = node.value;
  if (!current) return;
  graphStore.updateNode(props.nodeId, {
    data: { ...(current.data ?? {}), customFill: value },
  });
}

function clearCustomFill() {
  flagCustomFill(false);
}

const PALETTE = computed(() => PRESET_COLORS.slice(0, 60));

function applyCustomFill(value: string) {
  pickFill(value);
}
function applyCustomStroke(value: string) {
  updateStroke(value);
}
</script>

<template>
  <section class="p-3 border-b app-border">
    <h3 class="app-section-title mb-2">Apparence</h3>

    <!-- Indicateur Archimate + retour à la couleur de layer -->
    <div
      v-if="archimateType && hasCustomFill"
      class="mb-3 p-2 rounded border app-border flex items-center justify-between gap-2"
      :style="{ backgroundColor: typeTintFill }"
    >
      <span class="text-xs app-fg truncate">
        Type {{ typeLabel }} — couleur surchargée
      </span>
      <button
        class="text-xs app-link flex-shrink-0"
        title="Revenir à la couleur de la layer Archimate"
        @click="clearCustomFill"
      >
        Revenir au type
      </button>
    </div>

    <!-- Couleur de fond -->
    <label class="block text-xs app-muted mb-1">Couleur de fond</label>
    <div class="grid grid-cols-10 gap-0.5 mb-2">
      <button
        v-for="color in PALETTE"
        :key="'fill-' + color"
        :style="{ backgroundColor: color }"
        class="w-5 h-5 rounded-sm border app-border hover:scale-125 transition-transform"
        :class="{ 'ring-2 app-ring-accent z-10 relative': currentStyle.fill === color && hasCustomFill }"
        :title="color"
        @click="pickFill(color)"
      />
    </div>
    <div class="flex items-center gap-2 mb-3">
      <input
        type="color"
        :value="currentStyle.fill"
        class="w-7 h-7 border app-border rounded cursor-pointer"
        title="Couleur personnalisée"
        @input="applyCustomFill(($event.target as HTMLInputElement).value)"
      />
      <code class="text-xs app-subtle font-mono">{{ currentStyle.fill }}</code>
    </div>

    <!-- Couleur de bordure -->
    <label class="block text-xs app-muted mb-1">Couleur de bordure</label>
    <div class="grid grid-cols-10 gap-0.5 mb-2">
      <button
        v-for="color in PALETTE"
        :key="'stroke-' + color"
        :style="{ backgroundColor: color }"
        class="w-5 h-5 rounded-sm border app-border hover:scale-125 transition-transform"
        :class="{ 'ring-2 app-ring-accent z-10 relative': currentStyle.stroke === color }"
        :title="color"
        @click="updateStroke(color)"
      />
    </div>
    <div class="flex items-center gap-2 mb-3">
      <input
        type="color"
        :value="currentStyle.stroke"
        class="w-7 h-7 border app-border rounded cursor-pointer"
        title="Couleur personnalisée"
        @input="applyCustomStroke(($event.target as HTMLInputElement).value)"
      />
      <code class="text-xs app-subtle font-mono">{{ currentStyle.stroke }}</code>
    </div>

    <!-- Épaisseur de bordure -->
    <label class="flex items-center justify-between text-xs app-muted mb-1">
      <span>Épaisseur de bordure</span>
      <span class="font-mono">{{ currentStyle.strokeWidth }} px</span>
    </label>
    <input
      type="range"
      min="0"
      max="8"
      step="0.5"
      :value="currentStyle.strokeWidth"
      class="w-full mb-3"
      @input="updateStrokeWidth(Number(($event.target as HTMLInputElement).value))"
    />

    <!-- Opacité -->
    <label class="flex items-center justify-between text-xs app-muted mb-1">
      <span>Opacité</span>
      <span class="font-mono">{{ Math.round(currentStyle.opacity * 100) }} %</span>
    </label>
    <input
      type="range"
      min="0"
      max="100"
      step="5"
      :value="Math.round(currentStyle.opacity * 100)"
      class="w-full"
      @input="updateOpacity(Number(($event.target as HTMLInputElement).value) / 100)"
    />
  </section>
</template>
