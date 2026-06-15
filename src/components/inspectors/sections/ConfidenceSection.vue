<!-- src/components/inspectors/sections/ConfidenceSection.vue -->
<script setup lang="ts">
import { toRef } from 'vue'
import {
  useModelingConfidence,
  ModelingMaturity,
  MATURITY_LABELS,
  MATURITY_DESCRIPTIONS,
  MATURITY_VISUAL_STYLES,
} from '../../../composables/traits/useModelingConfidence'
import { useI18n } from '../../../composables/useI18n'

const { t } = useI18n()

interface Props {
  nodeId: string
}
const props = defineProps<Props>()
const nodeIdRef = toRef(props, 'nodeId')

const { maturity, confidence, visualStyle, setMaturity, setConfidence } = useModelingConfidence({
  nodeId: nodeIdRef,
})

const MATURITIES = Object.values(ModelingMaturity)
</script>

<template>
  <section class="p-3 border-b app-border">
    <h3 class="app-section-title mb-2">{{ t('section.confidence.title') }}</h3>

    <!-- État courant -->
    <div class="flex items-center gap-2 mb-3">
      <span
        class="inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold text-white"
        :style="{ backgroundColor: visualStyle.badgeColor }"
        v-tooltip="MATURITY_DESCRIPTIONS[maturity]"
      >
        {{ visualStyle.badge }}
      </span>
      <span class="text-sm font-medium">{{ MATURITY_LABELS[maturity] }}</span>
    </div>

    <!-- Échelle -->
    <div class="mb-3">
      <label class="block text-xs app-muted mb-1">{{ t('section.confidence.level') }}</label>
      <div class="grid grid-cols-7 gap-0.5">
        <button
          v-for="level in MATURITIES"
          :key="level"
          class="py-1 text-xs rounded transition-opacity border"
          :style="{
            backgroundColor: MATURITY_VISUAL_STYLES[level].badgeColor,
            color: 'white',
            opacity: maturity === level ? 1 : 0.35,
            borderColor:
              maturity === level ? MATURITY_VISUAL_STYLES[level].badgeColor : 'transparent',
          }"
          v-tooltip="
            t('section.confidence.levelTooltip', {
              label: MATURITY_LABELS[level],
              description: MATURITY_DESCRIPTIONS[level],
            })
          "
          @click="setMaturity(level)"
        >
          {{ MATURITY_VISUAL_STYLES[level].badge }}
        </button>
      </div>
    </div>

    <!-- Confiance (0–100%) -->
    <div>
      <label class="flex items-center justify-between text-xs app-muted mb-1">
        <span>{{ t('section.confidence.confidence') }}</span>
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
