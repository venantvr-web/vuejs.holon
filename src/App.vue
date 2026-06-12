<script setup lang="ts">
import { onMounted } from 'vue'
import { useGraphStore } from './stores/graph'
import { useLibraryStore } from './stores/library'
import { useKeyboardable, useAutoSnapshot, useUndoable } from './composables/traits'
import Toolbar from './components/layout/Toolbar.vue'
import Sidebar from './components/layout/Sidebar.vue'
import PropertyInspector from './components/layout/PropertyInspector.vue'
import GraphCanvas from './components/canvas/GraphCanvas.vue'

const graphStore = useGraphStore()
const libraryStore = useLibraryStore()

// Raccourcis clavier globaux (Ctrl+Z/Y, Del, Ctrl+A, Ctrl+C/V/X/D, Escape).
useKeyboardable()
// Auto-snapshot du graphe sur chaque mutation (debounce 500 ms).
useAutoSnapshot()
const { clearHistory } = useUndoable()

// Charger les données depuis IndexedDB au démarrage
onMounted(async () => {
  await Promise.all([graphStore.loadFromDB(), libraryStore.loadFromDB()])
  // Baseline d'historique : l'état chargé devient le point 0, pas undoable.
  // clearHistory() crée déjà le snapshot initial.
  clearHistory()
})
</script>

<template>
  <div class="flex flex-col h-full app-surface">
    <!-- Skip link pour lecteurs d'écran (WCAG 2.4.1) -->
    <a
      href="#main-canvas"
      class="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:bg-blue-600 focus:text-white focus:px-3 focus:py-2 focus:rounded"
    >
      Aller au canevas
    </a>

    <header role="banner">
      <Toolbar />
    </header>
    <div class="flex flex-1 overflow-hidden">
      <nav role="navigation" aria-label="Bibliothèque et plan du modèle">
        <Sidebar />
      </nav>
      <main id="main-canvas" role="main" class="flex-1 flex">
        <GraphCanvas />
      </main>
      <aside role="complementary" aria-label="Inspecteur de propriétés">
        <PropertyInspector />
      </aside>
    </div>
  </div>
</template>
