<!-- src/components/layout/Toolbar.vue -->
<script setup lang="ts">
import { ref, computed } from 'vue'
import { useGraphStore } from '../../stores/graph'
import {
  useSelectionState,
  useGroupState,
  useUndoable,
  useAlignable,
  useSnapState,
  useLayoutable,
  useEventStormable,
  type NotationMode,
} from '../../composables/traits'
import type { LayoutAlgorithm } from '../../composables/traits'
import { useViewport } from '../../composables/useViewport'
import { getNodeAbsolutePosition } from '../../composables/traits/utils/trait-helpers'
import ValidationPanel from '../canvas/ValidationPanel.vue'
import FilterPanel from '../canvas/FilterPanel.vue'
import VersionsPanel from '../canvas/VersionsPanel.vue'
import ViewsPanel from '../canvas/ViewsPanel.vue'
import SuggestionsPanel from '../canvas/SuggestionsPanel.vue'
import HistoryPanel from '../canvas/HistoryPanel.vue'
import LayersPanel from '../canvas/LayersPanel.vue'
import ExportMenu from './ExportMenu.vue'
import ImportButton from './ImportButton.vue'
import ThemePicker from './ThemePicker.vue'
import LanguagePicker from './LanguagePicker.vue'
import ShortcutsHelp from './ShortcutsHelp.vue'
import UserManualModal from './UserManualModal.vue'
import { useI18n } from '../../composables/useI18n'
import {
  Undo2,
  Redo2,
  History as HistoryIcon,
  Layers as LayersIcon,
  LayoutGrid,
  Magnet,
  Maximize,
  Minus,
  Plus,
  Trash2,
  Loader2,
  ChevronDown,
  Volume2,
  VolumeX,
} from 'lucide-vue-next'
import { useSound } from '../../composables/useSound'

const { t } = useI18n()

const manualOpen = ref(false)
const showHistoryPanel = ref(false)
const showLayersPanel = ref(false)
const { isMuted, toggleMute } = useSound()

const graphStore = useGraphStore()
const { selectedNodeIds } = useSelectionState()
const { createGroupFromSelection, dissolveGroup } = useGroupState()
const { undo, redo, canUndo, canRedo } = useUndoable()
const { zoomPercent, zoomBy, resetView, fitWorldBox } = useViewport()
const { alignNodes, distributeNodes, matchWidth, matchHeight, matchSize } = useAlignable()
const { config: snapConfig } = useSnapState()
const { applyLayout, isLayouting, currentAlgorithm } = useLayoutable()
const { notationMode, setNotationMode } = useEventStormable()

const NOTATION_MODES: Array<{ value: NotationMode; labelKey: string }> = [
  { value: 'archimate', labelKey: 'notation.archimate' },
  { value: 'event-storming', labelKey: 'notation.eventStorming' },
]

const layoutMenuOpen = ref(false)
const LAYOUTS: Array<{ value: LayoutAlgorithm; label: string; hint: string }> = [
  { value: 'force', label: 'Force', hint: 'Réseau de dépendances (d3-force)' },
  { value: 'hierarchical', label: 'Hiérarchique', hint: 'Arbre orienté (top-bottom)' },
  { value: 'tree', label: 'Arbre', hint: 'Reingold-Tilford' },
  { value: 'circular', label: 'Circulaire', hint: 'Placement radial' },
  { value: 'grid', label: 'Grille', hint: 'Matrice 2D' },
]

async function runLayout(algo: LayoutAlgorithm) {
  layoutMenuOpen.value = false
  await applyLayout(algo)
}

function toggleGrid() {
  snapConfig.value.snapToGrid = !snapConfig.value.snapToGrid
}
function toggleNodeSnap() {
  snapConfig.value.snapToNodes = !snapConfig.value.snapToNodes
}

const alignMenuOpen = ref(false)
const canAlign = computed(() => selectedNodeIds.value.size >= 2)
const canDistribute = computed(() => selectedNodeIds.value.size >= 3)

function runAlign(fn: () => void) {
  fn()
  alignMenuOpen.value = false
}

/** Fit-to-content / fit-to-selection selon l'état de la sélection. */
function handleFit() {
  const container = document.querySelector('.graph-canvas-container') as HTMLElement | null
  const viewportW = container?.clientWidth ?? window.innerWidth
  const viewportH = container?.clientHeight ?? window.innerHeight

  const ids =
    selectedNodeIds.value.size > 0
      ? Array.from(selectedNodeIds.value)
      : Object.keys(graphStore.nodes)
  if (ids.length === 0) return

  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity
  for (const id of ids) {
    const node = graphStore.nodes[id]
    if (!node) continue
    const abs = getNodeAbsolutePosition(id)
    if (!abs) continue
    minX = Math.min(minX, abs.x)
    minY = Math.min(minY, abs.y)
    maxX = Math.max(maxX, abs.x + node.geometry.w)
    maxY = Math.max(maxY, abs.y + node.geometry.h)
  }
  if (!isFinite(minX)) return
  fitWorldBox({ x: minX, y: minY, w: maxX - minX, h: maxY - minY }, viewportW, viewportH)
}

const canGroup = computed(() => selectedNodeIds.value.size >= 2)

const selectedGroupIds = computed(() => {
  const ids = new Set<string>()
  for (const nodeId of selectedNodeIds.value) {
    const gid = graphStore.nodes[nodeId]?.data?.groupId as string | undefined
    if (gid) ids.add(gid)
  }
  return ids
})

const canUngroup = computed(() => selectedGroupIds.value.size > 0)

function handleClear() {
  if (confirm(t('toolbar.confirmClear'))) {
    graphStore.clearAll()
  }
}

function handleGroup() {
  if (!canGroup.value) return
  createGroupFromSelection()
}

function handleUngroup() {
  for (const gid of selectedGroupIds.value) dissolveGroup(gid)
}
</script>

<template>
  <header class="app-surface border-b app-border px-4 py-2 flex items-center justify-between">
    <button
      type="button"
      class="text-lg font-semibold app-fg mr-6 hover:text-[var(--accent)] transition-colors cursor-pointer"
      v-tooltip="t('toolbar.tooltip.brand')"
      @click="manualOpen = true"
    >
      Holon
    </button>

    <div class="flex items-center gap-2">
      <!-- Bascule de notation (Archimate / Event Storming) -->
      <div
        class="flex items-center app-surface-2 rounded"
        role="radiogroup"
        :aria-label="t('notation.tooltip')"
        v-tooltip="t('notation.tooltip')"
      >
        <button
          v-for="(mode, index) in NOTATION_MODES"
          :key="mode.value"
          class="px-2.5 py-1.5 text-xs font-medium transition-colors"
          :class="[
            notationMode === mode.value ? 'app-toggle-active' : 'app-hover',
            index === 0 ? 'rounded-l' : 'rounded-r border-l app-border',
          ]"
          role="radio"
          :aria-checked="notationMode === mode.value"
          @click="setNotationMode(mode.value)"
        >
          {{ t(mode.labelKey) }}
        </button>
      </div>

      <span class="w-px h-5 bg-[var(--border)] mx-1"></span>

      <!-- Zoom -->
      <div class="flex items-center app-surface-2 rounded">
        <button
          @click="zoomBy(1 / 1.2)"
          class="px-2 py-2 text-sm app-hover rounded-l"
          v-tooltip="t('toolbar.aria.zoomOut')"
          :aria-label="t('toolbar.aria.zoomOut')"
        >
          <Minus class="w-4 h-4" />
        </button>
        <span class="px-2 text-xs font-mono min-w-[44px] text-center app-fg"
          >{{ zoomPercent }}%</span
        >
        <button
          @click="zoomBy(1.2)"
          class="px-2 py-2 text-sm app-hover"
          v-tooltip="t('toolbar.aria.zoomIn')"
          :aria-label="t('toolbar.aria.zoomIn')"
        >
          <Plus class="w-4 h-4" />
        </button>
        <button
          @click="handleFit"
          class="px-2 py-2 text-sm app-hover border-l app-border"
          v-tooltip="t('toolbar.tooltip.zoomFit')"
          :aria-label="t('toolbar.aria.zoomFit')"
        >
          <Maximize class="w-4 h-4" />
        </button>
        <button
          @click="resetView"
          class="px-2 py-1.5 text-sm app-hover border-l app-border rounded-r"
          v-tooltip="t('toolbar.tooltip.zoomReset')"
          :aria-label="t('toolbar.tooltip.zoomReset')"
        >
          1:1
        </button>
      </div>

      <span class="w-px h-5 bg-[var(--border)] mx-1"></span>

      <!-- Annuler / Rétablir -->
      <button
        @click="undo"
        :disabled="!canUndo"
        class="px-3 py-1.5 text-sm app-btn rounded transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        v-tooltip="`${t('toolbar.undo')} (Ctrl+Z)`"
      >
        <span class="inline-flex items-center gap-1.5"
          ><Undo2 class="w-4 h-4" /> {{ t('toolbar.undo') }}</span
        >
      </button>
      <button
        @click="redo"
        :disabled="!canRedo"
        class="px-3 py-1.5 text-sm app-btn rounded transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        v-tooltip="`${t('toolbar.redo')} (Ctrl+Maj+Z)`"
      >
        <span class="inline-flex items-center gap-1.5"
          ><Redo2 class="w-4 h-4" /> {{ t('toolbar.redo') }}</span
        >
      </button>

      <!-- Bascule panneau Historique (timeline complète + jump-to-state) -->
      <div class="relative">
        <button
          @click="showHistoryPanel = !showHistoryPanel"
          class="px-2 py-1.5 text-sm app-btn rounded transition-colors"
          :class="{ 'app-toggle-active': showHistoryPanel }"
          v-tooltip="t('toolbar.tooltip.history')"
          :aria-expanded="showHistoryPanel"
          aria-controls="history-panel-popover"
        >
          <span class="inline-flex items-center gap-1.5"
            ><HistoryIcon class="w-4 h-4" /> Historique</span
          >
        </button>
        <div
          v-if="showHistoryPanel"
          id="history-panel-popover"
          class="absolute right-0 top-full mt-1 z-20"
        >
          <HistoryPanel :visible="showHistoryPanel" @close="showHistoryPanel = false" />
        </div>
      </div>

      <!-- Bascule panneau Couches Archimate (visibilité par layer) -->
      <div class="relative">
        <button
          @click="showLayersPanel = !showLayersPanel"
          class="px-2 py-1.5 text-sm app-btn rounded transition-colors"
          :class="{ 'app-toggle-active': showLayersPanel }"
          v-tooltip="t('toolbar.tooltip.layers')"
          :aria-expanded="showLayersPanel"
          aria-controls="layers-panel-popover"
        >
          <span class="inline-flex items-center gap-1.5"
            ><LayersIcon class="w-4 h-4" /> Couches</span
          >
        </button>
        <div
          v-if="showLayersPanel"
          id="layers-panel-popover"
          class="absolute right-0 top-full mt-1 z-20"
        >
          <LayersPanel :visible="showLayersPanel" @close="showLayersPanel = false" />
        </div>
      </div>

      <span class="w-px h-5 bg-[var(--border)] mx-1"></span>

      <!-- Magnétisme / Grille -->
      <button
        @click="toggleGrid"
        class="px-2 py-1.5 text-sm rounded transition-colors"
        :class="snapConfig.snapToGrid ? 'app-toggle-active' : 'app-btn'"
        v-tooltip="t('toolbar.tooltip.grid')"
      >
        <span class="inline-flex items-center gap-1.5"><LayoutGrid class="w-4 h-4" /> Grille</span>
      </button>
      <button
        @click="toggleNodeSnap"
        class="px-2 py-1.5 text-sm rounded transition-colors"
        :class="snapConfig.snapToNodes ? 'app-toggle-active' : 'app-btn'"
        v-tooltip="t('toolbar.tooltip.snap')"
      >
        <span class="inline-flex items-center gap-1.5"><Magnet class="w-4 h-4" /> Aimant</span>
      </button>

      <span class="w-px h-5 bg-[var(--border)] mx-1"></span>

      <!-- Auto-layout -->
      <div class="relative">
        <button
          @click="layoutMenuOpen = !layoutMenuOpen"
          :disabled="isLayouting"
          class="px-3 py-1.5 text-sm app-btn rounded transition-colors disabled:opacity-40"
          v-tooltip="t('toolbar.tooltip.layout')"
        >
          <span v-if="isLayouting" class="inline-flex items-center gap-1.5"
            ><Loader2 class="w-4 h-4 animate-spin" /> Mise en page…</span
          >
          <span v-else class="inline-flex items-center gap-1.5"
            >Layout <ChevronDown class="w-3.5 h-3.5"
          /></span>
        </button>
        <div
          v-if="layoutMenuOpen"
          class="absolute top-full left-0 mt-1 app-surface border app-border rounded shadow-lg py-1 w-56 z-40 text-sm"
          @mouseleave="layoutMenuOpen = false"
        >
          <div class="px-3 py-1 text-xs font-semibold app-subtle uppercase">Algorithmes</div>
          <button
            v-for="l in LAYOUTS"
            :key="l.value"
            class="w-full text-left px-3 py-1.5 app-hover"
            :class="{ 'app-selected font-medium': currentAlgorithm === l.value }"
            v-tooltip="l.hint"
            @click="runLayout(l.value)"
          >
            <div>{{ l.label }}</div>
            <div class="text-xs app-subtle">{{ l.hint }}</div>
          </button>
        </div>
      </div>

      <!-- Aligner / Distribuer -->
      <div class="relative">
        <button
          @click="alignMenuOpen = !alignMenuOpen"
          :disabled="!canAlign"
          class="px-3 py-1.5 text-sm app-btn rounded transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          v-tooltip="t('toolbar.tooltip.align')"
        >
          <span class="inline-flex items-center gap-1.5"
            >Aligner <ChevronDown class="w-3.5 h-3.5"
          /></span>
        </button>
        <div
          v-if="alignMenuOpen"
          class="absolute top-full left-0 mt-1 app-surface border app-border rounded shadow-lg py-1 w-56 z-40 text-sm"
          @mouseleave="alignMenuOpen = false"
        >
          <div class="px-3 py-1 text-xs font-semibold app-subtle uppercase">Aligner</div>
          <button
            class="w-full text-left px-3 py-1 app-hover"
            @click="runAlign(() => alignNodes('left'))"
          >
            Gauche
          </button>
          <button
            class="w-full text-left px-3 py-1 app-hover"
            @click="runAlign(() => alignNodes('center-h'))"
          >
            Centrer horizontalement
          </button>
          <button
            class="w-full text-left px-3 py-1 app-hover"
            @click="runAlign(() => alignNodes('right'))"
          >
            Droite
          </button>
          <button
            class="w-full text-left px-3 py-1 app-hover"
            @click="runAlign(() => alignNodes('top'))"
          >
            Haut
          </button>
          <button
            class="w-full text-left px-3 py-1 app-hover"
            @click="runAlign(() => alignNodes('center-v'))"
          >
            Centrer verticalement
          </button>
          <button
            class="w-full text-left px-3 py-1 app-hover"
            @click="runAlign(() => alignNodes('bottom'))"
          >
            Bas
          </button>

          <div class="my-1 border-t app-border"></div>
          <div class="px-3 py-1 text-xs font-semibold app-subtle uppercase">Distribuer</div>
          <button
            class="w-full text-left px-3 py-1 app-hover disabled:opacity-40"
            :disabled="!canDistribute"
            @click="runAlign(() => distributeNodes('horizontal'))"
          >
            Horizontalement
          </button>
          <button
            class="w-full text-left px-3 py-1 app-hover disabled:opacity-40"
            :disabled="!canDistribute"
            @click="runAlign(() => distributeNodes('vertical'))"
          >
            Verticalement
          </button>

          <div class="my-1 border-t app-border"></div>
          <div class="px-3 py-1 text-xs font-semibold app-subtle uppercase">Harmoniser taille</div>
          <button
            class="w-full text-left px-3 py-1 app-hover"
            @click="runAlign(() => matchWidth())"
          >
            Largeur
          </button>
          <button
            class="w-full text-left px-3 py-1 app-hover"
            @click="runAlign(() => matchHeight())"
          >
            Hauteur
          </button>
          <button class="w-full text-left px-3 py-1 app-hover" @click="runAlign(() => matchSize())">
            Largeur et hauteur
          </button>
        </div>
      </div>

      <span class="w-px h-5 bg-[var(--border)] mx-1"></span>

      <!-- Grouper / Dégrouper -->
      <button
        @click="handleGroup"
        :disabled="!canGroup"
        class="px-3 py-1.5 text-sm app-btn rounded transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        v-tooltip="t('toolbar.tooltip.group')"
      >
        Grouper
      </button>
      <button
        @click="handleUngroup"
        :disabled="!canUngroup"
        class="px-3 py-1.5 text-sm app-btn rounded transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        v-tooltip="t('toolbar.tooltip.ungroup')"
      >
        Dégrouper
      </button>

      <span class="w-px h-5 bg-[var(--border)] mx-1"></span>

      <!-- Filtre DSL (masquer/estomper des sous-ensembles du modèle) -->
      <FilterPanel />

      <!-- Validation -->
      <ValidationPanel />

      <!-- Suggestions -->
      <SuggestionsPanel />

      <!-- Versions -->
      <VersionsPanel />

      <!-- Vues sauvegardées -->
      <ViewsPanel />

      <span class="w-px h-5 bg-[var(--border)] mx-1"></span>

      <!-- Import JSON -->
      <ImportButton />

      <!-- Export (PNG 96/200/300 DPI · SVG · PDF · JSON) -->
      <ExportMenu />

      <span class="w-px h-5 bg-[var(--border)] mx-1"></span>

      <!-- Thème / Langue / Aide / Son -->
      <ThemePicker />
      <LanguagePicker />
      <ShortcutsHelp />
      <button
        @click="toggleMute"
        class="px-2 py-1.5 text-sm app-btn rounded transition-colors"
        v-tooltip="isMuted ? t('toolbar.tooltip.muteOn') : t('toolbar.tooltip.muteOff')"
        :aria-pressed="!isMuted"
        :aria-label="isMuted ? t('toolbar.aria.muteOn') : t('toolbar.aria.muteOff')"
      >
        <component :is="isMuted ? VolumeX : Volume2" class="w-4 h-4" aria-hidden="true" />
      </button>

      <!-- Bouton Effacer tout -->
      <button
        @click="handleClear"
        class="px-3 py-1.5 text-sm app-btn-danger rounded transition-colors"
        v-tooltip="t('toolbar.clear')"
      >
        <span class="inline-flex items-center gap-1.5"
          ><Trash2 class="w-4 h-4" /> {{ t('toolbar.clear') }}</span
        >
      </button>
    </div>

    <!-- Guide utilisateur (ouvert via clic sur « Holon ») -->
    <UserManualModal v-if="manualOpen" @close="manualOpen = false" />
  </header>
</template>
