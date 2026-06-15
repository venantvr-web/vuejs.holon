<!-- src/components/inspectors/sections/RelationTypeSection.vue -->
<script setup lang="ts">
import { computed, toRef } from 'vue'
import {
  useRelationTypeable,
  RelationType,
  RelationCategory,
  RELATION_CONFIGS,
  RELATION_TYPE_LABELS,
} from '../../../composables/traits/useRelationTypeable'
import { useI18n } from '../../../composables/useI18n'

const { t } = useI18n()

interface Props {
  edgeId: string
}
const props = defineProps<Props>()
const edgeIdRef = toRef(props, 'edgeId')

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
} = useRelationTypeable({ edgeId: edgeIdRef })

const grouped = computed(() => {
  const groups: Record<RelationCategory, { type: RelationType; label: string }[]> = {
    [RelationCategory.Structural]: [],
    [RelationCategory.Dependency]: [],
    [RelationCategory.Dynamic]: [],
    [RelationCategory.Other]: [],
  }
  for (const [type, config] of Object.entries(RELATION_CONFIGS)) {
    groups[config.category].push({
      type: type as RelationType,
      label: RELATION_TYPE_LABELS[type as RelationType],
    })
  }
  return groups
})

const CATEGORY_LABELS = computed<Record<RelationCategory, string>>(() => ({
  [RelationCategory.Structural]: t('section.relationType.category.structural'),
  [RelationCategory.Dependency]: t('section.relationType.category.dependency'),
  [RelationCategory.Dynamic]: t('section.relationType.category.dynamic'),
  [RelationCategory.Other]: t('section.relationType.category.other'),
}))

const INFLUENCE_VALUES = ['++', '+', '0', '?', '-', '--']
const ACCESS_VALUES = computed<Array<{ value: 'read' | 'write' | 'readwrite'; label: string }>>(
  () => [
    { value: 'read', label: t('section.relationType.access.read') },
    { value: 'write', label: t('section.relationType.access.write') },
    { value: 'readwrite', label: t('section.relationType.access.readwrite') },
  ]
)
const FLOW_VALUES = computed<
  Array<{ value: 'information' | 'material' | 'money' | 'energy'; label: string }>
>(() => [
  { value: 'information', label: t('section.relationType.flow.information') },
  { value: 'material', label: t('section.relationType.flow.material') },
  { value: 'money', label: t('section.relationType.flow.money') },
  { value: 'energy', label: t('section.relationType.flow.energy') },
])
</script>

<template>
  <section class="p-3 border-b app-border">
    <h3 class="app-section-title mb-2">{{ t('section.relationType.title') }}</h3>

    <!-- Résumé -->
    <div class="text-xs app-muted mb-2">
      <span class="font-medium">{{ relationConfig.name }}</span>
      <span class="app-subtle"> · {{ CATEGORY_LABELS[relationConfig.category] }}</span>
    </div>

    <!-- Sélecteur groupé par catégorie -->
    <div class="space-y-2 mb-3">
      <div v-for="(items, category) in grouped" :key="category">
        <div class="text-xs font-semibold app-subtle uppercase tracking-wide mb-1">
          {{ CATEGORY_LABELS[category as RelationCategory] }}
        </div>
        <div class="grid grid-cols-2 gap-1">
          <button
            v-for="item in items"
            :key="item.type"
            class="app-toggle px-2 py-1 text-xs text-left"
            :class="{ 'app-toggle-active': relationType === item.type }"
            v-tooltip="RELATION_CONFIGS[item.type].description"
            @click="setRelationType(item.type)"
          >
            {{ item.label }}
          </button>
        </div>
      </div>
    </div>

    <!-- Sous-propriétés selon le type -->
    <div v-if="accessType" class="mb-2">
      <label class="block text-xs app-muted mb-1">{{ t('section.relationType.accessType') }}</label>
      <div class="flex gap-1">
        <button
          v-for="v in ACCESS_VALUES"
          :key="v.value"
          class="app-toggle flex-1 px-2 py-1 text-xs"
          :class="{ 'app-toggle-active': accessType === v.value }"
          @click="setAccessType(v.value)"
        >
          {{ v.label }}
        </button>
      </div>
    </div>

    <div v-if="influenceStrength" class="mb-2">
      <label class="block text-xs app-muted mb-1">{{ t('section.relationType.influence') }}</label>
      <div class="grid grid-cols-6 gap-0.5">
        <button
          v-for="v in INFLUENCE_VALUES"
          :key="v"
          class="app-toggle py-1 text-xs font-mono"
          :class="{ 'app-toggle-active': influenceStrength === v }"
          @click="setInfluenceStrength(v as any)"
        >
          {{ v }}
        </button>
      </div>
    </div>

    <div v-if="flowType" class="mb-2">
      <label class="block text-xs app-muted mb-1">{{ t('section.relationType.flowType') }}</label>
      <div class="grid grid-cols-2 gap-1">
        <button
          v-for="v in FLOW_VALUES"
          :key="v.value"
          class="app-toggle px-2 py-1 text-xs"
          :class="{ 'app-toggle-active': flowType === v.value }"
          @click="setFlowType(v.value)"
        >
          {{ v.label }}
        </button>
      </div>
    </div>
  </section>
</template>
