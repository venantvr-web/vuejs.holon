<!-- src/components/canvas/CanvasEmptyState.vue -->
<script setup lang="ts">
import { Sparkles, MoveRight, Keyboard, Upload } from 'lucide-vue-next'

/**
 * Overlay affiché par-dessus le canevas quand le graphe est vide.
 *
 * Apporte un onboarding minimal : explique d'où viennent les noeuds (la
 * bibliothèque), rappelle l'import JSON, et liste les trois raccourcis
 * non évidents (Shift+drag pour la marquee, Shift+clic pour amorcer une
 * connexion, Alt pendant le drag pour neutraliser le magnétisme).
 *
 * Visuel : surface translucide centrée, n'intercepte que les clics sur ses
 * propres éléments interactifs ; le canevas reste atteignable au pointeur
 * en-dehors de la carte.
 */
defineProps<{ visible: boolean }>()
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
      aria-label="Bienvenue sur Holon — guide rapide"
    >
      <h2 class="text-base font-semibold flex items-center gap-2 mb-2">
        <Sparkles :size="18" class="text-[var(--accent)]" aria-hidden="true" />
        Commençons un nouveau modèle
      </h2>
      <p class="app-muted mb-4">Le canevas est vide. Plusieurs façons de démarrer&nbsp;:</p>

      <ul class="space-y-2 mb-5">
        <li class="flex items-start gap-2">
          <MoveRight :size="16" class="mt-0.5 app-subtle" aria-hidden="true" />
          <span>
            Glissez un bloc depuis la
            <span class="font-medium">Bibliothèque</span>
            (panneau de gauche) vers le canevas.
          </span>
        </li>
        <li class="flex items-start gap-2">
          <Upload :size="16" class="mt-0.5 app-subtle" aria-hidden="true" />
          <span>
            Importez un modèle existant (JSON Holon ou Archimate XML) avec le bouton
            <span class="font-medium">Importer</span> de la barre d'outils.
          </span>
        </li>
        <li class="flex items-start gap-2">
          <Keyboard :size="16" class="mt-0.5 app-subtle" aria-hidden="true" />
          <span>
            Appuyez sur
            <kbd class="app-kbd">F1</kbd>
            pour voir tous les raccourcis clavier.
          </span>
        </li>
      </ul>

      <div class="border-t app-border pt-3">
        <p class="text-xs app-muted mb-2 font-medium">Raccourcis utiles</p>
        <ul class="text-xs space-y-1">
          <li class="flex justify-between gap-4">
            <span class="app-subtle">Sélection rectangle</span>
            <kbd class="app-kbd">Shift + glisser</kbd>
          </li>
          <li class="flex justify-between gap-4">
            <span class="app-subtle">Relier deux noeuds</span>
            <kbd class="app-kbd">Shift + clic</kbd>
          </li>
          <li class="flex justify-between gap-4">
            <span class="app-subtle">Désactiver le magnétisme</span>
            <kbd class="app-kbd">Alt</kbd> (pendant le drag)
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>
