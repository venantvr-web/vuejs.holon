<!-- src/components/layout/ShortcutsHelp.vue -->
<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { HelpCircle, X } from 'lucide-vue-next'
import { useKeyboardable, formatShortcut } from '../../composables/traits'

const { getShortcutsByCategory } = useKeyboardable()
const isOpen = ref(false)

const grouped = computed(() => getShortcutsByCategory())

// Raccourcis additionnels non gérés par useKeyboardable (listeners directs).
const EXTRA_SHORTCUTS: Record<string, Array<{ keys: string; description: string }>> = {
  Navigation: [
    { keys: 'Ctrl+F', description: 'Rechercher un noeud ou une relation' },
    { keys: 'F1', description: 'Afficher cette aide' },
  ],
  Sélection: [
    { keys: 'Shift+glisser', description: 'Sélection rectangle (marquee)' },
    { keys: 'Ctrl+clic', description: 'Ajouter/retirer de la sélection' },
  ],
  Édition: [
    { keys: 'Ctrl+G', description: 'Grouper la sélection' },
    { keys: 'Ctrl+Maj+G', description: 'Dégrouper' },
    { keys: 'Alt+glisser', description: 'Déplacer sans magnétisme' },
    { keys: 'Double-clic', description: 'Éditer le nom / Entrer dans un container' },
  ],
}

function handleKey(event: KeyboardEvent) {
  if (event.key === 'F1') {
    event.preventDefault()
    isOpen.value = !isOpen.value
  }
  if (event.key === 'Escape' && isOpen.value) {
    isOpen.value = false
  }
}

onMounted(() => window.addEventListener('keydown', handleKey))
onBeforeUnmount(() => window.removeEventListener('keydown', handleKey))
</script>

<template>
  <div>
    <button
      @click="isOpen = true"
      class="px-2 py-1.5 text-sm app-btn rounded transition-colors duration-150 inline-flex items-center"
      title="Aide — raccourcis clavier (F1)"
      aria-label="Aide — raccourcis clavier (F1)"
    >
      <HelpCircle :size="16" />
    </button>

    <div
      v-if="isOpen"
      class="app-overlay fixed inset-0 z-50 flex items-center justify-center"
      @click.self="isOpen = false"
    >
      <div
        class="app-surface border app-border rounded-lg shadow-xl w-[640px] max-h-[80vh] flex flex-col"
      >
        <div class="flex items-center justify-between px-4 py-3 border-b app-border">
          <h2 class="text-base font-semibold">Raccourcis clavier</h2>
          <button
            @click="isOpen = false"
            class="app-subtle hover:app-muted transition-colors duration-150"
            aria-label="Fermer l'aide"
          >
            <X :size="16" />
          </button>
        </div>

        <div class="overflow-y-auto p-4 space-y-4">
          <!-- Extras -->
          <div v-for="(items, category) in EXTRA_SHORTCUTS" :key="category">
            <h3 class="text-xs font-semibold uppercase tracking-wide app-muted mb-2">
              {{ category }}
            </h3>
            <ul class="space-y-1">
              <li
                v-for="item in items"
                :key="item.keys"
                class="flex items-center justify-between text-sm gap-4"
              >
                <span class="app-muted">{{ item.description }}</span>
                <kbd class="app-kbd">{{ item.keys }}</kbd>
              </li>
            </ul>
          </div>

          <!-- Raccourcis enregistrés dans useKeyboardable -->
          <div v-for="(items, category) in grouped" :key="category">
            <h3 class="text-xs font-semibold uppercase tracking-wide app-muted mb-2">
              {{ category }}
            </h3>
            <ul class="space-y-1">
              <li
                v-for="s in items"
                :key="formatShortcut(s)"
                class="flex items-center justify-between text-sm gap-4"
              >
                <span class="app-muted">{{ s.description }}</span>
                <kbd class="app-kbd">{{ formatShortcut(s) }}</kbd>
              </li>
            </ul>
          </div>
        </div>

        <div
          class="px-4 py-2 border-t app-border app-surface-2 text-xs app-subtle flex justify-between"
        >
          <span>Appuyez sur F1 pour ouvrir/fermer · Échap pour fermer</span>
        </div>
      </div>
    </div>
  </div>
</template>
