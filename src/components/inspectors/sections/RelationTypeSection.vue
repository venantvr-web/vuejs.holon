
<!-- src/components/inspectors/sections/RelationTypeSection.vue -->
<script setup lang="ts">
import { computed, toRef } from 'vue';
import {
  useRelationTypeable,
  RelationType,
  RelationCategory,
  RELATION_CONFIGS,
  RELATION_TYPE_LABELS,
} from '../../../composables/traits/useRelationTypeable';

interface Props {
  edgeId: string;
}
const props = defineProps<Props>();
const edgeIdRef = toRef(props, 'edgeId');

const {
  relationType,
  relationConfig,
  accessType,
  influenceStrength,
  flowType,
  setRelationType,
  setAccessType,
  setInfluenceStrength,
  setFlowType,
} = useRelationTypeable({ edgeId: edgeIdRef });

const grouped = computed(() => {
  const groups: Record<RelationCategory, { type: RelationType; label: string }[]> = {
    [RelationCategory.Structural]: [],
    [RelationCategory.Dependency]: [],
    [RelationCategory.Dynamic]: [],
    [RelationCategory.Other]: [],
  };
  for (const [type, config] of Object.entries(RELATION_CONFIGS)) {
    groups[config.category].push({ type: type as RelationType, label: RELATION_TYPE_LABELS[type as RelationType] });
  }
  return groups;
});

const CATEGORY_LABELS: Record<RelationCategory, string> = {
  [RelationCategory.Structural]: 'Structurelles',
  [RelationCategory.Dependency]: 'Dépendances',
  [RelationCategory.Dynamic]: 'Dynamiques',
  [RelationCategory.Other]: 'Autres',
};

const INFLUENCE_VALUES = ['++', '+', '0', '?', '-', '--'];
const ACCESS_VALUES: Array<{ value: 'read' | 'write' | 'readwrite'; label: string }> = [
  { value: 'read', label: 'Lecture' },
  { value: 'write', label: 'Écriture' },
  { value: 'readwrite', label: 'Lecture/Écriture' },
];
const FLOW_VALUES: Array<{ value: 'information' | 'material' | 'money' | 'energy'; label: string }> = [
  { value: 'information', label: 'Information' },
  { value: 'material', label: 'Matériel' },
  { value: 'money', label: 'Monétaire' },
  { value: 'energy', label: 'Énergie' },
];
</script>

<template>
  <section class="p-3 border-b">
    <h3 class="text-sm font-semibold mb-2 text-gray-700">Type de relation</h3>

    <!-- Résumé -->
    <div class="text-xs text-gray-600 mb-2">
      <span class="font-medium">{{ relationConfig.name }}</span>
      <span class="text-gray-400"> · {{ CATEGORY_LABELS[relationConfig.category] }}</span>
    </div>

    <!-- Sélecteur groupé par catégorie -->
    <div class="space-y-2 mb-3">
      <div v-for="(items, category) in grouped" :key="category">
        <div class="text-xs font-semibold text-gray-500 uppercase mb-1">{{ CATEGORY_LABELS[category as RelationCategory] }}</div>
        <div class="grid grid-cols-2 gap-1">
          <button
            v-for="item in items"
            :key="item.type"
            class="px-2 py-1 text-xs border rounded text-left hover:bg-gray-100 transition-colors"
            :class="{ 'bg-blue-100 border-blue-500 text-blue-800': relationType === item.type }"
            :title="RELATION_CONFIGS[item.type].description"
            @click="setRelationType(item.type)"
          >
            {{ item.label }}
          </button>
        </div>
      </div>
    </div>

    <!-- Sous-propriétés selon le type -->
    <div v-if="accessType" class="mb-2">
      <label class="block text-xs text-gray-600 mb-1">Type d'accès</label>
      <div class="flex gap-1">
        <button
          v-for="v in ACCESS_VALUES"
          :key="v.value"
          class="flex-1 px-2 py-1 text-xs border rounded hover:bg-gray-100"
          :class="{ 'bg-blue-100 border-blue-500': accessType === v.value }"
          @click="setAccessType(v.value)"
        >
          {{ v.label }}
        </button>
      </div>
    </div>

    <div v-if="influenceStrength" class="mb-2">
      <label class="block text-xs text-gray-600 mb-1">Force d'influence</label>
      <div class="grid grid-cols-6 gap-0.5">
        <button
          v-for="v in INFLUENCE_VALUES"
          :key="v"
          class="py-1 text-xs font-mono border rounded hover:bg-gray-100"
          :class="{ 'bg-blue-100 border-blue-500': influenceStrength === v }"
          @click="setInfluenceStrength(v as any)"
        >
          {{ v }}
        </button>
      </div>
    </div>

    <div v-if="flowType" class="mb-2">
      <label class="block text-xs text-gray-600 mb-1">Type de flux</label>
      <div class="grid grid-cols-2 gap-1">
        <button
          v-for="v in FLOW_VALUES"
          :key="v.value"
          class="px-2 py-1 text-xs border rounded hover:bg-gray-100"
          :class="{ 'bg-blue-100 border-blue-500': flowType === v.value }"
          @click="setFlowType(v.value)"
        >
          {{ v.label }}
        </button>
      </div>
    </div>
  </section>
</template>
