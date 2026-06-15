<!-- src/components/inspectors/sections/ArrowSection.vue -->
<script setup lang="ts">
import { computed, toRef } from 'vue'
import { useArrowable, ArrowType } from '../../../composables/traits/useArrowable'
import { useI18n } from '../../../composables/useI18n'
import ArrowTypeSelector from '../../ui/controls/specialized/ArrowTypeSelector.vue'
import BaseSlider from '../../ui/controls/base/BaseSlider.vue'

const { t } = useI18n()

interface ArrowSectionProps {
  edgeId: string
}

const props = defineProps<ArrowSectionProps>()

const edgeIdRef = toRef(props, 'edgeId')
const arrowable = useArrowable({ edgeId: edgeIdRef })

// Computed bidirectionnels pour v-model
const startArrow = computed({
  get: () => arrowable.startArrow.value,
  set: (type: ArrowType) => arrowable.setStartArrow(type),
})

const endArrow = computed({
  get: () => arrowable.endArrow.value,
  set: (type: ArrowType) => arrowable.setEndArrow(type),
})

const arrowSize = computed({
  get: () => arrowable.arrowSize.value,
  set: (size: number) => arrowable.setArrowSize(size),
})
</script>

<template>
  <div class="arrow-section p-3 border-b app-border">
    <h3 class="app-section-title mb-3">{{ t('section.arrow.title') }}</h3>

    <!-- Start Arrow -->
    <ArrowTypeSelector
      v-model="startArrow"
      position="start"
      :label="t('section.arrow.startArrow')"
      :show-categories="true"
      class="mb-3"
    />

    <!-- End Arrow -->
    <ArrowTypeSelector
      v-model="endArrow"
      position="end"
      :label="t('section.arrow.endArrow')"
      :show-categories="true"
      class="mb-3"
    />

    <!-- Arrow Size -->
    <BaseSlider
      v-model="arrowSize"
      :min="5"
      :max="30"
      :step="1"
      :label="t('section.arrow.size')"
      unit="px"
      :show-value="true"
    />

    <!-- Preview SVG (optionnel mais utile) -->
    <div class="mt-3 border app-border rounded app-surface-2 p-2">
      <div class="text-xs app-subtle mb-1">{{ t('section.arrow.preview') }}</div>
      <svg width="100%" height="40" viewBox="0 0 260 40">
        <line
          x1="20"
          y1="20"
          x2="240"
          y2="20"
          stroke="var(--edge-stroke)"
          stroke-width="2"
          :marker-start="`url(#arrow-${startArrow}-start-333-${arrowSize})`"
          :marker-end="`url(#arrow-${endArrow}-end-333-${arrowSize})`"
        />
      </svg>
      <div class="text-xs app-subtle mt-1">{{ t('section.arrow.previewNote') }}</div>
    </div>
  </div>
</template>
