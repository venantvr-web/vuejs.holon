// src/composables/traits/usePannable.ts
import { computed, ref, type Ref } from 'vue'
import { useViewport } from '../useViewport'

/**
 * Options de configuration pour le trait Pannable.
 */
export interface PannableOptions {
  /**
   * Durée par défaut de l'animation en millisecondes.
   * @default 300
   */
  animationDuration?: number
}

/**
 * État réactif exposé par le trait Pannable.
 */
export interface PannableState {
  /** Position X du pan. */
  panX: Ref<number>
  /** Position Y du pan. */
  panY: Ref<number>
  /** Indique si une animation est en cours. */
  isAnimating: Ref<boolean>
}

/**
 * Handlers (actions) exposés par le trait Pannable.
 */
export interface PannableHandlers {
  /**
   * Déplace la vue vers une position absolue.
   * @param x - Position X cible
   * @param y - Position Y cible
   * @param animate - Animer la transition (défaut : `true`)
   */
  panTo: (x: number, y: number, animate?: boolean) => void
  /**
   * Déplace la vue de manière relative.
   * @param dx - Déplacement X
   * @param dy - Déplacement Y
   */
  panBy: (dx: number, dy: number) => void
  /**
   * Réinitialise le pan à l'origine.
   * @param animate - Animer la transition (défaut : `true`)
   */
  resetPan: (animate?: boolean) => void
  /**
   * Centre la vue sur un point monde donné.
   * @param x - Coordonnée X monde à centrer
   * @param y - Coordonnée Y monde à centrer
   * @param viewportWidth - Largeur du viewport en pixels
   * @param viewportHeight - Hauteur du viewport en pixels
   * @param animate - Animer la transition (défaut : `true`)
   */
  centerOn: (
    x: number,
    y: number,
    viewportWidth: number,
    viewportHeight: number,
    animate?: boolean
  ) => void
}

/**
 * Trait permettant de gérer le pan (déplacement) du canvas.
 *
 * Façade typée au-dessus de `useViewport` — toutes les implémentations partagent
 * le même état canonique (pan, zoom) pour éviter les dérives de transformation
 * entre les espaces local, monde et écran.
 *
 * @example
 * ```typescript
 * const { panX, panY, panTo, centerOn } = usePannable()
 * panTo(100, 200, true)
 * centerOn(nodeWorldX, nodeWorldY, viewportW, viewportH)
 * ```
 */
export function usePannable(options: PannableOptions = {}): PannableState & PannableHandlers {
  const { animationDuration = 300 } = options
  const viewport = useViewport()
  const isAnimating = ref(false)

  // Vues mutables sur l'état canonique : lire/écrire panX/panY met à jour viewport.pan.
  const panX = computed<number>({
    get: () => viewport.pan.value.x,
    set: (v) => {
      viewport.pan.value = { x: v, y: viewport.pan.value.y }
    },
  })
  const panY = computed<number>({
    get: () => viewport.pan.value.y,
    set: (v) => {
      viewport.pan.value = { x: viewport.pan.value.x, y: v }
    },
  })

  function animatePan(targetX: number, targetY: number, duration: number): void {
    const startX = viewport.pan.value.x
    const startY = viewport.pan.value.y
    const startTime = performance.now()
    isAnimating.value = true

    function step(now: number) {
      const t = Math.min(1, (now - startTime) / duration)
      // Easing « ease-out cubic » pour une décélération naturelle.
      const eased = 1 - Math.pow(1 - t, 3)
      viewport.pan.value = {
        x: startX + (targetX - startX) * eased,
        y: startY + (targetY - startY) * eased,
      }
      if (t < 1) {
        requestAnimationFrame(step)
      } else {
        isAnimating.value = false
      }
    }
    requestAnimationFrame(step)
  }

  function panTo(x: number, y: number, animate = true): void {
    if (animate && animationDuration > 0) {
      animatePan(x, y, animationDuration)
    } else {
      viewport.pan.value = { x, y }
    }
  }

  function panBy(dx: number, dy: number): void {
    viewport.pan.value = {
      x: viewport.pan.value.x + dx,
      y: viewport.pan.value.y + dy,
    }
  }

  function resetPan(animate = true): void {
    panTo(0, 0, animate)
  }

  function centerOn(
    x: number,
    y: number,
    viewportWidth: number,
    viewportHeight: number,
    animate = true
  ): void {
    // x, y sont en coordonnées monde. La transformation visuelle est
    // « translate(pan) scale(zoom) » donc pour que (x, y) tombe au centre
    // écran (vw/2, vh/2) il faut pan = centre_écran − x · zoom.
    const z = viewport.zoomLevel.value
    panTo(viewportWidth / 2 - x * z, viewportHeight / 2 - y * z, animate)
  }

  return {
    panX,
    panY,
    isAnimating,
    panTo,
    panBy,
    resetPan,
    centerOn,
  }
}
