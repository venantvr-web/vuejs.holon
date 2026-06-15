<!-- src/components/canvas/CanvasEmptyState.vue -->
<script setup lang="ts">
import { Sparkles, MoveRight, Keyboard, Upload } from 'lucide-vue-next'
import { useI18n } from '../../composables/useI18n'

/**
 * Overlay affiché par-dessus le canevas quand le graphe est vide.
 *
 * Onboarding minimal : explique d'où viennent les noeuds (la bibliothèque),
 * rappelle l'import JSON, et liste les trois raccourcis non évidents
 * (Shift+drag pour la marquee, Shift+clic pour amorcer une connexion, Alt
 * pendant le drag pour neutraliser le magnétisme).
 */
defineProps<{ visible: boolean }>()
const { t } = useI18n()
</script>

<template>
  <div
    v-if="visible"
    class="pointer-events-none absolute inset-0 flex items-center justify-center z-10"
    aria-hidden="false"
  >
    <div
      class="pointer-events-auto app-surface border app-border rounded-xl shadow-lg max-w-lg mx-4 p-6 text-sm"
      role="status"
      :aria-label="t('emptyState.welcomeLabel')"
    >
      <h2 class="text-base font-semibold flex items-center gap-2 mb-2">
        <Sparkles :size="18" class="text-[var(--accent)]" aria-hidden="true" />
        {{ t('emptyState.title') }}
      </h2>
      <p class="app-muted mb-4">{{ t('emptyState.intro') }}</p>

      <ul class="space-y-2 mb-5">
        <li class="flex items-start gap-2">
          <MoveRight :size="16" class="mt-0.5 app-subtle" aria-hidden="true" />
          <span>
            {{ t('emptyState.dragFromLibrary', { library: t('sidebar.library') }) }}
          </span>
        </li>
        <li class="flex items-start gap-2">
          <Upload :size="16" class="mt-0.5 app-subtle" aria-hidden="true" />
          <span>
            {{ t('emptyState.importExisting', { import: t('toolbar.import') }) }}
          </span>
        </li>
        <li class="flex items-start gap-2">
          <Keyboard :size="16" class="mt-0.5 app-subtle" aria-hidden="true" />
          <span>
            {{ t('emptyState.pressF1', { f1: 'F1' }) }}
          </span>
        </li>
      </ul>

      <div class="border-t app-border pt-3">
        <p class="text-xs app-muted mb-2 font-medium">{{ t('emptyState.shortcutsTitle') }}</p>
        <ul class="text-xs space-y-1">
          <li class="flex justify-between gap-4">
            <span class="app-subtle">{{ t('emptyState.shortcutMarquee') }}</span>
            <kbd class="app-kbd">Shift + {{ t('common.drag') }}</kbd>
          </li>
          <li class="flex justify-between gap-4">
            <span class="app-subtle">{{ t('emptyState.shortcutConnect') }}</span>
            <kbd class="app-kbd">Shift + clic</kbd>
          </li>
          <li class="flex justify-between gap-4">
            <span class="app-subtle">{{ t('emptyState.shortcutNoSnap') }}</span>
            <kbd class="app-kbd">Alt</kbd>
            <span class="text-xs app-subtle">{{ t('emptyState.duringDrag') }}</span>
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>
