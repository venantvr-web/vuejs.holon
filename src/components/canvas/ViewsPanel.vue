<!-- src/components/canvas/ViewsPanel.vue -->
<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { Bookmark, X } from 'lucide-vue-next'
import { useViewable } from '../../composables/traits'
import { useViewport } from '../../composables/useViewport'
import { useI18n } from '../../composables/useI18n'
import { useConfirm } from '../../composables/useConfirm'

const { t } = useI18n()
const { confirm } = useConfirm()
const { savedViews, saveView, deleteView, activeView } = useViewable()
const { pan, zoomLevel } = useViewport()

const isOpen = ref(false)

function handleSave() {
  const defaultName = t('views.defaultName', { n: savedViews.value.length + 1 })
  const name = window.prompt(t('views.savePrompt'), defaultName)
  if (!name) return
  saveView(name, { zoom: zoomLevel.value, pan: { ...pan.value } })
}

function handleRestore(viewId: string) {
  const view = savedViews.value.find((v) => v.id === viewId)
  if (!view) return
  zoomLevel.value = view.zoom
  pan.value = { ...view.pan }
  activeView.value = view
}

async function handleDelete(event: MouseEvent, viewId: string) {
  event.stopPropagation()
  const view = savedViews.value.find((v) => v.id === viewId)
  if (!view) return
  if (await confirm({ message: t('views.deleteConfirm', { name: view.name }), tone: 'danger' })) {
    deleteView(viewId)
  }
}

function handleOutsideClick(event: MouseEvent) {
  const target = event.target as HTMLElement
  if (!target.closest('.views-panel')) isOpen.value = false
}

onMounted(() => {
  window.addEventListener('mousedown', handleOutsideClick, true)
})
onBeforeUnmount(() => {
  window.removeEventListener('mousedown', handleOutsideClick, true)
})
</script>

<template>
  <div class="views-panel relative">
    <button
      @click="isOpen = !isOpen"
      class="px-3 py-1.5 text-sm rounded transition-colors duration-150 flex items-center gap-1.5"
      :class="isOpen ? 'app-toggle-active' : 'app-btn'"
      v-tooltip="t('views.tooltip')"
    >
      <Bookmark :size="16" />
      <span>{{ t('views.count', { n: savedViews.length }) }}</span>
    </button>

    <div
      v-if="isOpen"
      class="absolute top-full right-0 mt-1 app-surface border app-border rounded shadow-lg w-64 max-h-[300px] overflow-y-auto z-40"
      @mousedown.stop
    >
      <div class="p-2 border-b app-border flex items-center justify-between">
        <span class="text-sm font-semibold app-fg">{{ t('views.heading') }}</span>
        <button @click="handleSave" class="text-xs app-link" v-tooltip="t('views.saveTooltip')">
          {{ t('views.save') }}
        </button>
      </div>

      <ul v-if="savedViews.length > 0" class="divide-y divide-[var(--border)]">
        <li
          v-for="view in savedViews"
          :key="view.id"
          class="group flex items-center justify-between px-3 py-1.5 app-hover cursor-pointer"
          :class="{ 'app-selected': activeView?.id === view.id }"
          @click="handleRestore(view.id)"
        >
          <div class="flex-1 min-w-0">
            <div class="text-sm truncate app-fg">{{ view.name }}</div>
            <div class="text-xs app-subtle font-mono">{{ Math.round(view.zoom * 100) }} %</div>
          </div>
          <button
            class="opacity-0 group-hover:opacity-100 app-danger-link ml-2 px-1"
            v-tooltip="t('common.delete')"
            @click="handleDelete($event, view.id)"
          >
            <X :size="14" />
          </button>
        </li>
      </ul>
      <div v-else class="p-3 text-xs app-subtle text-center">
        {{ t('views.empty') }}<br />
        {{ t('views.emptyHint') }}
      </div>
    </div>
  </div>
</template>
