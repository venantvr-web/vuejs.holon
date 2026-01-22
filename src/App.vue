<script setup lang="ts">
import { onMounted } from 'vue'
import { useGraphStore } from './stores/graph'
import Toolbar from './components/layout/Toolbar.vue'
import Sidebar from './components/layout/Sidebar.vue'
import GraphCanvas from './components/canvas/GraphCanvas.vue'

const graphStore = useGraphStore()

// Charger les données depuis IndexedDB au démarrage
onMounted(async () => {
  await graphStore.loadFromDB()
})
</script>

<template>
  <div class="flex flex-col h-full">
    <Toolbar />
    <div class="flex flex-1 overflow-hidden">
      <Sidebar />
      <GraphCanvas />
    </div>
  </div>
</template>
