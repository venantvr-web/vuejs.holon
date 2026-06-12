// src/composables/useViewport.ts
import { ref, computed } from 'vue'

/**
 * État global du viewport (pan + zoom) du canevas, partagé par GraphCanvas,
 * Toolbar, Minimap, Breadcrumb et toute autre vue ayant besoin de connaître
 * ou de modifier la caméra.
 */
const pan = ref({ x: 0, y: 0 })
const zoomLevel = ref(1)

const MIN_ZOOM = 0.1
const MAX_ZOOM = 5

export function useViewport() {
  const zoomPercent = computed(() => Math.round(zoomLevel.value * 100))

  function clampZoom(z: number) {
    return Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, z))
  }

  function setZoom(newZoom: number) {
    zoomLevel.value = clampZoom(newZoom)
  }

  function zoomBy(factor: number) {
    zoomLevel.value = clampZoom(zoomLevel.value * factor)
  }

  function resetView() {
    zoomLevel.value = 1
    pan.value = { x: 0, y: 0 }
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

  /** Centre et ajuste le zoom pour faire tenir une bbox monde dans le viewport écran. */
  function fitWorldBox(
    box: { x: number; y: number; w: number; h: number },
    viewportW: number,
    viewportH: number,
    padding = 40
  ) {
    if (box.w <= 0 || box.h <= 0) return
    const scale = Math.min(
      (viewportW - padding * 2) / box.w,
      (viewportH - padding * 2) / box.h,
      MAX_ZOOM
    )
    const z = Math.max(MIN_ZOOM, scale)
    zoomLevel.value = z
    pan.value = {
      x: viewportW / 2 - (box.x + box.w / 2) * z,
      y: viewportH / 2 - (box.y + box.h / 2) * z,
    }
  }

  return {
    pan,
    zoomLevel,
    zoomPercent,
    MIN_ZOOM,
    MAX_ZOOM,
    setZoom,
    zoomBy,
    resetView,
    zoomAroundScreenPoint,
    fitWorldBox,
  }
}
