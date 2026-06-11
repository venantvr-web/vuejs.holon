<!-- src/components/ui/controls/specialized/ArrowTypeSelector.vue -->
<script setup lang="ts">
import { ArrowType, ARROW_TYPE_LABELS } from '../../../../composables/traits/useArrowable';

interface ArrowTypeSelectorProps {
  modelValue: ArrowType;
  position?: 'start' | 'end';
  label?: string;
  showCategories?: boolean;
}

withDefaults(defineProps<ArrowTypeSelectorProps>(), {
  position: 'end',
  showCategories: true,
});

const emit = defineEmits<{
  (e: 'update:modelValue', value: ArrowType): void;
}>();

// Catégories de types de flèches
const arrowCategories = {
  basic: {
    label: 'Basique',
    types: [
      ArrowType.None,
      ArrowType.Dot,
      ArrowType.SmallDot,
      ArrowType.Arrow,
      ArrowType.FilledArrow,
    ],
  },
  geometric: {
    label: 'Géométrique',
    types: [
      ArrowType.Diamond,
      ArrowType.FilledDiamond,
      ArrowType.Circle,
      ArrowType.FilledCircle,
      ArrowType.Square,
      ArrowType.FilledSquare,
    ],
  },
  archimate: {
    label: 'ArchiMate',
    types: [
      ArrowType.ArchiComposition,
      ArrowType.ArchiAggregation,
      ArrowType.ArchiAssignment,
      ArrowType.ArchiRealization,
      ArrowType.ArchiServing,
      ArrowType.ArchiAccess,
      ArrowType.ArchiInfluence,
      ArrowType.ArchiTrigger,
      ArrowType.ArchiFlow,
    ],
  },
};

function handleChange(event: Event) {
  const target = event.target as HTMLSelectElement;
  emit('update:modelValue', target.value as ArrowType);
}
</script>

<template>
  <div class="arrow-type-selector">
    <!-- Label optionnel -->
    <label v-if="label" class="block text-xs font-medium app-muted mb-1">
      {{ label }}
    </label>

    <!-- Dropdown avec catégories -->
    <select
      :value="modelValue"
      @change="handleChange"
      class="app-input w-full px-2 py-1.5 text-xs"
    >
      <template v-if="showCategories">
        <!-- Avec catégories (optgroups) -->
        <optgroup
          v-for="(category, key) in arrowCategories"
          :key="key"
          :label="category.label"
        >
          <option
            v-for="type in category.types"
            :key="type"
            :value="type"
          >
            {{ ARROW_TYPE_LABELS[type] }}
          </option>
        </optgroup>
      </template>

      <template v-else>
        <!-- Sans catégories (liste simple) -->
        <template v-for="(category, key) in arrowCategories" :key="`cat-${key}`">
          <option
            v-for="type in category.types"
            :key="type"
            :value="type"
          >
            {{ ARROW_TYPE_LABELS[type] }}
          </option>
        </template>
      </template>
    </select>
  </div>
</template>
