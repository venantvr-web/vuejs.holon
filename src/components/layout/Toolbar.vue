<!-- src/components/layout/Toolbar.vue -->
<script setup lang="ts">
import { ref, computed } from 'vue';
import { useGraphStore } from '../../stores/graph';
import { useSelectionState, useGroupState, useUndoable, useAlignable, useSnapState, useLayoutable } from '../../composables/traits';
import type { LayoutAlgorithm } from '../../composables/traits';
import { useViewport } from '../../composables/useViewport';
import { getNodeAbsolutePosition } from '../../composables/traits/utils/trait-helpers';
import ValidationPanel from '../canvas/ValidationPanel.vue';
import VersionsPanel from '../canvas/VersionsPanel.vue';
import SuggestionsPanel from '../canvas/SuggestionsPanel.vue';
import ExportMenu from './ExportMenu.vue';
import ImportButton from './ImportButton.vue';
import ThemePicker from './ThemePicker.vue';
import LanguagePicker from './LanguagePicker.vue';
import ShortcutsHelp from './ShortcutsHelp.vue';
import { useI18n } from '../../composables/useI18n';

const { t } = useI18n();

const graphStore = useGraphStore();
const { selectedNodeIds } = useSelectionState();
const { createGroupFromSelection, dissolveGroup } = useGroupState();
const { undo, redo, canUndo, canRedo } = useUndoable();
const { zoomPercent, zoomBy, resetView, fitWorldBox } = useViewport();
const { alignNodes, distributeNodes, matchWidth, matchHeight, matchSize } = useAlignable();
const { config: snapConfig } = useSnapState();
const { applyLayout, isLayouting, currentAlgorithm } = useLayoutable();

const layoutMenuOpen = ref(false);
const LAYOUTS: Array<{ value: LayoutAlgorithm; label: string; hint: string }> = [
  { value: 'force', label: 'Force', hint: 'Réseau de dépendances (d3-force)' },
  { value: 'hierarchical', label: 'Hiérarchique', hint: 'Arbre orienté (top-bottom)' },
  { value: 'tree', label: 'Arbre', hint: 'Reingold-Tilford' },
  { value: 'circular', label: 'Circulaire', hint: 'Placement radial' },
  { value: 'grid', label: 'Grille', hint: 'Matrice 2D' },
];

async function runLayout(algo: LayoutAlgorithm) {
  layoutMenuOpen.value = false;
  await applyLayout(algo);
}

function toggleGrid() {
  snapConfig.value.snapToGrid = !snapConfig.value.snapToGrid;
}
function toggleNodeSnap() {
  snapConfig.value.snapToNodes = !snapConfig.value.snapToNodes;
}

const alignMenuOpen = ref(false);
const canAlign = computed(() => selectedNodeIds.value.size >= 2);
const canDistribute = computed(() => selectedNodeIds.value.size >= 3);

function runAlign(fn: () => void) {
  fn();
  alignMenuOpen.value = false;
}

/** Fit-to-content / fit-to-selection selon l'état de la sélection. */
function handleFit() {
  const container = document.querySelector('.graph-canvas-container') as HTMLElement | null;
  const viewportW = container?.clientWidth ?? window.innerWidth;
  const viewportH = container?.clientHeight ?? window.innerHeight;

  const ids = selectedNodeIds.value.size > 0
    ? Array.from(selectedNodeIds.value)
    : Object.keys(graphStore.nodes);
  if (ids.length === 0) return;

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const id of ids) {
    const node = graphStore.nodes[id];
    if (!node) continue;
    const abs = getNodeAbsolutePosition(id);
    if (!abs) continue;
    minX = Math.min(minX, abs.x);
    minY = Math.min(minY, abs.y);
    maxX = Math.max(maxX, abs.x + node.geometry.w);
    maxY = Math.max(maxY, abs.y + node.geometry.h);
  }
  if (!isFinite(minX)) return;
  fitWorldBox({ x: minX, y: minY, w: maxX - minX, h: maxY - minY }, viewportW, viewportH);
}

const canGroup = computed(() => selectedNodeIds.value.size >= 2);

const selectedGroupIds = computed(() => {
  const ids = new Set<string>();
  for (const nodeId of selectedNodeIds.value) {
    const gid = graphStore.nodes[nodeId]?.data?.groupId as string | undefined;
    if (gid) ids.add(gid);
  }
  return ids;
});

const canUngroup = computed(() => selectedGroupIds.value.size > 0);

function handleClear() {
  if (confirm('Voulez-vous vraiment supprimer tous les éléments ?')) {
    graphStore.clearAll();
  }
}

function handleGroup() {
  if (!canGroup.value) return;
  createGroupFromSelection();
}

function handleUngroup() {
  for (const gid of selectedGroupIds.value) dissolveGroup(gid);
}
</script>

<template>
  <header class="bg-white border-b px-4 py-2 flex items-center justify-between">
    <h1 class="text-lg font-semibold text-gray-800">Holon</h1>

    <div class="flex items-center gap-2">
      <!-- Zoom -->
      <div class="flex items-center bg-gray-100 rounded">
        <button
          @click="zoomBy(1 / 1.2)"
          class="px-2 py-1.5 text-sm hover:bg-gray-200 rounded-l"
          title="Zoom arrière"
        >
          −
        </button>
        <span class="px-2 text-xs font-mono min-w-[44px] text-center text-gray-700">{{ zoomPercent }}%</span>
        <button
          @click="zoomBy(1.2)"
          class="px-2 py-1.5 text-sm hover:bg-gray-200"
          title="Zoom avant"
        >
          +
        </button>
        <button
          @click="handleFit"
          class="px-2 py-1.5 text-sm hover:bg-gray-200 border-l border-gray-300"
          title="Ajuster à la sélection (ou tout)"
        >
          ⛶
        </button>
        <button
          @click="resetView"
          class="px-2 py-1.5 text-sm hover:bg-gray-200 border-l border-gray-300 rounded-r"
          title="Réinitialiser la vue (100 %)"
        >
          1:1
        </button>
      </div>

      <span class="w-px h-5 bg-gray-300 mx-1"></span>

      <!-- Annuler / Rétablir -->
      <button
        @click="undo"
        :disabled="!canUndo"
        class="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        :title="`${t('toolbar.undo')} (Ctrl+Z)`"
      >
        ↶ {{ t('toolbar.undo') }}
      </button>
      <button
        @click="redo"
        :disabled="!canRedo"
        class="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        :title="`${t('toolbar.redo')} (Ctrl+Maj+Z)`"
      >
        ↷ {{ t('toolbar.redo') }}
      </button>

      <span class="w-px h-5 bg-gray-300 mx-1"></span>

      <!-- Magnétisme / Grille -->
      <button
        @click="toggleGrid"
        class="px-2 py-1.5 text-sm rounded transition-colors"
        :class="snapConfig.snapToGrid ? 'bg-blue-100 text-blue-700 hover:bg-blue-200' : 'bg-gray-100 hover:bg-gray-200'"
        title="Afficher la grille et y aimanter (activé/désactivé)"
      >
        ▦ Grille
      </button>
      <button
        @click="toggleNodeSnap"
        class="px-2 py-1.5 text-sm rounded transition-colors"
        :class="snapConfig.snapToNodes ? 'bg-blue-100 text-blue-700 hover:bg-blue-200' : 'bg-gray-100 hover:bg-gray-200'"
        title="Aimanter sur les autres noeuds (Alt pendant le drag désactive temporairement)"
      >
        ⊹ Aimant
      </button>

      <span class="w-px h-5 bg-gray-300 mx-1"></span>

      <!-- Auto-layout -->
      <div class="relative">
        <button
          @click="layoutMenuOpen = !layoutMenuOpen"
          :disabled="isLayouting"
          class="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded transition-colors disabled:opacity-40"
          title="Appliquer un algorithme de mise en page automatique"
        >
          <span v-if="isLayouting">⟳ Mise en page…</span>
          <span v-else>Layout ▾</span>
        </button>
        <div
          v-if="layoutMenuOpen"
          class="absolute top-full left-0 mt-1 bg-white border border-gray-300 rounded shadow-lg py-1 w-56 z-40 text-sm"
          @mouseleave="layoutMenuOpen = false"
        >
          <div class="px-3 py-1 text-xs font-semibold text-gray-500 uppercase">Algorithmes</div>
          <button
            v-for="l in LAYOUTS"
            :key="l.value"
            class="w-full text-left px-3 py-1.5 hover:bg-gray-100"
            :class="{ 'bg-blue-50 font-medium': currentAlgorithm === l.value }"
            :title="l.hint"
            @click="runLayout(l.value)"
          >
            <div>{{ l.label }}</div>
            <div class="text-xs text-gray-400">{{ l.hint }}</div>
          </button>
        </div>
      </div>

      <!-- Aligner / Distribuer -->
      <div class="relative">
        <button
          @click="alignMenuOpen = !alignMenuOpen"
          :disabled="!canAlign"
          class="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          title="Aligner et distribuer (2+ éléments requis)"
        >
          Aligner ▾
        </button>
        <div
          v-if="alignMenuOpen"
          class="absolute top-full left-0 mt-1 bg-white border border-gray-300 rounded shadow-lg py-1 w-56 z-40 text-sm"
          @mouseleave="alignMenuOpen = false"
        >
          <div class="px-3 py-1 text-xs font-semibold text-gray-500 uppercase">Aligner</div>
          <button class="w-full text-left px-3 py-1 hover:bg-gray-100" @click="runAlign(() => alignNodes('left'))">Gauche</button>
          <button class="w-full text-left px-3 py-1 hover:bg-gray-100" @click="runAlign(() => alignNodes('center-h'))">Centrer horizontalement</button>
          <button class="w-full text-left px-3 py-1 hover:bg-gray-100" @click="runAlign(() => alignNodes('right'))">Droite</button>
          <button class="w-full text-left px-3 py-1 hover:bg-gray-100" @click="runAlign(() => alignNodes('top'))">Haut</button>
          <button class="w-full text-left px-3 py-1 hover:bg-gray-100" @click="runAlign(() => alignNodes('center-v'))">Centrer verticalement</button>
          <button class="w-full text-left px-3 py-1 hover:bg-gray-100" @click="runAlign(() => alignNodes('bottom'))">Bas</button>

          <div class="my-1 border-t border-gray-200"></div>
          <div class="px-3 py-1 text-xs font-semibold text-gray-500 uppercase">Distribuer</div>
          <button class="w-full text-left px-3 py-1 hover:bg-gray-100 disabled:opacity-40" :disabled="!canDistribute" @click="runAlign(() => distributeNodes('horizontal'))">Horizontalement</button>
          <button class="w-full text-left px-3 py-1 hover:bg-gray-100 disabled:opacity-40" :disabled="!canDistribute" @click="runAlign(() => distributeNodes('vertical'))">Verticalement</button>

          <div class="my-1 border-t border-gray-200"></div>
          <div class="px-3 py-1 text-xs font-semibold text-gray-500 uppercase">Harmoniser taille</div>
          <button class="w-full text-left px-3 py-1 hover:bg-gray-100" @click="runAlign(() => matchWidth())">Largeur</button>
          <button class="w-full text-left px-3 py-1 hover:bg-gray-100" @click="runAlign(() => matchHeight())">Hauteur</button>
          <button class="w-full text-left px-3 py-1 hover:bg-gray-100" @click="runAlign(() => matchSize())">Largeur et hauteur</button>
        </div>
      </div>

      <span class="w-px h-5 bg-gray-300 mx-1"></span>

      <!-- Grouper / Dégrouper -->
      <button
        @click="handleGroup"
        :disabled="!canGroup"
        class="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        title="Grouper la sélection (Ctrl+G)"
      >
        Grouper
      </button>
      <button
        @click="handleUngroup"
        :disabled="!canUngroup"
        class="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        title="Dégrouper la sélection (Ctrl+Shift+G)"
      >
        Dégrouper
      </button>

      <span class="w-px h-5 bg-gray-300 mx-1"></span>

      <!-- Validation -->
      <ValidationPanel />

      <!-- Suggestions -->
      <SuggestionsPanel />

      <!-- Versions -->
      <VersionsPanel />

      <span class="w-px h-5 bg-gray-300 mx-1"></span>

      <!-- Import JSON -->
      <ImportButton />

      <!-- Export (PNG 96/200/300 DPI · SVG · PDF · JSON) -->
      <ExportMenu />

      <span class="w-px h-5 bg-gray-300 mx-1"></span>

      <!-- Thème / Langue / Aide -->
      <ThemePicker />
      <LanguagePicker />
      <ShortcutsHelp />

      <!-- Bouton Effacer tout -->
      <button
        @click="handleClear"
        class="px-3 py-1.5 text-sm bg-red-100 hover:bg-red-200 text-red-700 rounded transition-colors"
        :title="t('toolbar.clear')"
      >
        {{ t('toolbar.clear') }}
      </button>
    </div>
  </header>
</template>
