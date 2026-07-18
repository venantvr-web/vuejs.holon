<!-- src/components/layout/Sidebar.vue -->
<script setup lang="ts">
import { ref } from 'vue'
import { ChevronDown, ChevronRight, X } from 'lucide-vue-next'
import { useLibraryStore } from '../../stores/library'
import type { LibraryItem } from '../../types'
import OutlinePanel from './OutlinePanel.vue'
import { useI18n } from '../../composables/useI18n'
import {
  useEventStormable,
  getAllEventStormingTypes,
  type EventStormingType,
} from '../../composables/traits'

const libraryStore = useLibraryStore()
const { t } = useI18n()
const { isEventStormingMode, createStickerTemplate } = useEventStormable()

const libraryOpen = ref(true)
const outlineOpen = ref(true)
const stickersOpen = ref(true)

const stickers = getAllEventStormingTypes()

function handleDragStart(event: DragEvent, item: LibraryItem) {
  if (event.dataTransfer) {
    event.dataTransfer.setData('application/json', JSON.stringify(item.template))
    event.dataTransfer.effectAllowed = 'copy'
  }
}

function handleStickerDragStart(event: DragEvent, type: EventStormingType) {
  if (event.dataTransfer) {
    // Même canal que la bibliothèque : le canevas instancie le gabarit au drop.
    const template = createStickerTemplate(type, t(`es.type.${type}`))
    event.dataTransfer.setData('application/json', JSON.stringify(template))
    event.dataTransfer.effectAllowed = 'copy'
  }
}

function handleRemove(event: MouseEvent, item: LibraryItem) {
  event.stopPropagation()
  if (confirm(t('library.removeConfirm', { name: item.name }))) {
    libraryStore.removeItem(item.id)
  }
}
</script>

<template>
  <aside class="w-64 app-surface-2 border-r app-border flex flex-col overflow-hidden">
    <!-- Palette Event Storming (visible uniquement dans cette notation) -->
    <div v-if="isEventStormingMode" class="flex-shrink-0 border-b app-border">
      <button
        class="w-full flex items-center justify-between px-3 py-2 app-hover app-fg transition-colors duration-150"
        @click="stickersOpen = !stickersOpen"
      >
        <span
          class="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide app-muted"
        >
          <component :is="stickersOpen ? ChevronDown : ChevronRight" :size="14" />
          {{ t('sidebar.eventStorming') }}
        </span>
        <span class="text-xs app-subtle font-mono">{{ stickers.length }}</span>
      </button>
      <div v-if="stickersOpen" class="p-2 max-h-[40vh] overflow-y-auto">
        <p class="text-xs app-subtle mb-2 px-1">{{ t('sidebar.eventStormingHint') }}</p>
        <ul class="grid grid-cols-2 gap-2">
          <li
            v-for="sticker in stickers"
            :key="sticker.type"
            class="flex flex-col items-center justify-center gap-1 p-2 rounded cursor-grab border shadow-sm text-center select-none"
            :style="{ backgroundColor: sticker.fill, borderColor: sticker.stroke }"
            draggable="true"
            v-tooltip="t(`es.type.${sticker.type}`)"
            @dragstart="handleStickerDragStart($event, sticker.type)"
          >
            <span class="text-base leading-none">{{ sticker.icon }}</span>
            <span class="text-[11px] font-medium leading-tight text-gray-900">
              {{ t(`es.type.${sticker.type}`) }}
            </span>
          </li>
        </ul>
      </div>
    </div>

    <!-- Bibliothèque -->
    <div class="flex-shrink-0 border-b app-border">
      <button
        class="w-full flex items-center justify-between px-3 py-2 app-hover app-fg transition-colors duration-150"
        @click="libraryOpen = !libraryOpen"
      >
        <span
          class="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide app-muted"
        >
          <component :is="libraryOpen ? ChevronDown : ChevronRight" :size="14" />
          {{ t('sidebar.library') }}
        </span>
        <span class="text-xs app-subtle font-mono">{{ libraryStore.items.length }}</span>
      </button>
      <div v-if="libraryOpen" class="p-2 max-h-[40vh] overflow-y-auto">
        <ul>
          <li
            v-for="item in libraryStore.items"
            :key="item.id"
            class="group flex items-center justify-between p-2 border app-border app-hover-border-accent rounded app-surface app-fg cursor-grab mb-2 shadow-sm"
            draggable="true"
            @dragstart="handleDragStart($event, item)"
          >
            <span class="truncate flex-1 text-sm">
              <span v-if="item.isBuiltIn" class="app-subtle text-xs mr-1">●</span>
              {{ item.name }}
            </span>
            <button
              v-if="!item.isBuiltIn"
              @click="handleRemove($event, item)"
              class="opacity-0 group-hover:opacity-100 app-danger-link ml-2 px-1 transition-opacity duration-150"
              v-tooltip="t('library.removeTooltip')"
              :aria-label="t('library.removeTooltip')"
            >
              <X :size="14" />
            </button>
          </li>
        </ul>
      </div>
    </div>

    <!-- Plan du modèle -->
    <div class="flex-1 flex flex-col overflow-hidden">
      <button
        class="flex-shrink-0 w-full flex items-center justify-between px-3 py-2 app-hover app-fg transition-colors duration-150"
        @click="outlineOpen = !outlineOpen"
      >
        <span
          class="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide app-muted"
        >
          <component :is="outlineOpen ? ChevronDown : ChevronRight" :size="14" />
          {{ t('sidebar.outline') }}
        </span>
      </button>
      <div v-if="outlineOpen" class="flex-1 overflow-hidden p-2">
        <OutlinePanel />
      </div>
    </div>
  </aside>
</template>
