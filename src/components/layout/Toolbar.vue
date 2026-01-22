<!-- src/components/layout/Toolbar.vue -->
<script setup lang="ts">
import { ref } from 'vue';
import { useExportSvg } from '../../composables/useExportSvg';
import { useGraphStore } from '../../stores/graph';

const { downloadSvg, copyToClipboard } = useExportSvg();
const graphStore = useGraphStore();

const showCopiedMessage = ref(false);

async function handleCopy() {
  const success = await copyToClipboard();
  if (success) {
    showCopiedMessage.value = true;
    setTimeout(() => {
      showCopiedMessage.value = false;
    }, 2000);
  }
}

function handleClear() {
  if (confirm('Voulez-vous vraiment supprimer tous les éléments ?')) {
    graphStore.clearAll();
  }
}
</script>

<template>
  <header class="bg-white border-b px-4 py-2 flex items-center justify-between">
    <h1 class="text-lg font-semibold text-gray-800">Holon</h1>

    <div class="flex items-center gap-2">
      <!-- Bouton Copier SVG -->
      <button
        @click="handleCopy"
        class="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded transition-colors relative"
        title="Copier le SVG dans le presse-papier"
      >
        <span v-if="!showCopiedMessage">Copier SVG</span>
        <span v-else class="text-green-600">Copié !</span>
      </button>

      <!-- Bouton Exporter SVG -->
      <button
        @click="downloadSvg()"
        class="px-3 py-1.5 text-sm bg-blue-500 hover:bg-blue-600 text-white rounded transition-colors"
        title="Télécharger le fichier SVG"
      >
        Exporter SVG
      </button>

      <!-- Bouton Effacer tout -->
      <button
        @click="handleClear"
        class="px-3 py-1.5 text-sm bg-red-100 hover:bg-red-200 text-red-700 rounded transition-colors"
        title="Supprimer tous les éléments"
      >
        Effacer
      </button>
    </div>
  </header>
</template>
