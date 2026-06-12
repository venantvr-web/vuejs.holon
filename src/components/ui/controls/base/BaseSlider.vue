<!-- src/components/ui/controls/base/BaseSlider.vue -->
<script setup lang="ts">
import { computed } from 'vue'

interface BaseSliderProps {
  modelValue: number
  min?: number
  max?: number
  step?: number
  label?: string
  unit?: string
  showValue?: boolean
  disabled?: boolean
  vertical?: boolean
}

const props = withDefaults(defineProps<BaseSliderProps>(), {
  min: 0,
  max: 100,
  step: 1,
  unit: '',
  showValue: true,
  disabled: false,
  vertical: false,
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: number): void
}>()

const displayValue = computed(() => {
  return `${props.modelValue}${props.unit}`
})

function handleInput(event: Event) {
  const target = event.target as HTMLInputElement
  const value = parseFloat(target.value)
  emit('update:modelValue', value)
}
</script>

<template>
  <div class="flex flex-col gap-1">
    <!-- Label et valeur -->
    <div v-if="label || showValue" class="flex justify-between items-center">
      <label v-if="label" class="text-sm font-medium app-fg">
        {{ label }}
      </label>
      <span v-if="showValue" class="text-xs app-muted font-mono">
        {{ displayValue }}
      </span>
    </div>

    <!-- Slider -->
    <input
      type="range"
      :value="modelValue"
      :min="min"
      :max="max"
      :step="step"
      :disabled="disabled"
      @input="handleInput"
      class="w-full h-2 app-surface-3 rounded-lg appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
      :class="{ 'writing-mode-vertical': vertical }"
    />

    <!-- Min/Max labels optionnels -->
    <div v-if="!vertical" class="flex justify-between text-xs app-subtle">
      <span>{{ min }}{{ unit }}</span>
      <span>{{ max }}{{ unit }}</span>
    </div>
  </div>
</template>

<style scoped>
.writing-mode-vertical {
  writing-mode: bt-lr;
  -webkit-appearance: slider-vertical;
}
</style>
