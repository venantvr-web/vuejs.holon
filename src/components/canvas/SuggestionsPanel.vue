
<!-- src/components/canvas/SuggestionsPanel.vue -->
<script setup lang="ts">
import { ref, computed } from 'vue';
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
  high: 'bg-red-100 text-red-700 border-red-300',
  medium: 'bg-amber-100 text-amber-700 border-amber-300',
  low: 'bg-blue-100 text-blue-700 border-blue-300',
};

const PRIORITY_LABEL: Record<SuggestionPriority, string> = {
  high: 'Prioritaire',
  medium: 'Moyenne',
  low: 'Basse',
};

const TYPE_ICON: Record<string, string> = {
  connection: '↗',
  pattern: '⛩',
  refactoring: '♻',
  naming: '✎',
  completion: '…',
  optimization: '⚡',
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
      class="px-3 py-1.5 text-sm app-btn rounded transition-colors flex items-center gap-1 disabled:opacity-40"
      title="Générer des suggestions contextuelles"
    >
      <span>💡 Suggérer</span>
      <span
        v-if="count > 0"
        class="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 text-xs rounded-full bg-purple-500 text-white"
      >
        {{ count }}
      </span>
    </button>

    <div
      v-if="isOpen && count > 0"
      class="fixed bottom-3 left-[260px] right-[330px] max-h-[40vh] app-surface border border-purple-300 rounded-lg shadow-xl z-30 flex flex-col"
      @mousedown.stop
    >
      <div class="flex items-center justify-between px-3 py-2 border-b border-purple-300 app-surface-2">
        <div class="flex items-center gap-2">
          <h3 class="text-sm font-semibold app-fg">💡 Suggestions</h3>
          <span class="text-xs app-subtle">{{ count }} proposition{{ count > 1 ? 's' : '' }}</span>
        </div>
        <div class="flex items-center gap-2">
          <button
            class="text-xs app-subtle hover:app-fg hover:underline"
            @click="clearSuggestions"
          >
            Tout effacer
          </button>
          <button
            class="app-subtle hover:app-muted px-1"
            @click="isOpen = false"
          >
            ✕
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
            <span class="text-lg mt-0.5">{{ TYPE_ICON[s.type] ?? '◆' }}</span>
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2 mb-1">
                <span
                  class="text-xs px-1.5 py-0.5 rounded border"
                  :class="PRIORITY_CLS[s.priority]"
                >
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
                class="text-xs text-blue-600 hover:text-blue-800 hover:underline px-1"
                title="Centrer sur les éléments concernés"
                @click="focusSuggestion(s)"
              >
                Voir
              </button>
              <button
                v-if="s.apply"
                class="text-xs px-2 py-0.5 bg-purple-500 text-white rounded hover:bg-purple-600"
                @click="applySuggestion(s.id)"
              >
                Appliquer
              </button>
              <button
                class="text-xs app-subtle hover:app-muted px-1"
                title="Ignorer"
                @click="dismissSuggestion(s.id)"
              >
                ✕
              </button>
            </div>
          </div>
        </li>
      </ul>
    </div>
  </div>
</template>
