
<!-- src/components/canvas/SuggestionsPanel.vue -->
<script setup lang="ts">
import { ref, computed } from 'vue';
import type { Component } from 'vue';
import {
  ArrowUpRight,
  Diamond,
  Ellipsis,
  LayoutTemplate,
  Lightbulb,
  Pencil,
  Recycle,
  X,
  Zap,
} from 'lucide-vue-next';
import { useSuggestable, useSelectionState } from '../../composables/traits';
import type { Suggestion, SuggestionPriority } from '../../composables/traits';

const { activeSuggestions, generateSuggestions, applySuggestion, dismissSuggestion, clearSuggestions, isGenerating } = useSuggestable();
const { selectedNodeIds, focusedNodeId } = useSelectionState();

const isOpen = ref(false);

function handleGenerate() {
  const selected = Array.from(selectedNodeIds.value);
  generateSuggestions({
    selectedNodeId: selected[0],
    visibleNodeIds: selected,
  });
  isOpen.value = true;
}

const PRIORITY_CLS: Record<SuggestionPriority, string> = {
  high: 'app-badge app-badge-danger',
  medium: 'app-badge app-badge-warning',
  low: 'app-badge app-badge-info',
};

const PRIORITY_LABEL: Record<SuggestionPriority, string> = {
  high: 'Prioritaire',
  medium: 'Moyenne',
  low: 'Basse',
};

// Icônes lucide par type de suggestion (fallback : Diamond).
const TYPE_ICON: Record<string, Component> = {
  connection: ArrowUpRight,
  pattern: LayoutTemplate,
  refactoring: Recycle,
  naming: Pencil,
  completion: Ellipsis,
  optimization: Zap,
};

function focusSuggestion(s: Suggestion) {
  if (s.nodeIds && s.nodeIds.length > 0) {
    selectedNodeIds.value = new Set(s.nodeIds);
    focusedNodeId.value = s.nodeIds[0];
  }
}

const count = computed(() => activeSuggestions.value.length);
</script>

<template>
  <div class="suggestions-wrapper">
    <button
      @click="handleGenerate"
      :disabled="isGenerating"
      class="px-3 py-1.5 text-sm rounded transition-colors duration-150 flex items-center gap-1.5 disabled:opacity-40"
      :class="isOpen && count > 0 ? 'app-toggle-active' : 'app-btn'"
      title="Générer des suggestions contextuelles"
    >
      <Lightbulb :size="16" />
      <span>Suggérer</span>
      <span
        v-if="count > 0"
        class="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 text-xs rounded-full bg-[var(--accent-soft)] text-[var(--accent-strong)] font-semibold"
      >
        {{ count }}
      </span>
    </button>

    <div
      v-if="isOpen && count > 0"
      class="fixed bottom-3 left-[260px] right-[330px] max-h-[40vh] app-surface border app-border rounded-lg shadow-xl z-30 flex flex-col"
      @mousedown.stop
    >
      <div class="flex items-center justify-between px-3 py-2 border-b app-border app-surface-2">
        <div class="flex items-center gap-2">
          <h3 class="text-sm font-semibold app-fg flex items-center gap-1.5">
            <Lightbulb :size="14" class="text-[var(--warning)]" />
            <span>Suggestions</span>
          </h3>
          <span class="text-xs app-subtle">{{ count }} proposition{{ count > 1 ? 's' : '' }}</span>
        </div>
        <div class="flex items-center gap-2">
          <button
            class="text-xs app-subtle hover:text-[var(--fg)] hover:underline transition-colors duration-150"
            @click="clearSuggestions"
          >
            Tout effacer
          </button>
          <button
            class="app-subtle hover:text-[var(--fg)] transition-colors duration-150 px-1"
            title="Fermer"
            @click="isOpen = false"
          >
            <X :size="16" />
          </button>
        </div>
      </div>

      <ul class="overflow-y-auto divide-y divide-[var(--border)]">
        <li
          v-for="s in activeSuggestions"
          :key="s.id"
          class="px-3 py-2 app-hover"
        >
          <div class="flex items-start gap-2">
            <component :is="TYPE_ICON[s.type] ?? Diamond" :size="16" class="app-muted mt-0.5 flex-shrink-0" />
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2 mb-1">
                <span :class="PRIORITY_CLS[s.priority]">
                  {{ PRIORITY_LABEL[s.priority] }}
                </span>
                <span class="text-xs app-subtle font-mono">
                  {{ Math.round(s.confidence * 100) }} %
                </span>
              </div>
              <div class="text-sm app-fg">{{ s.description }}</div>
              <div v-if="s.reasoning" class="text-xs app-subtle mt-0.5">{{ s.reasoning }}</div>
            </div>
            <div class="flex-shrink-0 flex items-center gap-1">
              <button
                v-if="s.nodeIds && s.nodeIds.length > 0"
                class="text-xs app-link px-1"
                title="Centrer sur les éléments concernés"
                @click="focusSuggestion(s)"
              >
                Voir
              </button>
              <button
                v-if="s.apply"
                class="text-xs px-2 py-0.5 app-btn-primary rounded"
                @click="applySuggestion(s.id)"
              >
                Appliquer
              </button>
              <button
                class="app-subtle hover:text-[var(--fg)] transition-colors duration-150 px-1"
                title="Ignorer"
                @click="dismissSuggestion(s.id)"
              >
                <X :size="14" />
              </button>
            </div>
          </div>
        </li>
      </ul>
    </div>
  </div>
</template>
