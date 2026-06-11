
<!-- src/components/layout/ImportButton.vue -->
<script setup lang="ts">
import { ref } from 'vue';
import { Upload } from 'lucide-vue-next';
import { useImportable } from '../../composables/traits/useImportable';
import type { ConflictStrategy, MergeStrategy } from '../../composables/traits/useImportable';

const { importFromJSON } = useImportable();

const fileInput = ref<HTMLInputElement | null>(null);
const status = ref<string | null>(null);
const isBusy = ref(false);

// Paramètres proposés à l'utilisateur avant import.
const showDialog = ref(false);
const pendingContent = ref<string | null>(null);
const pendingFilename = ref<string>('');
const mergeStrategy = ref<MergeStrategy>('append');
const conflictStrategy = ref<ConflictStrategy>('rename');

function openPicker() {
  fileInput.value?.click();
}

function onFile(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = ''; // permettre la ré-sélection du même fichier
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    pendingContent.value = reader.result as string;
    pendingFilename.value = file.name;
    showDialog.value = true;
  };
  reader.readAsText(file);
}

async function confirmImport() {
  if (!pendingContent.value) return;
  isBusy.value = true;
  status.value = 'Import en cours…';
  try {
    const result = await importFromJSON(pendingContent.value, {
      mergeStrategy: mergeStrategy.value,
      onConflict: conflictStrategy.value,
      validateBeforeImport: true,
    });
    if (result.success) {
      const warn = result.warnings.length > 0 ? ` (${result.warnings.length} avertissements)` : '';
      status.value = `✓ ${result.nodesImported} noeuds, ${result.edgesImported} arêtes${warn}`;
    } else {
      status.value = `✗ ${result.errors.join(' · ')}`;
    }
  } catch (e) {
    status.value = `✗ Erreur : ${(e as Error).message}`;
  } finally {
    isBusy.value = false;
    showDialog.value = false;
    pendingContent.value = null;
    setTimeout(() => { status.value = null; }, 4000);
  }
}

function cancelDialog() {
  showDialog.value = false;
  pendingContent.value = null;
}
</script>

<template>
  <div class="relative">
    <input
      ref="fileInput"
      type="file"
      accept="application/json,.json"
      class="hidden"
      @change="onFile"
    />
    <button
      @click="openPicker"
      :disabled="isBusy"
      class="px-3 py-1.5 text-sm app-btn rounded transition-colors duration-150 inline-flex items-center gap-1.5"
      title="Importer un fichier JSON versionné"
      aria-label="Importer un fichier JSON versionné"
    >
      <Upload :size="16" />
      <span>Importer</span>
    </button>

    <!-- Dialogue d'options -->
    <div
      v-if="showDialog"
      class="app-overlay fixed inset-0 z-50 flex items-center justify-center"
      @click.self="cancelDialog"
    >
      <div class="app-surface border app-border rounded-lg shadow-xl w-[420px] p-4">
        <h3 class="text-base font-semibold mb-3">Importer « {{ pendingFilename }} »</h3>

        <div class="mb-3">
          <label class="block text-xs font-medium app-muted mb-1">Stratégie de fusion</label>
          <select
            v-model="mergeStrategy"
            class="app-input w-full px-2 py-1 text-sm"
          >
            <option value="append">Ajouter au graphe existant</option>
            <option value="replace">Remplacer tout le graphe</option>
            <option value="merge">Fusionner intelligemment</option>
          </select>
        </div>

        <div class="mb-3">
          <label class="block text-xs font-medium app-muted mb-1">En cas de conflit d'ID</label>
          <select
            v-model="conflictStrategy"
            class="app-input w-full px-2 py-1 text-sm"
          >
            <option value="rename">Renommer (sûr, recommandé)</option>
            <option value="skip">Ignorer les éléments en conflit</option>
            <option value="replace">Remplacer les éléments existants</option>
          </select>
        </div>

        <div class="text-xs app-subtle mb-3">
          Astuce : l'import est annulable via Ctrl+Z si vous vous trompez.
        </div>

        <div class="flex justify-end gap-2">
          <button
            @click="cancelDialog"
            class="px-3 py-1.5 text-sm app-muted app-hover rounded transition-colors duration-150"
          >
            Annuler
          </button>
          <button
            @click="confirmImport"
            class="app-btn-primary px-3 py-1.5 text-sm rounded"
          >
            Importer
          </button>
        </div>
      </div>
    </div>

    <div
      v-if="status"
      class="app-status-pill absolute top-full right-0 mt-1 px-3 py-1.5 text-xs z-50 whitespace-nowrap"
    >
      {{ status }}
    </div>
  </div>
</template>
