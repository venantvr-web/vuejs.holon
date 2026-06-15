<!-- src/components/canvas/LayersPanel.vue -->
<script setup lang="ts">
import { computed } from 'vue'
import { Eye, EyeOff, Layers as LayersIcon } from 'lucide-vue-next'
import { useGraphStore } from '../../stores/graph'
import {
  useLayerVisibility,
  type ArchimateLayer,
} from '../../composables/traits/useLayerVisibility'
import { ARCHIMATE_TYPES } from '../../composables/traits/useTypeable'
import { useI18n } from '../../composables/useI18n'
import type { Node } from '../../types'

const { t, tn } = useI18n()

/**
 * Panneau de gestion de la visibilité par couche Archimate.
 *
 * Pour chaque couche (Business, Application, Technology, etc.) :
 * - pastille de couleur du layer ;
 * - libellé et nombre de noeuds appartenant à cette couche ;
 * - bouton œil pour masquer/afficher tous les noeuds de la couche en un clic.
 *
 * Le panneau s'appuie sur l'état module-level de `useLayerVisibility`. Les
 * consommateurs (NodeRenderer, MiniMap) lisent `isNodeLayerHidden` et
 * adaptent leur rendu.
 */
const props = defineProps<{ visible: boolean }>()
const emit = defineEmits<{ (e: 'close'): void }>()

const graphStore = useGraphStore()
const { layers, isHidden, toggle, showAll, hideAll } = useLayerVisibility()

/**
 * Compte le nombre de noeuds par couche. Recalculé à chaque mutation du
 * store ; reste O(n) dans la pratique mais avec n < quelques milliers c'est
 * négligeable au regard du coût de rendu.
 */
const counts = computed(() => {
  const result: Record<ArchimateLayer, number> = {} as Record<ArchimateLayer, number>
  for (const layer of layers.value) result[layer.key] = 0

  const typeToLayer = new Map<string, ArchimateLayer>()
  for (const [layerKey, layer] of Object.entries(ARCHIMATE_TYPES)) {
    for (const typeKey of Object.keys(layer.types)) {
      typeToLayer.set(typeKey, layerKey as ArchimateLayer)
    }
  }

  for (const node of Object.values(graphStore.nodes) as Node[]) {
    const archimateType = node.data?.archimateType as string | undefined
    if (!archimateType) continue
    const l = typeToLayer.get(archimateType)
    if (l) result[l]++
  }
  return result
})

const totalTyped = computed(() =>
  Object.values(counts.value).reduce((sum: number, n) => sum + n, 0)
)
</script>

<template>
  <div
    v-if="props.visible"
    class="app-surface border app-border rounded-lg shadow-lg p-3 text-sm w-72 max-h-[28rem] flex flex-col"
    role="dialog"
    :aria-label="t('layers.dialogAria')"
  >
    <div class="flex items-center justify-between mb-2">
      <h2 class="font-medium flex items-center gap-2">
        <LayersIcon :size="16" aria-hidden="true" />
        {{ t('layers.title') }}
      </h2>
      <button
        @click="emit('close')"
        class="app-muted hover:app-fg text-lg leading-none px-1"
        :aria-label="t('layers.closeAria')"
      >
        ×
      </button>
    </div>

    <div class="flex items-center gap-2 mb-2 text-xs">
      <button
        @click="showAll"
        class="app-btn px-2 py-1 rounded inline-flex items-center gap-1"
        v-tooltip="t('layers.tooltipShowAll')"
      >
        <Eye :size="12" aria-hidden="true" /> {{ t('layers.showAll') }}
      </button>
      <button
        @click="hideAll"
        class="app-btn px-2 py-1 rounded inline-flex items-center gap-1"
        v-tooltip="t('layers.tooltipHideAll')"
      >
        <EyeOff :size="12" aria-hidden="true" /> {{ t('layers.hideAll') }}
      </button>
      <span class="ml-auto app-subtle">{{ tn('layers.typed', totalTyped) }}</span>
    </div>

    <ul class="overflow-y-auto flex-1 space-y-1" role="list">
      <li v-for="layer in layers" :key="layer.key">
        <button
          @click="toggle(layer.key)"
          class="w-full flex items-center gap-2 px-2 py-1.5 rounded text-xs border app-border app-hover transition-colors"
          :class="{ 'opacity-50': isHidden(layer.key) }"
          :aria-pressed="isHidden(layer.key) ? 'false' : 'true'"
          v-tooltip="
            isHidden(layer.key)
              ? t('layers.tooltipShowLayer', { name: layer.label })
              : t('layers.tooltipHideLayer', { name: layer.label })
          "
        >
          <span
            class="w-4 h-4 rounded border app-border flex-shrink-0"
            :style="{ backgroundColor: layer.color }"
            aria-hidden="true"
          />
          <span class="flex-1 text-left font-medium">{{ layer.label }}</span>
          <span class="app-subtle text-[10px] tabular-nums">{{ counts[layer.key] }}</span>
          <component
            :is="isHidden(layer.key) ? EyeOff : Eye"
            :size="14"
            aria-hidden="true"
            class="flex-shrink-0"
          />
        </button>
      </li>
    </ul>
  </div>
</template>
