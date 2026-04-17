
<!-- src/components/layout/Sidebar.vue -->
<script setup lang="ts">
import { ref } from 'vue';
import { useLibraryStore } from '../../stores/library';
import type { LibraryItem } from '../../types';
import OutlinePanel from './OutlinePanel.vue';
import { useI18n } from '../../composables/useI18n';

const libraryStore = useLibraryStore();
const { t } = useI18n();

const libraryOpen = ref(true);
const outlineOpen = ref(true);

function handleDragStart(event: DragEvent, item: LibraryItem) {
  if (event.dataTransfer) {
    event.dataTransfer.setData('application/json', JSON.stringify(item.template));
    event.dataTransfer.effectAllowed = 'copy';
  }
}

function handleRemove(event: MouseEvent, item: LibraryItem) {
  event.stopPropagation();
  if (confirm(`Supprimer « ${item.name} » de la bibliothèque ?`)) {
    libraryStore.removeItem(item.id);
  }
}
</script>

<template>
  <aside class="w-64 app-surface-2 border-r app-border flex flex-col overflow-hidden">
    <!-- Bibliothèque -->
    <div class="flex-shrink-0 border-b">
      <button
        class="w-full flex items-center justify-between px-3 py-2 app-hover app-fg"
        @click="libraryOpen = !libraryOpen"
      >
        <span class="text-sm font-bold">{{ libraryOpen ? '▾' : '▸' }} {{ t('sidebar.library') }}</span>
        <span class="text-xs app-subtle">{{ libraryStore.items.length }}</span>
      </button>
      <div v-if="libraryOpen" class="p-2 max-h-[40vh] overflow-y-auto">
        <ul>
          <li
            v-for="item in libraryStore.items"
            :key="item.id"
            class="group flex items-center justify-between p-2 border app-border rounded app-surface app-fg cursor-grab mb-2 hover:border-blue-400"
            draggable="true"
            @dragstart="handleDragStart($event, item)"
          >
            <span class="truncate flex-1 text-sm">
              <span v-if="item.isBuiltIn" class="app-subtle text-xs mr-1">●</span>
              {{ item.name }}
            </span>
            <button
              v-if="!item.isBuiltIn"
              @click="handleRemove($event, item)"
              class="opacity-0 group-hover:opacity-100 text-xs text-red-500 hover:text-red-700 ml-2 px-1"
              title="Supprimer de la bibliothèque"
            >
              ✕
            </button>
          </li>
        </ul>
      </div>
    </div>

    <!-- Plan du modèle -->
    <div class="flex-1 flex flex-col overflow-hidden">
      <button
        class="flex-shrink-0 w-full flex items-center justify-between px-3 py-2 app-hover app-fg"
        @click="outlineOpen = !outlineOpen"
      >
        <span class="text-sm font-bold">{{ outlineOpen ? '▾' : '▸' }} {{ t('sidebar.outline') }}</span>
      </button>
      <div v-if="outlineOpen" class="flex-1 overflow-hidden p-2">
        <OutlinePanel />
      </div>
    </div>
  </aside>
</template>
