// src/composables/useViewport.ts
import { ref, computed } from 'vue'

/**
 * État global du viewport (pan + zoom) du canevas, partagé par GraphCanvas,
 * Toolbar, Minimap, Breadcrumb et toute autre vue ayant besoin de connaître
 * ou de modifier la caméra.
 */
const pan = ref({ x: 0, y: 0 })
const zoomLevel = ref(1)
/**
 * Taille en pixels écran du conteneur du canevas. Renseignée par GraphCanvas
 * via `setCanvasSize` au montage et sur ResizeObserver. Sert au culling
 * (savoir quel rectangle monde est visible).
 */
const canvasSize = ref({ w: 800, h: 600 })

const MIN_ZOOM = 0.1
const MAX_ZOOM = 5

export function useViewport() {
  const zoomPercent = computed(() => Math.round(zoomLevel.value * 100))

  /**
   * Rectangle visible en coordonnées monde.
   *
   * La transformation canevas est `translate(pan) scale(zoom)`, donc un point
   * écran (sx, sy) correspond au point monde `((sx − panX) / zoom, …)`. On
   * applique cette inversion aux deux coins du conteneur pour obtenir le
   * rectangle monde courant.
   */
  const visibleWorldRect = computed(() => {
    const z = zoomLevel.value
    return {
      x: -pan.value.x / z,
      y: -pan.value.y / z,
      w: canvasSize.value.w / z,
      h: canvasSize.value.h / z,
    }
  })

  function setCanvasSize(w: number, h: number) {
    canvasSize.value = { w, h }
  }

  /**
   * Interpole pan et zoom vers une cible sur `duration` millisecondes via
   * requestAnimationFrame. Easing « ease-out cubic » pour une décélération
   * naturelle. Annule toute animation précédente en cours.
   *
   * Utilisé pour les transitions « drill-down » (zoom dans un conteneur) et
   * « recadrage » (zoom-to-fit, zoom-to-selection).
   */
  let animationFrameId = 0
  function animateViewport(
    targetPan: { x: number; y: number },
    targetZoom: number,
    duration = 300
  ): void {
    if (animationFrameId) cancelAnimationFrame(animationFrameId)
    if (duration <= 0) {
      pan.value = targetPan
      zoomLevel.value = clampZoom(targetZoom)
      return
    }

    const startPan = { x: pan.value.x, y: pan.value.y }
    const startZoom = zoomLevel.value
    const endZoom = clampZoom(targetZoom)
    const t0 = performance.now()

    function step(now: number) {
      const t = Math.min(1, (now - t0) / duration)
      const eased = 1 - Math.pow(1 - t, 3)
      pan.value = {
        x: startPan.x + (targetPan.x - startPan.x) * eased,
        y: startPan.y + (targetPan.y - startPan.y) * eased,
      }
      zoomLevel.value = startZoom + (endZoom - startZoom) * eased
      if (t < 1) {
        animationFrameId = requestAnimationFrame(step)
      } else {
        animationFrameId = 0
      }
    }
    animationFrameId = requestAnimationFrame(step)
  }

  function clampZoom(z: number) {
    return Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, z))
  }

  function setZoom(newZoom: number) {
    zoomLevel.value = clampZoom(newZoom)
  }

  function zoomBy(factor: number) {
    zoomLevel.value = clampZoom(zoomLevel.value * factor)
  }

  /**
   * Réinitialise pan = (0, 0) et zoom = 1 avec animation rAF.
   *
   * Le paramètre `animate` accepte aussi un `MouseEvent` car Vue passe
   * l'évènement comme premier argument quand on lie `@click="resetView"` ;
   * dans ce cas on anime (sémantique par défaut). Pour un saut instantané,
   * passer explicitement `false`.
   */
  function resetView(animate: boolean | Event = true) {
    if (animate !== false) {
      animateViewport({ x: 0, y: 0 }, 1)
    } else {
      zoomLevel.value = 1
      pan.value = { x: 0, y: 0 }
    }
  }

  /** Zoom centré sur un point écran (conserve la position du point sous la souris). */
  function zoomAroundScreenPoint(factor: number, screenX: number, screenY: number) {
    const newZoom = clampZoom(zoomLevel.value * factor)
    const ratio = newZoom / zoomLevel.value
    pan.value = {
      x: screenX - (screenX - pan.value.x) * ratio,
      y: screenY - (screenY - pan.value.y) * ratio,
    }
    zoomLevel.value = newZoom
  }

  /**
   * Centre et ajuste le zoom pour faire tenir une bbox monde dans le
   * viewport écran. Animation rAF par défaut (« drill-down » fluide) ;
   * passer `animate = false` pour un saut instantané (utile aux tests et
   * aux recadrages automatiques en chaîne).
   */
  function fitWorldBox(
    box: { x: number; y: number; w: number; h: number },
    viewportW: number,
    viewportH: number,
    padding = 40,
    animate = true
  ) {
    if (box.w <= 0 || box.h <= 0) return
    const scale = Math.min(
      (viewportW - padding * 2) / box.w,
      (viewportH - padding * 2) / box.h,
      MAX_ZOOM
    )
    const z = Math.max(MIN_ZOOM, scale)
    const targetPan = {
      x: viewportW / 2 - (box.x + box.w / 2) * z,
      y: viewportH / 2 - (box.y + box.h / 2) * z,
    }
    if (animate) {
      animateViewport(targetPan, z)
    } else {
      zoomLevel.value = z
      pan.value = targetPan
    }
  }

  return {
    pan,
    zoomLevel,
    zoomPercent,
    canvasSize,
    visibleWorldRect,
    MIN_ZOOM,
    MAX_ZOOM,
    setZoom,
    zoomBy,
    resetView,
    zoomAroundScreenPoint,
    fitWorldBox,
    animateViewport,
    setCanvasSize,
  }
}
