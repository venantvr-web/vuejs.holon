// src/composables/traits/useZoomable.ts
import { computed, ref, type Ref } from 'vue'
import { useGraphStore } from '../../stores/graph'
import { useViewport } from '../useViewport'
import { getNodeAbsolutePosition } from './utils/trait-helpers'

/**
 * Options de configuration pour le trait Zoomable.
 */
export interface ZoomableOptions {
  /**
   * Incrément de zoom pour les boutons +/−.
   * @default 0.1
   */
  zoomStep?: number
  /**
   * Marge en pixels écran lors d'un fit (zoomToFit, zoomToSelection).
   * @default 40
   */
  fitPadding?: number
}

/**
 * État réactif exposé par le trait Zoomable.
 */
export interface ZoomableState {
  /** Niveau de zoom actuel (1 = 100 %). */
  zoom: Ref<number>
  /** Niveau de zoom minimum (clamp). */
  minZoom: Ref<number>
  /** Niveau de zoom maximum (clamp). */
  maxZoom: Ref<number>
  /** Pourcentage de zoom arrondi (0–500). */
  zoomPercent: Ref<number>
}

/**
 * Handlers (actions) exposés par le trait Zoomable.
 */
export interface ZoomableHandlers {
  /** Augmente le zoom d'un pas. */
  zoomIn: () => void
  /** Diminue le zoom d'un pas. */
  zoomOut: () => void
  /**
   * Ajuste pan et zoom pour faire tenir tout le contenu du graphe dans
   * le viewport indiqué.
   */
  zoomToFit: (viewportWidth: number, viewportHeight: number) => void
  /**
   * Ajuste pan et zoom pour faire tenir la sélection indiquée dans le
   * viewport.
   * @param nodeIds - IDs des noeuds à recadrer
   */
  zoomToSelection: (nodeIds: string[], viewportWidth: number, viewportHeight: number) => void
  /**
   * Définit un niveau de zoom spécifique.
   * @param level - Niveau de zoom (clampé entre min et max)
   */
  setZoomLevel: (level: number) => void
  /** Réinitialise le zoom à 100 %. */
  resetZoom: () => void
}

/**
 * Trait permettant de gérer le zoom du canvas.
 *
 * Façade typée au-dessus de `useViewport`. `zoomToFit` et `zoomToSelection`
 * calculent la bounding box monde de la cible et la délèguent à
 * `viewport.fitWorldBox`, ce qui garantit qu'on ne dérive jamais de l'état
 * canonique du viewport.
 *
 * @example
 * ```typescript
 * const { zoom, zoomIn, zoomToFit } = useZoomable()
 * zoomToFit(window.innerWidth, window.innerHeight)
 * ```
 */
export function useZoomable(options: ZoomableOptions = {}): ZoomableState & ZoomableHandlers {
  const { zoomStep = 0.1, fitPadding = 40 } = options
  const viewport = useViewport()
  const graphStore = useGraphStore()

  // L'état canonique vit dans useViewport. On expose des refs typés pour
  // matcher le contrat ZoomableState ; min/max sont des constantes immuables
  // côté trait, donc des refs simples suffisent.
  const minZoom = ref(viewport.MIN_ZOOM)
  const maxZoom = ref(viewport.MAX_ZOOM)
  const zoom = computed<number>({
    get: () => viewport.zoomLevel.value,
    set: (v) => viewport.setZoom(v),
  })
  const zoomPercent = viewport.zoomPercent

  function zoomIn(): void {
    viewport.setZoom(viewport.zoomLevel.value + zoomStep)
  }

  function zoomOut(): void {
    viewport.setZoom(viewport.zoomLevel.value - zoomStep)
  }

  /**
   * Calcule la bounding box monde d'un ensemble de noeuds.
   * Retourne `null` si la sélection est vide ou invalide.
   */
  function computeWorldBox(
    nodeIds: string[]
  ): { x: number; y: number; w: number; h: number } | null {
    let minX = Infinity
    let minY = Infinity
    let maxX = -Infinity
    let maxY = -Infinity
    let count = 0

    for (const id of nodeIds) {
      const node = graphStore.nodes[id]
      if (!node) continue
      const pos = getNodeAbsolutePosition(id)
      if (!pos) continue
      minX = Math.min(minX, pos.x)
      minY = Math.min(minY, pos.y)
      maxX = Math.max(maxX, pos.x + node.geometry.w)
      maxY = Math.max(maxY, pos.y + node.geometry.h)
      count++
    }

    if (count === 0) return null
    return { x: minX, y: minY, w: maxX - minX, h: maxY - minY }
  }

  function zoomToFit(viewportWidth: number, viewportHeight: number): void {
    const allIds = Object.keys(graphStore.nodes)
    const box = computeWorldBox(allIds)
    if (!box) {
      viewport.resetView()
      return
    }
    viewport.fitWorldBox(box, viewportWidth, viewportHeight, fitPadding)
  }

  function zoomToSelection(nodeIds: string[], viewportWidth: number, viewportHeight: number): void {
    if (nodeIds.length === 0) return
    const box = computeWorldBox(nodeIds)
    if (!box) return
    viewport.fitWorldBox(box, viewportWidth, viewportHeight, fitPadding)
  }

  function setZoomLevel(level: number): void {
    viewport.setZoom(level)
  }

  function resetZoom(): void {
    viewport.setZoom(1)
  }

  return {
    zoom,
    minZoom,
    maxZoom,
    zoomPercent,
    zoomIn,
    zoomOut,
    zoomToFit,
    zoomToSelection,
    setZoomLevel,
    resetZoom,
  }
}
