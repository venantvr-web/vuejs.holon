<!-- src/components/canvas/FilterPanel.vue -->
<script setup lang="ts">
import { ref, computed } from 'vue';
import { Filter, X } from 'lucide-vue-next';
import { useFilterable, PRESET_QUERIES } from '../../composables/traits';

/**
 * Panneau de filtrage par requête DSL.
 *
 * Permet de masquer ou d'estomper des sous-ensembles du modèle pour produire
 * des vues ciblées (ex. présentation COMEX sans la couche technique).
 * La grammaire du DSL est documentée dans utils/filter-dsl.ts.
 */

const {
  query,
  queryError,
  invertQuery,
  displayMode,
  isFilterActive,
  excludedCount,
  savedFilters,
  setQuery,
  clearFilter,
  saveFilter,
  loadFilter,
  deleteFilter,
} = useFilterable();

const open = ref(false);
const helpOpen = ref(false);

const buttonLabel = computed(() =>
  isFilterActive.value ? `Filtre (${excludedCount.value})` : 'Filtre'
);

function applyPreset(preset: { query: string; invert?: boolean }) {
  invertQuery.value = preset.invert ?? false;
  setQuery(preset.query);
}

function handleSave() {
  const name = window.prompt('Nom du filtre :', query.value);
  if (name) saveFilter(name);
}

function handleClear() {
  clearFilter();
}
</script>

<template>
  <div class="relative">
    <button
      @click="open = !open"
      class="px-3 py-1.5 text-sm rounded transition-colors"
      :class="isFilterActive ? 'app-toggle-active' : 'app-btn'"
      title="Filtrer le diagramme par requête (masquer ou estomper des éléments)"
      aria-haspopup="dialog"
      :aria-expanded="open"
    >
      <span class="inline-flex items-center gap-1.5"><Filter class="w-4 h-4" /> {{ buttonLabel }}</span>
    </button>

    <div
      v-if="open"
      class="absolute top-full right-0 mt-1 app-surface border app-border rounded shadow-lg p-3 w-96 z-40 text-sm"
      role="dialog"
      aria-label="Filtre du diagramme"
    >
      <!-- Requête DSL -->
      <label class="block text-xs font-semibold app-subtle uppercase mb-1" for="filter-query">
        Requête
      </label>
      <input
        id="filter-query"
        :value="query"
        @input="setQuery(($event.target as HTMLInputElement).value)"
        type="text"
        placeholder="ex. couche:business et non tag:obsolète"
        spellcheck="false"
        autocomplete="off"
        class="app-input w-full px-2 py-1.5 font-mono text-xs"
      />
      <p v-if="queryError" class="mt-1 text-xs app-danger-text" role="alert">
        {{ queryError }}
      </p>

      <!-- Sens du filtre + mode d'affichage -->
      <div class="flex items-center flex-wrap gap-x-4 gap-y-2 mt-3">
        <div class="flex items-center gap-2">
          <span class="text-xs app-subtle">Correspondants</span>
          <div class="flex rounded overflow-hidden border app-border">
            <button
              class="px-2 py-1 text-xs transition-colors"
              :class="!invertQuery ? 'app-toggle-active' : 'app-hover'"
              @click="invertQuery = false"
              title="Seuls les éléments correspondants (et leurs parents) restent visibles"
            >
              conservés
            </button>
            <button
              class="px-2 py-1 text-xs transition-colors border-l app-border"
              :class="invertQuery ? 'app-toggle-active' : 'app-hover'"
              @click="invertQuery = true"
              title="Les éléments correspondants (et leurs enfants) sont écartés"
            >
              écartés
            </button>
          </div>
        </div>

        <div class="flex items-center gap-2">
          <span class="text-xs app-subtle">Effet</span>
          <div class="flex rounded overflow-hidden border app-border">
            <button
              class="px-2 py-1 text-xs transition-colors"
              :class="displayMode === 'dim' ? 'app-toggle-active' : 'app-hover'"
              @click="displayMode = 'dim'"
              title="Les éléments écartés sont estompés"
            >
              Estomper
            </button>
            <button
              class="px-2 py-1 text-xs transition-colors border-l app-border"
              :class="displayMode === 'hide' ? 'app-toggle-active' : 'app-hover'"
              @click="displayMode = 'hide'"
              title="Les éléments écartés sont retirés du rendu"
            >
              Masquer
            </button>
          </div>
        </div>
      </div>

      <!-- Raccourcis prédéfinis -->
      <div class="mt-3">
        <div class="text-xs font-semibold app-subtle uppercase mb-1">Raccourcis</div>
        <div class="flex flex-wrap gap-1">
          <button
            v-for="preset in PRESET_QUERIES"
            :key="preset.label"
            class="px-2 py-0.5 text-xs app-btn rounded-full transition-colors"
            :title="preset.query"
            @click="applyPreset(preset)"
          >
            {{ preset.label }}
          </button>
        </div>
      </div>

      <!-- Filtres sauvegardés -->
      <div v-if="savedFilters.length" class="mt-3">
        <div class="text-xs font-semibold app-subtle uppercase mb-1">Filtres sauvegardés</div>
        <ul class="max-h-32 overflow-y-auto">
          <li
            v-for="filter in savedFilters"
            :key="filter.id"
            class="flex items-center justify-between gap-2 px-1 py-0.5 rounded app-hover"
          >
            <button
              class="flex-1 text-left text-xs truncate"
              :title="filter.query"
              @click="loadFilter(filter.id)"
            >
              {{ filter.name }}
            </button>
            <button
              class="app-danger-link"
              :aria-label="`Supprimer le filtre ${filter.name}`"
              @click="deleteFilter(filter.id)"
            >
              <X class="w-3.5 h-3.5" />
            </button>
          </li>
        </ul>
      </div>

      <!-- Aide syntaxe -->
      <button
        class="mt-3 text-xs app-subtle hover:underline"
        @click="helpOpen = !helpOpen"
      >
        {{ helpOpen ? 'Masquer la syntaxe' : 'Aide sur la syntaxe…' }}
      </button>
      <div v-if="helpOpen" class="mt-1 text-xs app-subtle space-y-0.5 border-l-2 app-border pl-2">
        <p><code>mot</code> — le nom contient « mot » (accents ignorés)</p>
        <p><code>couche:business</code> — métier, application, technology/infra…</p>
        <p><code>archi:business-actor</code> — type Archimate</p>
        <p><code>type:container</code> / <code>type:forme</code></p>
        <p><code>tag:critique</code>, <code>prop:owner=DSI</code>, <code>commentaire:2027</code></p>
        <p><code>et / ou / non</code>, parenthèses, <code>nom:pay*</code> (joker), <code>nom="CRM"</code> (exact), <code>nom~regex</code></p>
      </div>

      <!-- Pied : statut + actions -->
      <div class="flex items-center justify-between mt-3 pt-2 border-t app-border">
        <span class="text-xs app-subtle">
          {{ isFilterActive ? `${excludedCount} élément(s) écarté(s)` : 'Aucun filtre actif' }}
        </span>
        <div class="flex gap-2">
          <button
            class="px-2 py-1 text-xs app-btn rounded transition-colors disabled:opacity-40"
            :disabled="!isFilterActive"
            @click="handleSave"
          >
            Sauvegarder
          </button>
          <button
            class="px-2 py-1 text-xs app-btn rounded transition-colors disabled:opacity-40"
            :disabled="!query"
            @click="handleClear"
          >
            Réinitialiser
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
