<!-- src/components/layout/OutlinePanel.vue -->
<script setup lang="ts">
import { computed, ref } from 'vue'
import { Box, ChevronDown, ChevronRight, Square } from 'lucide-vue-next'
import { useGraphStore } from '../../stores/graph'
import { useSelectionState } from '../../composables/traits'
import { useViewport } from '../../composables/useViewport'
import { getNodeAbsolutePosition } from '../../composables/traits/utils/trait-helpers'
import { useI18n } from '../../composables/useI18n'
import type { Node } from '../../types'

const { t } = useI18n()
const graphStore = useGraphStore()
const { selectedNodeIds, focusedNodeId } = useSelectionState()
const { fitWorldBox } = useViewport()

const filter = ref('')
const collapsed = ref<Set<string>>(new Set())

interface OutlineItem {
  node: Node
  depth: number
  hasChildren: boolean
}

// Construction récursive, indentée par profondeur.
const outline = computed((): OutlineItem[] => {
  const result: OutlineItem[] = []
  const nodes = Object.values(graphStore.nodes)
  const roots = nodes.filter((n) => n.parentId === null).sort(sortByName)

  function walk(node: Node, depth: number) {
    const children = nodes.filter((n) => n.parentId === node.id).sort(sortByName)
    result.push({ node, depth, hasChildren: children.length > 0 })
    if (collapsed.value.has(node.id)) return
    for (const child of children) walk(child, depth + 1)
  }
  for (const root of roots) walk(root, 0)

  // Filtre textuel : garder l'élément si son nom match OU si un ancêtre match
  const q = filter.value.trim().toLowerCase()
  if (!q) return result
  return result.filter((item) => {
    const name = ((item.node.data?.name as string) ?? item.node.type).toLowerCase()
    return name.includes(q)
  })
})

function sortByName(a: Node, b: Node): number {
  const an = (a.data?.name as string) ?? a.type
  const bn = (b.data?.name as string) ?? b.type
  return an.localeCompare(bn)
}

function getName(node: Node): string {
  return (node.data?.name as string) ?? `(${node.type})`
}

function toggleCollapse(nodeId: string, event: MouseEvent) {
  event.stopPropagation()
  if (collapsed.value.has(nodeId)) collapsed.value.delete(nodeId)
  else collapsed.value.add(nodeId)
  collapsed.value = new Set(collapsed.value)
}

function handleClick(node: Node, event: MouseEvent) {
  if (event.ctrlKey || event.metaKey) {
    if (selectedNodeIds.value.has(node.id)) selectedNodeIds.value.delete(node.id)
    else selectedNodeIds.value.add(node.id)
  } else {
    selectedNodeIds.value = new Set([node.id])
  }
  focusedNodeId.value = node.id
}

function handleDoubleClick(node: Node) {
  const abs = getNodeAbsolutePosition(node.id)
  if (!abs) return
  const container = document.querySelector('.graph-canvas-container') as HTMLElement | null
  const w = container?.clientWidth ?? 800
  const h = container?.clientHeight ?? 600
  fitWorldBox({ x: abs.x, y: abs.y, w: node.geometry.w, h: node.geometry.h }, w, h, 60)
}
</script>

<template>
  <div class="outline-panel h-full flex flex-col app-fg">
    <div class="flex-shrink-0 flex items-center gap-2 mb-2">
      <input
        v-model="filter"
        type="text"
        :placeholder="t('outline.filterPlaceholder')"
        class="app-input flex-1 px-2 py-1 text-xs"
      />
      <span class="text-xs app-subtle font-mono">{{ Object.keys(graphStore.nodes).length }}</span>
    </div>

    <ul v-if="outline.length > 0" class="flex-1 overflow-y-auto text-xs">
      <li
        v-for="item in outline"
        :key="item.node.id"
        :class="[
          'flex items-center gap-1 px-1 py-0.5 cursor-pointer rounded app-hover transition-colors duration-150',
          selectedNodeIds.has(item.node.id) ? 'app-selected' : '',
        ]"
        :style="{ paddingLeft: item.depth * 12 + 4 + 'px' }"
        @click="handleClick(item.node, $event)"
        @dblclick="handleDoubleClick(item.node)"
      >
        <button
          v-if="item.hasChildren"
          class="app-subtle hover:app-muted w-3 flex-shrink-0 transition-colors duration-150"
          :aria-label="
            collapsed.has(item.node.id) ? t('outline.ariaExpand') : t('outline.ariaCollapse')
          "
          @click="toggleCollapse(item.node.id, $event)"
        >
          <component :is="collapsed.has(item.node.id) ? ChevronRight : ChevronDown" :size="12" />
        </button>
        <span v-else class="w-3 flex-shrink-0"></span>

        <component
          :is="item.node.type === 'container' ? Box : Square"
          :size="12"
          class="app-subtle flex-shrink-0"
        />
        <span class="truncate flex-1">{{ getName(item.node) }}</span>
      </li>
    </ul>
    <div v-else class="text-xs app-subtle italic">
      {{ filter ? 'Aucun résultat.' : 'Aucun noeud.' }}
    </div>
  </div>
</template>
