<!-- src/components/ui/TooltipHost.vue -->
<script setup lang="ts">
import { computed, onMounted, onBeforeUnmount, ref, watch } from 'vue'
import { useTooltipUI, TOOLTIP_HOST_ID } from '../../composables/useTooltipUI'

/**
 * Hôte unique du système de tooltip UI. Rend la bulle active déclarée par
 * la directive `v-tooltip` ou le composable `useTooltipUI`.
 *
 * Principes :
 * - **Peu intrusif** : petite carte (12 px de police), surface translucide,
 *   ombre douce, apparition de 90 ms en `opacity` uniquement (pas de
 *   `transform` qui happerait l'attention).
 * - **Positionnement** : on demande le placement préféré (`top` par défaut)
 *   puis on bascule à l'opposé si le viewport manque de place. Centrage
 *   horizontal sur la cible, contraint aux bords de la fenêtre avec 8 px
 *   de marge.
 * - **Accessibilité** : `role="tooltip"` + `id` partagé, lu via
 *   `aria-describedby` sur chaque cible.
 * - **Échap** : ferme le tooltip si visible (WCAG 1.4.13 : « dismissible »).
 */
const { activeTooltip, hide } = useTooltipUI()
const hostRef = ref<HTMLElement | null>(null)

/**
 * Position finale du tooltip en coordonnées écran. Recalculée à chaque
 * activation et après le premier rendu (on a besoin des dimensions réelles
 * de la carte).
 */
const position = ref({ x: 0, y: 0 })

/**
 * Distance entre la carte et l'élément cible, en pixels.
 */
const MARGIN = 8

/**
 * Calcule la position absolue idéale et bascule si nécessaire.
 *
 * NB : on s'appuie sur la mesure du DOM via `getBoundingClientRect` ; appelé
 * dans un `watch` immediate + via `requestAnimationFrame` pour garantir que
 * le rendu initial a été fait.
 */
function computePlacement() {
  const tip = activeTooltip.value
  const host = hostRef.value
  if (!tip || !host) return
  const targetRect = tip.targetRect
  const cardRect = host.getBoundingClientRect()
  const vw = window.innerWidth
  const vh = window.innerHeight

  // Pour `top` : carte au-dessus de la cible. Bascule en `bottom` si elle
  // déborde au-dessus du viewport.
  let placement = tip.placement
  if (placement === 'top' && targetRect.y - cardRect.height - MARGIN < 0) {
    placement = 'bottom'
  } else if (
    placement === 'bottom' &&
    targetRect.y + targetRect.h + cardRect.height + MARGIN > vh
  ) {
    placement = 'top'
  } else if (placement === 'left' && targetRect.x - cardRect.width - MARGIN < 0) {
    placement = 'right'
  } else if (placement === 'right' && targetRect.x + targetRect.w + cardRect.width + MARGIN > vw) {
    placement = 'left'
  }

  let x = 0
  let y = 0
  switch (placement) {
    case 'top':
      x = targetRect.x + targetRect.w / 2 - cardRect.width / 2
      y = targetRect.y - cardRect.height - MARGIN
      break
    case 'bottom':
      x = targetRect.x + targetRect.w / 2 - cardRect.width / 2
      y = targetRect.y + targetRect.h + MARGIN
      break
    case 'left':
      x = targetRect.x - cardRect.width - MARGIN
      y = targetRect.y + targetRect.h / 2 - cardRect.height / 2
      break
    case 'right':
      x = targetRect.x + targetRect.w + MARGIN
      y = targetRect.y + targetRect.h / 2 - cardRect.height / 2
      break
  }

  // Contrainte aux bords du viewport.
  x = Math.max(8, Math.min(x, vw - cardRect.width - 8))
  y = Math.max(8, Math.min(y, vh - cardRect.height - 8))

  position.value = { x, y }
}

watch(activeTooltip, (next) => {
  if (!next) return
  // Premier rendu : on positionne au cadre de la cible le temps que la
  // carte soit mesurée, puis on rappelle au frame suivant.
  position.value = { x: next.targetRect.x, y: next.targetRect.y }
  requestAnimationFrame(computePlacement)
})

function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape' && activeTooltip.value) {
    hide()
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleKeydown)
})

const visible = computed(() => activeTooltip.value !== null)
</script>

<template>
  <Teleport to="body">
    <div
      :id="TOOLTIP_HOST_ID"
      ref="hostRef"
      role="tooltip"
      class="holon-tooltip-host"
      :class="{ 'holon-tooltip-host--visible': visible }"
      :style="{
        transform: `translate(${position.x}px, ${position.y}px)`,
      }"
    >
      {{ activeTooltip?.text }}
    </div>
  </Teleport>
</template>

<style scoped>
.holon-tooltip-host {
  position: fixed;
  top: 0;
  left: 0;
  pointer-events: none;
  max-width: 18rem;
  padding: 4px 8px;
  font-size: 12px;
  line-height: 1.35;
  color: var(--fg);
  background: var(--surface-2);
  border: 1px solid var(--border);
  border-radius: 6px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
  opacity: 0;
  transition: opacity 0.09s ease-out;
  z-index: 9999;
  white-space: normal;
}
.holon-tooltip-host--visible {
  opacity: 0.95;
}
.dark .holon-tooltip-host {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
}
</style>
