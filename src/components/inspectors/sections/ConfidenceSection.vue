
<!-- src/components/inspectors/sections/ConfidenceSection.vue -->
<script setup lang="ts">
import { toRef } from 'vue';
import {
  useModelingConfidence,
  ModelingMaturity,
  MATURITY_LABELS,
  MATURITY_DESCRIPTIONS,
  MATURITY_VISUAL_STYLES,
} from '../../../composables/traits/useModelingConfidence';

interface Props {
  nodeId: string;
}
const props = defineProps<Props>();
const nodeIdRef = toRef(props, 'nodeId');

const { maturity, confidence, visualStyle, setMaturity, setConfidence } =
  useModelingConfidence({ nodeId: nodeIdRef });

const MATURITIES = Object.values(ModelingMaturity);
</script>

<template>
  <section class="p-3 border-b">
    <h3 class="text-sm font-semibold mb-2 text-gray-700">Maturité du modèle</h3>

    <!-- État courant -->
    <div class="flex items-center gap-2 mb-3">
      <span
        class="inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold text-white"
        :style="{ backgroundColor: visualStyle.badgeColor }"
        :title="MATURITY_DESCRIPTIONS[maturity]"
      >
        {{ visualStyle.badge }}
      </span>
      <span class="text-sm font-medium">{{ MATURITY_LABELS[maturity] }}</span>
    </div>

    <!-- Échelle -->
    <div class="mb-3">
      <label class="block text-xs text-gray-600 mb-1">Niveau</label>
      <div class="grid grid-cols-7 gap-0.5">
        <button
          v-for="level in MATURITIES"
          :key="level"
          class="py-1 text-xs rounded transition-opacity border"
          :style="{
            backgroundColor: MATURITY_VISUAL_STYLES[level].badgeColor,
            color: 'white',
            opacity: maturity === level ? 1 : 0.35,
            borderColor: maturity === level ? MATURITY_VISUAL_STYLES[level].badgeColor : 'transparent',
          }"
          :title="`${MATURITY_LABELS[level]} — ${MATURITY_DESCRIPTIONS[level]}`"
          @click="setMaturity(level)"
        >
          {{ MATURITY_VISUAL_STYLES[level].badge }}
        </button>
      </div>
    </div>

    <!-- Confiance (0–100%) -->
    <div>
      <label class="flex items-center justify-between text-xs text-gray-600 mb-1">
        <span>Confiance</span>
        <span class="font-mono">{{ Math.round(confidence * 100) }} %</span>
      </label>
      <input
        type="range"
        min="0"
        max="100"
        step="5"
        :value="Math.round(confidence * 100)"
        class="w-full"
        @input="setConfidence(Number(($event.target as HTMLInputElement).value) / 100)"
      />
    </div>
  </section>
</template>
