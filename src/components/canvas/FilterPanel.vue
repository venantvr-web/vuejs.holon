<!-- src/components/canvas/FilterPanel.vue -->
<script setup lang="ts">
import { ref, computed } from 'vue'
import { Filter, X } from 'lucide-vue-next'
import { useFilterable, PRESET_QUERIES } from '../../composables/traits'
import { useI18n } from '../../composables/useI18n'

/**
 * Panneau de filtrage par requête DSL.
 *
 * Permet de masquer ou d'estomper des sous-ensembles du modèle pour produire
 * des vues ciblées (ex. présentation COMEX sans la couche technique).
 * La grammaire du DSL est documentée dans utils/filter-dsl.ts.
 */

const { t, tn } = useI18n()
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
} = useFilterable()

const open = ref(false)
const helpOpen = ref(false)

const buttonLabel = computed(() =>
  isFilterActive.value ? t('filter.labelCount', { n: excludedCount.value }) : t('filter.label')
)

function applyPreset(preset: { query: string; invert?: boolean }) {
  invertQuery.value = preset.invert ?? false
  setQuery(preset.query)
}

function handleSave() {
  const name = window.prompt(t('filter.savePrompt'), query.value)
  if (name) saveFilter(name)
}

function handleClear() {
  clearFilter()
}
</script>

<template>
  <div class="relative">
    <button
      @click="open = !open"
      class="px-3 py-1.5 text-sm rounded transition-colors"
      :class="isFilterActive ? 'app-toggle-active' : 'app-btn'"
      v-tooltip="t('filter.tooltipMain')"
      aria-haspopup="dialog"
      :aria-expanded="open"
    >
      <span class="inline-flex items-center gap-1.5"
        ><Filter class="w-4 h-4" /> {{ buttonLabel }}</span
      >
    </button>

    <div
      v-if="open"
      class="absolute top-full right-0 mt-1 app-surface border app-border rounded shadow-lg p-3 w-96 z-40 text-sm"
      role="dialog"
      :aria-label="t('filter.dialogAria')"
    >
      <!-- Requête DSL -->
      <label class="block text-xs font-semibold app-subtle uppercase mb-1" for="filter-query">
        {{ t('filter.queryLabel') }}
      </label>
      <input
        id="filter-query"
        :value="query"
        @input="setQuery(($event.target as HTMLInputElement).value)"
        type="text"
        :placeholder="t('filter.placeholder')"
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
          <span class="text-xs app-subtle">{{ t('filter.matching') }}</span>
          <div class="flex rounded overflow-hidden border app-border">
            <button
              class="px-2 py-1 text-xs transition-colors"
              :class="!invertQuery ? 'app-toggle-active' : 'app-hover'"
              @click="invertQuery = false"
              v-tooltip="t('filter.tooltipKept')"
            >
              {{ t('filter.kept') }}
            </button>
            <button
              class="px-2 py-1 text-xs transition-colors border-l app-border"
              :class="invertQuery ? 'app-toggle-active' : 'app-hover'"
              @click="invertQuery = true"
              v-tooltip="t('filter.tooltipDiscarded')"
            >
              {{ t('filter.discarded') }}
            </button>
          </div>
        </div>

        <div class="flex items-center gap-2">
          <span class="text-xs app-subtle">{{ t('filter.effect') }}</span>
          <div class="flex rounded overflow-hidden border app-border">
            <button
              class="px-2 py-1 text-xs transition-colors"
              :class="displayMode === 'dim' ? 'app-toggle-active' : 'app-hover'"
              @click="displayMode = 'dim'"
              v-tooltip="t('filter.tooltipDim')"
            >
              {{ t('filter.styleDim') }}
            </button>
            <button
              class="px-2 py-1 text-xs transition-colors border-l app-border"
              :class="displayMode === 'hide' ? 'app-toggle-active' : 'app-hover'"
              @click="displayMode = 'hide'"
              v-tooltip="t('filter.tooltipMask')"
            >
              {{ t('filter.styleMask') }}
            </button>
          </div>
        </div>
      </div>

      <!-- Raccourcis prédéfinis -->
      <div class="mt-3">
        <div class="text-xs font-semibold app-subtle uppercase mb-1">
          {{ t('filter.shortcuts') }}
        </div>
        <div class="flex flex-wrap gap-1">
          <button
            v-for="preset in PRESET_QUERIES"
            :key="preset.label"
            class="px-2 py-0.5 text-xs app-btn rounded-full transition-colors"
            v-tooltip="preset.query"
            @click="applyPreset(preset)"
          >
            {{ preset.label }}
          </button>
        </div>
      </div>

      <!-- Filtres sauvegardés -->
      <div v-if="savedFilters.length" class="mt-3">
        <div class="text-xs font-semibold app-subtle uppercase mb-1">{{ t('filter.saved') }}</div>
        <ul class="max-h-32 overflow-y-auto">
          <li
            v-for="filter in savedFilters"
            :key="filter.id"
            class="flex items-center justify-between gap-2 px-1 py-0.5 rounded app-hover"
          >
            <button
              class="flex-1 text-left text-xs truncate"
              v-tooltip="filter.query"
              @click="loadFilter(filter.id)"
            >
              {{ filter.name }}
            </button>
            <button
              class="app-danger-link"
              :aria-label="t('filter.deleteOne', { name: filter.name })"
              @click="deleteFilter(filter.id)"
            >
              <X class="w-3.5 h-3.5" />
            </button>
          </li>
        </ul>
      </div>

      <!-- Aide syntaxe -->
      <button class="mt-3 text-xs app-subtle hover:underline" @click="helpOpen = !helpOpen">
        {{ helpOpen ? t('filter.syntaxHide') : t('filter.syntaxShow') }}
      </button>
      <div v-if="helpOpen" class="mt-1 text-xs app-subtle space-y-0.5 border-l-2 app-border pl-2">
        <p v-html="t('filter.help.name')" />
        <p v-html="t('filter.help.layer')" />
        <p v-html="t('filter.help.archi')" />
        <p v-html="t('filter.help.type')" />
        <p v-html="t('filter.help.meta')" />
        <p v-html="t('filter.help.combinators')" />
      </div>

      <!-- Pied : statut + actions -->
      <div class="flex items-center justify-between mt-3 pt-2 border-t app-border">
        <span class="text-xs app-subtle">
          {{ isFilterActive ? tn('filter.activeCount', excludedCount) : t('filter.empty') }}
        </span>
        <div class="flex gap-2">
          <button
            class="px-2 py-1 text-xs app-btn rounded transition-colors disabled:opacity-40"
            :disabled="!isFilterActive"
            @click="handleSave"
          >
            {{ t('filter.save') }}
          </button>
          <button
            class="px-2 py-1 text-xs app-btn rounded transition-colors disabled:opacity-40"
            :disabled="!query"
            @click="handleClear"
          >
            {{ t('filter.reset') }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
