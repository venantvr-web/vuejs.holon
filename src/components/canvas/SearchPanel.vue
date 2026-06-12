<!-- src/components/canvas/SearchPanel.vue -->
<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted, onBeforeUnmount } from 'vue'
import { Search, X } from 'lucide-vue-next'
import { useGraphStore } from '../../stores/graph'
import { useSearchable, useSelectionState } from '../../composables/traits'
import { useViewport } from '../../composables/useViewport'
import { useI18n } from '../../composables/useI18n'
import { getNodeAbsolutePosition } from '../../composables/traits/utils/trait-helpers'

interface Props {
  canvasWidth: number
  canvasHeight: number
}

const props = defineProps<Props>()
const emit = defineEmits<{ (e: 'close'): void }>()

const graphStore = useGraphStore()
const { t } = useI18n()
const { selectedNodeIds, focusedNodeId } = useSelectionState()
const { search, searchResults } = useSearchable()
const { fitWorldBox } = useViewport()

const query = ref('')
const activeIndex = ref(0)
const inputRef = ref<HTMLInputElement | null>(null)

const items = computed(() => {
  return searchResults.value.map((r, i) => {
    const isNode = r.type === 'node'
    const id = (isNode ? r.nodeId : r.edgeId) ?? ''
    const source = isNode ? graphStore.nodes[id] : graphStore.edges[id]
    const name = (source?.data?.name as string | undefined) ?? id.slice(0, 8)
    return { index: i, id, type: r.type, name, score: r.score ?? 0 }
  })
})

watch(query, (q) => {
  search({ query: q })
  activeIndex.value = 0
})

function focusItem(id: string, type: 'node' | 'edge') {
  if (type === 'node') {
    const node = graphStore.nodes[id]
    if (!node) return
    const abs = getNodeAbsolutePosition(id)
    if (!abs) return
    selectedNodeIds.value = new Set([id])
    focusedNodeId.value = id
    fitWorldBox(
      { x: abs.x, y: abs.y, w: node.geometry.w, h: node.geometry.h },
      props.canvasWidth,
      props.canvasHeight,
      80
    )
  } else {
    // Pour une arête, on centre sur ses deux extrémités.
    const edge = graphStore.edges[id]
    if (!edge) return
    const s = getNodeAbsolutePosition(edge.sourceId)
    const t = getNodeAbsolutePosition(edge.targetId)
    if (!s || !t) return
    const minX = Math.min(s.x, t.x)
    const minY = Math.min(s.y, t.y)
    const maxX = Math.max(
      s.x + (graphStore.nodes[edge.sourceId]?.geometry.w ?? 0),
      t.x + (graphStore.nodes[edge.targetId]?.geometry.w ?? 0)
    )
    const maxY = Math.max(
      s.y + (graphStore.nodes[edge.sourceId]?.geometry.h ?? 0),
      t.y + (graphStore.nodes[edge.targetId]?.geometry.h ?? 0)
    )
    fitWorldBox(
      { x: minX, y: minY, w: maxX - minX, h: maxY - minY },
      props.canvasWidth,
      props.canvasHeight,
      80
    )
  }
}

function handleKey(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    emit('close')
    return
  }
  if (event.key === 'ArrowDown') {
    event.preventDefault()
    if (items.value.length > 0) {
      activeIndex.value = (activeIndex.value + 1) % items.value.length
    }
    return
  }
  if (event.key === 'ArrowUp') {
    event.preventDefault()
    if (items.value.length > 0) {
      activeIndex.value = (activeIndex.value - 1 + items.value.length) % items.value.length
    }
    return
  }
  if (event.key === 'Enter') {
    event.preventDefault()
    const item = items.value[activeIndex.value]
    if (item) focusItem(item.id, item.type)
  }
}

onMounted(async () => {
  await nextTick()
  inputRef.value?.focus()
})

onBeforeUnmount(() => {
  // Reset pour ne pas polluer le prochain ouverture
  query.value = ''
})
</script>

<template>
  <div
    class="search-panel absolute top-3 left-1/2 -translate-x-1/2 z-30 app-surface border app-border rounded-lg shadow-lg w-[400px]"
    @mousedown.stop
  >
    <div class="p-2 border-b flex items-center gap-2">
      <Search :size="16" class="app-subtle flex-shrink-0" />
      <input
        ref="inputRef"
        v-model="query"
        type="text"
        :placeholder="t('search.placeholder')"
        class="app-input flex-1 px-2 py-1 text-sm"
        @keydown="handleKey"
      />
      <button
        class="app-subtle hover:text-[var(--fg)] transition-colors duration-150 px-1"
        title="Fermer (Échap)"
        @click="emit('close')"
      >
        <X :size="16" />
      </button>
    </div>

    <div v-if="query && items.length === 0" class="p-3 text-sm app-subtle text-center">
      {{ t('search.noResults') }}
    </div>

    <ul v-if="items.length > 0" class="max-h-[320px] overflow-y-auto text-sm">
      <li
        v-for="item in items"
        :key="item.index"
        class="px-3 py-1.5 cursor-pointer flex items-center justify-between"
        :class="{
          'app-selected': item.index === activeIndex,
          'app-hover': item.index !== activeIndex,
        }"
        @mouseenter="activeIndex = item.index"
        @click="focusItem(item.id, item.type)"
      >
        <div class="flex items-center gap-2 truncate">
          <span
            class="text-xs px-1.5 py-0.5 rounded"
            :class="
              item.type === 'node'
                ? 'bg-[var(--accent-soft)] text-[var(--accent-strong)]'
                : 'bg-[var(--success-bg)] text-[var(--success)]'
            "
          >
            {{ item.type === 'node' ? 'N' : 'E' }}
          </span>
          <span class="truncate">{{ item.name }}</span>
        </div>
        <span class="text-xs app-subtle font-mono ml-2"
          >{{ Math.round((1 - item.score) * 100) }}%</span
        >
      </li>
    </ul>

    <div class="px-3 py-1.5 border-t text-xs app-subtle flex justify-between">
      <span
        ><kbd class="app-kbd">↑↓</kbd> naviguer · <kbd class="app-kbd">Entrée</kbd> centrer</span
      >
      <span>{{ items.length }} résultat{{ items.length > 1 ? 's' : '' }}</span>
    </div>
  </div>
</template>
