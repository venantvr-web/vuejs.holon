<!-- src/components/canvas/Breadcrumb.vue -->
<script setup lang="ts">
import { computed } from 'vue'
import { ChevronRight } from 'lucide-vue-next'
import { useGraphStore } from '../../stores/graph'
import { useSelectionState } from '../../composables/traits'
import { useViewport } from '../../composables/useViewport'
import { getNodeAbsolutePosition } from '../../composables/traits/utils/trait-helpers'

interface Props {
  canvasWidth: number
  canvasHeight: number
}

const props = defineProps<Props>()

const graphStore = useGraphStore()
const { selectedNodeIds, focusedNodeId } = useSelectionState()
const { fitWorldBox, resetView } = useViewport()

// Noeud actuellement focalisé (ou premier de la sélection) pour le fil d'Ariane.
const activeNodeId = computed<string | null>(() => {
  if (focusedNodeId.value) return focusedNodeId.value
  const first = Array.from(selectedNodeIds.value)[0]
  return first ?? null
})

interface Crumb {
  id: string | null
  label: string
}

const crumbs = computed((): Crumb[] => {
  const result: Crumb[] = [{ id: null, label: 'Racine' }]
  let currentId = activeNodeId.value
  const chain: Crumb[] = []
  while (currentId) {
    const node = graphStore.nodes[currentId]
    if (!node) break
    chain.unshift({
      id: node.id,
      label: (node.data?.name as string) ?? node.type,
    })
    currentId = node.parentId
  }
  return [...result, ...chain]
})

function focusCrumb(crumb: Crumb) {
  if (crumb.id === null) {
    resetView()
    return
  }
  const node = graphStore.nodes[crumb.id]
  if (!node) return
  const abs = getNodeAbsolutePosition(crumb.id)
  if (!abs) return
  fitWorldBox(
    { x: abs.x, y: abs.y, w: node.geometry.w, h: node.geometry.h },
    props.canvasWidth,
    props.canvasHeight,
    60
  )
}
</script>

<template>
  <nav
    v-if="crumbs.length > 1"
    class="breadcrumb absolute top-3 left-3 z-10 app-surface border app-border rounded shadow-md px-3 py-1.5 text-xs flex items-center gap-1 max-w-[60%] overflow-hidden"
  >
    <template v-for="(crumb, i) in crumbs" :key="crumb.id ?? 'root'">
      <ChevronRight v-if="i > 0" :size="12" class="app-subtle flex-shrink-0" />
      <button
        class="truncate max-w-[160px] hover:text-[var(--accent)] transition-colors duration-150"
        :class="{
          'font-semibold app-fg': i === crumbs.length - 1,
          'app-muted': i !== crumbs.length - 1,
        }"
        :title="crumb.label"
        @click="focusCrumb(crumb)"
      >
        {{ crumb.label }}
      </button>
    </template>
  </nav>
</template>
