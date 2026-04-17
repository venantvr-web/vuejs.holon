
<!-- src/components/inspectors/sections/StyleSection.vue -->
<script setup lang="ts">
import { toRef, ref, computed } from 'vue';
import { useStyleable, PRESET_COLORS } from '../../../composables/traits/useStyleable';

interface Props {
  nodeId: string;
}
const props = defineProps<Props>();
const nodeIdRef = toRef(props, 'nodeId');

const {
  currentStyle,
  updateFill,
  updateStroke,
  updateStrokeWidth,
  updateOpacity,
} = useStyleable({ nodeId: nodeIdRef });

// Palette : 4 lignes de couleurs principales (blanc → gris → rouge → orange …)
// soit 40 teintes, largement suffisant pour un usage courant.
const PALETTE = computed(() => PRESET_COLORS.slice(0, 60));

// Modèle bidirectionnel pour les pickers HTML <input type="color">
const customFill = ref<string>(currentStyle.value.fill);
const customStroke = ref<string>(currentStyle.value.stroke);

function applyCustomFill(value: string) {
  customFill.value = value;
  updateFill(value);
}
function applyCustomStroke(value: string) {
  customStroke.value = value;
  updateStroke(value);
}
</script>

<template>
  <section class="p-3 border-b">
    <h3 class="text-sm font-semibold mb-2 app-fg">Apparence</h3>

    <!-- Couleur de fond -->
    <label class="block text-xs app-muted mb-1">Couleur de fond</label>
    <div class="grid grid-cols-10 gap-0.5 mb-2">
      <button
        v-for="color in PALETTE"
        :key="'fill-' + color"
        :style="{ backgroundColor: color }"
        class="w-5 h-5 rounded-sm border border-gray-300 hover:scale-125 transition-transform"
        :class="{ 'ring-2 ring-blue-500 z-10 relative': currentStyle.fill === color }"
        :title="color"
        @click="updateFill(color)"
      />
    </div>
    <div class="flex items-center gap-2 mb-3">
      <input
        type="color"
        :value="currentStyle.fill"
        class="w-7 h-7 border border-gray-300 rounded cursor-pointer"
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
        class="w-5 h-5 rounded-sm border border-gray-300 hover:scale-125 transition-transform"
        :class="{ 'ring-2 ring-blue-500 z-10 relative': currentStyle.stroke === color }"
        :title="color"
        @click="updateStroke(color)"
      />
    </div>
    <div class="flex items-center gap-2 mb-3">
      <input
        type="color"
        :value="currentStyle.stroke"
        class="w-7 h-7 border border-gray-300 rounded cursor-pointer"
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
