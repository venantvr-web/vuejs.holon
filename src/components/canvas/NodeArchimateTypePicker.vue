<!-- src/components/canvas/NodeArchimateTypePicker.vue -->
<!--
  Popover de sélection du type Archimate pour un noeud.
  Affiche les types regroupés par layer, avec recherche textuelle.
  L'apply est délégué au parent via l'événement select.
-->
<script setup lang="ts">
import { computed, ref, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { Tag, X } from 'lucide-vue-next'
import { ARCHIMATE_TYPES, type ArchimateLayer } from '../../composables/traits/useTypeable'

interface Props {
  currentType: string | null
}

defineProps<Props>()
const emit = defineEmits<{
  (e: 'select', type: string | null): void
  (e: 'close'): void
}>()

const query = ref('')
const inputRef = ref<HTMLInputElement | null>(null)

/** Layers ordonnés comme dans Archimate officiel (top-down). */
const LAYER_ORDER: ArchimateLayer[] = [
  'strategy',
  'business',
  'application',
  'technology',
  'physical',
  'motivation',
  'implementation',
  'generic',
]

interface Item {
  type: string
  label: string
  icon: string
  layer: ArchimateLayer
  layerLabel: string
  layerColor: string
}

const allItems = computed((): Item[] => {
  const result: Item[] = []
  for (const layer of LAYER_ORDER) {
    const cfg = ARCHIMATE_TYPES[layer]
    if (!cfg) continue
    for (const [type, def] of Object.entries(cfg.types)) {
      result.push({
        type,
        label: (def as { label: string }).label,
        icon: (def as { icon: string }).icon,
        layer,
        layerLabel: cfg.label,
        layerColor: cfg.color,
      })
    }
  }
  return result
})

const filtered = computed(() => {
  const q = query.value.trim().toLowerCase()
  if (!q) return allItems.value
  return allItems.value.filter(
    (it) => it.label.toLowerCase().includes(q) || it.layerLabel.toLowerCase().includes(q)
  )
})

/** Regroupement pour l'affichage : Map<layer, items>. */
const grouped = computed(() => {
  const map = new Map<ArchimateLayer, Item[]>()
  for (const item of filtered.value) {
    if (!map.has(item.layer)) map.set(item.layer, [])
    map.get(item.layer)!.push(item)
  }
  return map
})

function handleSelect(type: string | null) {
  emit('select', type)
  emit('close')
}

function handleOutsideClick(event: MouseEvent) {
  const target = event.target as HTMLElement
  if (!target.closest('.archimate-type-picker')) emit('close')
}

function handleKey(event: KeyboardEvent) {
  if (event.key === 'Escape') emit('close')
}

onMounted(async () => {
  await nextTick()
  inputRef.value?.focus()
  window.addEventListener('mousedown', handleOutsideClick, true)
  window.addEventListener('keydown', handleKey)
})

onBeforeUnmount(() => {
  window.removeEventListener('mousedown', handleOutsideClick, true)
  window.removeEventListener('keydown', handleKey)
})
</script>

<template>
  <div
    class="archimate-type-picker app-surface border app-border rounded-lg shadow-xl w-[280px] max-h-[400px] flex flex-col overflow-hidden"
    @mousedown.stop
    @click.stop
    @wheel.stop
  >
    <!-- Recherche -->
    <div class="p-2 border-b app-border flex items-center gap-2">
      <Tag :size="16" class="app-subtle flex-shrink-0" />
      <input
        ref="inputRef"
        v-model="query"
        type="text"
        placeholder="Type Archimate…"
        class="app-input flex-1 px-2 py-1 text-sm"
      />
      <button
        class="app-subtle hover:text-[var(--fg)] transition-colors duration-150 px-1"
        title="Fermer (Échap)"
        @click="emit('close')"
      >
        <X :size="16" />
      </button>
    </div>

    <!-- Action « clear » -->
    <button
      class="px-3 py-1.5 text-xs text-left app-hover app-subtle border-b app-border flex items-center gap-1.5 transition-colors duration-150"
      :class="{ 'app-selected': currentType === null }"
      @click="handleSelect(null)"
    >
      <X :size="12" class="flex-shrink-0" />
      <span>Aucun type</span>
    </button>

    <!-- Liste groupée par layer -->
    <div class="flex-1 overflow-y-auto">
      <div v-for="[layer, items] in grouped" :key="layer">
        <div
          class="px-3 py-1 app-section-title app-surface-2 sticky top-0 flex items-center gap-2 app-border border-b"
        >
          <span
            class="inline-block w-3 h-3 rounded border app-border"
            :style="{ backgroundColor: items[0]?.layerColor }"
          />
          <span class="app-muted">{{ items[0]?.layerLabel }}</span>
          <span class="app-subtle ml-auto">{{ items.length }}</span>
        </div>
        <button
          v-for="item in items"
          :key="item.type"
          class="w-full px-3 py-1.5 text-left flex items-center gap-2 text-sm app-hover"
          :class="{ 'app-selected': currentType === item.type }"
          :title="item.label"
          @click="handleSelect(item.type)"
        >
          <span class="text-base">{{ item.icon }}</span>
          <span>{{ item.label }}</span>
        </button>
      </div>

      <div v-if="filtered.length === 0" class="p-3 text-xs app-subtle text-center">
        Aucun type ne correspond.
      </div>
    </div>

    <div class="px-3 py-1.5 border-t app-border text-xs app-subtle text-center">
      {{ filtered.length }} type{{ filtered.length > 1 ? 's' : '' }} Archimate 3.2
    </div>
  </div>
</template>
