
<!-- src/components/canvas/ViewsPanel.vue -->
<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue';
import { useViewable } from '../../composables/traits';
import { useViewport } from '../../composables/useViewport';

const { savedViews, saveView, deleteView, activeView } = useViewable();
const { pan, zoomLevel } = useViewport();

const isOpen = ref(false);

function handleSave() {
  const name = window.prompt('Nom de la vue :', `Vue ${savedViews.value.length + 1}`);
  if (!name) return;
  saveView(name, { zoom: zoomLevel.value, pan: { ...pan.value } });
}

function handleRestore(viewId: string) {
  const view = savedViews.value.find(v => v.id === viewId);
  if (!view) return;
  zoomLevel.value = view.zoom;
  pan.value = { ...view.pan };
  activeView.value = view;
}

function handleDelete(event: MouseEvent, viewId: string) {
  event.stopPropagation();
  const view = savedViews.value.find(v => v.id === viewId);
  if (!view) return;
  if (confirm(`Supprimer la vue « ${view.name} » ?`)) {
    deleteView(viewId);
  }
}

function handleOutsideClick(event: MouseEvent) {
  const target = event.target as HTMLElement;
  if (!target.closest('.views-panel')) isOpen.value = false;
}

onMounted(() => {
  window.addEventListener('mousedown', handleOutsideClick, true);
});
onBeforeUnmount(() => {
  window.removeEventListener('mousedown', handleOutsideClick, true);
});
</script>

<template>
  <div class="views-panel absolute top-3 right-3 z-10">
    <button
      @click="isOpen = !isOpen"
      class="px-3 py-1.5 text-sm bg-white/90 border border-gray-300 rounded shadow-md hover:bg-gray-100"
      title="Gérer les vues sauvegardées"
    >
      🗂 Vues ({{ savedViews.length }})
    </button>

    <div
      v-if="isOpen"
      class="absolute top-full right-0 mt-1 bg-white border border-gray-300 rounded shadow-lg w-64 max-h-[300px] overflow-y-auto"
      @mousedown.stop
    >
      <div class="p-2 border-b flex items-center justify-between">
        <span class="text-sm font-semibold">Vues sauvegardées</span>
        <button
          @click="handleSave"
          class="text-xs text-blue-600 hover:text-blue-800 hover:underline"
          title="Sauvegarder la vue courante"
        >
          + Sauver
        </button>
      </div>

      <ul v-if="savedViews.length > 0" class="divide-y divide-gray-100">
        <li
          v-for="view in savedViews"
          :key="view.id"
          class="group flex items-center justify-between px-3 py-1.5 hover:bg-gray-50 cursor-pointer"
          :class="{ 'bg-blue-50': activeView?.id === view.id }"
          @click="handleRestore(view.id)"
        >
          <div class="flex-1 min-w-0">
            <div class="text-sm truncate">{{ view.name }}</div>
            <div class="text-xs text-gray-400 font-mono">
              {{ Math.round(view.zoom * 100) }} %
            </div>
          </div>
          <button
            class="opacity-0 group-hover:opacity-100 text-xs text-red-500 hover:text-red-700 ml-2 px-1"
            title="Supprimer"
            @click="handleDelete($event, view.id)"
          >
            ✕
          </button>
        </li>
      </ul>
      <div v-else class="p-3 text-xs text-gray-400 text-center">
        Aucune vue sauvegardée.<br />
        Cliquez sur « + Sauver » pour capturer la vue courante.
      </div>
    </div>
  </div>
</template>
