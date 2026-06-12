<!-- src/components/canvas/HistoryPanel.vue -->
<script setup lang="ts">
import { computed } from 'vue'
import { History, Undo2, Redo2, Trash2 } from 'lucide-vue-next'
import { useUndoable, useUndoState } from '../../composables/traits/useUndoable'

/**
 * Panneau d'historique : visualise la pile d'undo/redo sous forme de timeline
 * et permet de sauter à n'importe quel état précédent. Complète les boutons
 * undo/redo de la toolbar en exposant le contexte temporel.
 *
 * L'état (history, currentIndex) est module-level dans useUndoable ; ce
 * panneau n'a donc pas besoin de props pour s'abonner.
 */
const props = defineProps<{ visible: boolean }>()
const emit = defineEmits<{ (e: 'close'): void }>()

const { history, currentIndex } = useUndoState()
const { canUndo, canRedo, undo, redo, jumpTo, clearHistory } = useUndoable()

/**
 * Liste affichable (la plus récente en haut). On préserve l'index original
 * pour l'API jumpTo qui s'attend à un index dans `history.value`.
 */
const entries = computed(() =>
  history.value
    .map((snap, idx) => ({
      idx,
      timestamp: snap.timestamp,
      nodeCount: Object.keys(snap.nodes).length,
      edgeCount: Object.keys(snap.edges).length,
      isCurrent: idx === currentIndex.value,
    }))
    .reverse()
)

function formatTime(ts: number): string {
  const d = new Date(ts)
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  const ss = String(d.getSeconds()).padStart(2, '0')
  return `${hh}:${mm}:${ss}`
}

function relativeAge(ts: number): string {
  const seconds = Math.max(0, Math.floor((Date.now() - ts) / 1000))
  if (seconds < 5) return "à l'instant"
  if (seconds < 60) return `il y a ${seconds} s`
  if (seconds < 3600) return `il y a ${Math.floor(seconds / 60)} min`
  return `il y a ${Math.floor(seconds / 3600)} h`
}
</script>

<template>
  <div
    v-if="props.visible"
    class="app-surface border app-border rounded-lg shadow-lg p-3 text-sm w-72 max-h-[28rem] flex flex-col"
    role="dialog"
    aria-label="Historique des modifications"
  >
    <div class="flex items-center justify-between mb-2">
      <h2 class="font-medium flex items-center gap-2">
        <History :size="16" aria-hidden="true" />
        Historique
      </h2>
      <button
        @click="emit('close')"
        class="app-muted hover:app-fg text-lg leading-none px-1"
        aria-label="Fermer le panneau historique"
      >
        ×
      </button>
    </div>

    <div class="flex items-center gap-2 mb-2">
      <button
        @click="undo"
        :disabled="!canUndo"
        class="app-btn-primary px-2 py-1 text-xs rounded inline-flex items-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <Undo2 :size="14" aria-hidden="true" /> Annuler
      </button>
      <button
        @click="redo"
        :disabled="!canRedo"
        class="app-btn-primary px-2 py-1 text-xs rounded inline-flex items-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <Redo2 :size="14" aria-hidden="true" /> Rétablir
      </button>
      <button
        @click="clearHistory"
        class="ml-auto app-danger-link text-xs inline-flex items-center gap-1"
        title="Effacer tout l'historique (irréversible)"
      >
        <Trash2 :size="14" aria-hidden="true" /> Vider
      </button>
    </div>

    <div v-if="entries.length === 0" class="text-xs app-subtle text-center py-4">
      Aucun état dans l'historique.
    </div>

    <ol v-else class="overflow-y-auto flex-1 space-y-1" role="list">
      <li v-for="entry in entries" :key="entry.idx">
        <button
          @click="jumpTo(entry.idx)"
          :aria-current="entry.isCurrent ? 'true' : 'false'"
          class="w-full text-left px-2 py-1 rounded text-xs border app-hover transition-colors"
          :class="{
            'app-ring-accent ring-2 font-medium': entry.isCurrent,
            'app-border': !entry.isCurrent,
          }"
        >
          <div class="flex items-center justify-between">
            <span>État #{{ entry.idx + 1 }}</span>
            <span class="app-subtle text-[10px]">{{ formatTime(entry.timestamp) }}</span>
          </div>
          <div class="app-muted text-[10px] mt-0.5">
            {{ entry.nodeCount }} noeud{{ entry.nodeCount > 1 ? 's' : '' }} ·
            {{ entry.edgeCount }} arête{{ entry.edgeCount > 1 ? 's' : '' }} ·
            {{ relativeAge(entry.timestamp) }}
          </div>
        </button>
      </li>
    </ol>
  </div>
</template>
