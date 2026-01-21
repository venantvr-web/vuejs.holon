
<!-- src/components/layout/Sidebar.vue -->
<script setup lang="ts">
import { useLibraryStore } from '../../stores/library';

const libraryStore = useLibraryStore();

function handleDragStart(event: DragEvent, item: any) {
  if (event.dataTransfer) {
    // On stocke les données de l'item de manière sérialisée
    event.dataTransfer.setData('application/json', JSON.stringify(item));
    event.dataTransfer.effectAllowed = 'copy';
  }
}
</script>

<template>
  <aside class="w-64 bg-gray-100 p-4 border-r">
    <h2 class="text-lg font-bold mb-4">Library</h2>
    <ul>
      <li
        v-for="(item, index) in libraryStore.items"
        :key="index"
        class="p-2 border rounded bg-white cursor-grab mb-2"
        draggable="true"
        @dragstart="handleDragStart($event, item)"
      >
        {{ item.data.name }}
      </li>
    </ul>
  </aside>
</template>
