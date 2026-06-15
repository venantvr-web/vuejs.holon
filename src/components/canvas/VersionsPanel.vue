<!-- src/components/canvas/VersionsPanel.vue -->
<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { History, X } from 'lucide-vue-next'
import { useVersionable } from '../../composables/traits'
import { useI18n } from '../../composables/useI18n'

const { t, tn, formatDate } = useI18n()
const { snapshots, createSnapshot, restoreSnapshot, deleteSnapshot, currentSnapshot } =
  useVersionable()

const isOpen = ref(false)

function handleSave() {
  const defaultName = t('versions.defaultName', { n: snapshots.value.length + 1 })
  const name = window.prompt(t('versions.namePrompt'), defaultName)
  if (!name) return
  const description = window.prompt(t('versions.descriptionPrompt'), '')
  createSnapshot(name, description || undefined)
}

async function handleRestore(id: string) {
  const snap = snapshots.value.find((s) => s.id === id)
  if (!snap) return
  if (!confirm(t('versions.restoreConfirm', { name: snap.name }))) return
  await restoreSnapshot(id)
}

function handleDelete(event: MouseEvent, id: string) {
  event.stopPropagation()
  const snap = snapshots.value.find((s) => s.id === id)
  if (!snap) return
  if (confirm(t('versions.deleteConfirm', { name: snap.name }))) {
    deleteSnapshot(id)
  }
}

function handleOutsideClick(event: MouseEvent) {
  const target = event.target as HTMLElement
  if (!target.closest('.versions-panel')) isOpen.value = false
}

onMounted(() => {
  window.addEventListener('mousedown', handleOutsideClick, true)
})
onBeforeUnmount(() => {
  window.removeEventListener('mousedown', handleOutsideClick, true)
})

function formatVersionDate(ts: number): string {
  // Date courte + heure, format propre à la locale courante.
  return formatDate(ts, {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}
</script>

<template>
  <div class="versions-panel relative">
    <button
      @click="isOpen = !isOpen"
      class="px-3 py-1.5 text-sm rounded transition-colors duration-150 flex items-center gap-1.5"
      :class="isOpen ? 'app-toggle-active' : 'app-btn'"
      v-tooltip="t('versions.tooltipMain')"
    >
      <History :size="16" />
      <span>{{ t('versions.count', { n: snapshots.length }) }}</span>
    </button>

    <div
      v-if="isOpen"
      class="absolute top-full right-0 mt-1 app-surface border app-border rounded shadow-lg w-80 max-h-[400px] overflow-y-auto z-40"
      @mousedown.stop
    >
      <div class="p-2 border-b flex items-center justify-between">
        <span class="text-sm font-semibold">{{ t('versions.heading') }}</span>
        <button @click="handleSave" class="text-xs app-link" v-tooltip="t('versions.tooltipSave')">
          {{ t('versions.save') }}
        </button>
      </div>

      <ul v-if="snapshots.length > 0" class="divide-y divide-[var(--border)]">
        <li
          v-for="snap in snapshots"
          :key="snap.id"
          class="group px-3 py-2 app-hover cursor-pointer"
          :class="{ 'app-selected': currentSnapshot?.id === snap.id }"
          @click="handleRestore(snap.id)"
        >
          <div class="flex items-start justify-between">
            <div class="flex-1 min-w-0">
              <div class="text-sm font-medium truncate">
                {{ snap.name }}
                <span
                  v-if="snap.tag"
                  class="ml-1 text-xs text-[var(--accent-strong)] bg-[var(--accent-soft)] px-1.5 py-0.5 rounded"
                >
                  {{ snap.tag }}
                </span>
              </div>
              <div v-if="snap.description" class="text-xs app-subtle truncate">
                {{ snap.description }}
              </div>
              <div class="text-xs app-subtle font-mono mt-0.5">
                {{
                  t('versions.summary', {
                    date: formatVersionDate(snap.metadata.createdAt),
                    nodes: tn('export.nodesCount', Object.keys(snap.state.nodes).length),
                    edges: tn('export.edgesCount', Object.keys(snap.state.edges).length),
                  })
                }}
              </div>
            </div>
            <button
              class="opacity-0 group-hover:opacity-100 app-danger-link ml-2 px-1"
              v-tooltip="t('versions.deleteTooltip')"
              @click="handleDelete($event, snap.id)"
            >
              <X :size="14" />
            </button>
          </div>
        </li>
      </ul>
      <div v-else class="p-3 text-xs app-subtle text-center">{{ t('versions.empty') }}</div>
    </div>
  </div>
</template>
