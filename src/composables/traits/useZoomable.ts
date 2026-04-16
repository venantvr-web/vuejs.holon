// src/composables/traits/useZoomable.ts
import { ref, computed, type Ref } from 'vue';

/**
 * Options de configuration pour le trait Zoomable.
 */
export interface ZoomableOptions {
  /**
   * Niveau de zoom initial.
   * @default 1
   */
  initialZoom?: number;
  /**
   * Zoom minimum autorisé.
   * @default 0.1
   */
  minZoom?: number;
  /**
   * Zoom maximum autorisé.
   * @default 5
   */
  maxZoom?: number;
  /**
   * Incrément de zoom pour les boutons +/-.
   * @default 0.1
   */
  zoomStep?: number;
}

/**
 * État réactif exposé par le trait Zoomable.
 */
export interface ZoomableState {
  /**
   * Niveau de zoom actuel.
   */
  zoom: Ref<number>;
  /**
   * Niveau de zoom minimum.
   */
  minZoom: Ref<number>;
  /**
   * Niveau de zoom maximum.
   */
  maxZoom: Ref<number>;
  /**
   * Pourcentage de zoom (0-500%).
   */
  zoomPercent: Ref<number>;
}

/**
 * Handlers (actions) exposés par le trait Zoomable.
 */
export interface ZoomableHandlers {
  /**
   * Augmente le zoom.
   */
  zoomIn: () => void;
  /**
   * Diminue le zoom.
   */
  zoomOut: () => void;
  /**
   * Ajuste le zoom pour afficher tout le contenu.
   */
  zoomToFit: () => void;
  /**
   * Zoom sur une sélection de noeuds.
   * @param nodeIds - IDs des noeuds à zoomer
   */
  zoomToSelection: (nodeIds: string[]) => void;
  /**
   * Définit un niveau de zoom spécifique.
   * @param level - Niveau de zoom (0.1-5)
   */
  setZoomLevel: (level: number) => void;
  /**
   * Réinitialise le zoom à 100%.
   */
  resetZoom: () => void;
}

/**
 * Trait permettant de gérer le zoom du canvas.
 *
 * Fournit une API programmatique pour contrôler le niveau de zoom avec validation
 * des limites min/max et incréments configurables.
 *
 * @param options - Options de configuration
 * @returns État réactif et handlers pour le zoom
 *
 * @example
 * ```typescript
 * const { zoom, zoomIn, zoomOut, zoomToFit } = useZoomable({
 *   initialZoom: 1,
 *   minZoom: 0.1,
 *   maxZoom: 5
 * });
 *
 * // Zoomer
 * zoomIn();  // +10%
 * zoomOut(); // -10%
 *
 * // Zoom intelligent
 * zoomToFit(); // Affiche tout le contenu
 * ```
 */
export function useZoomable(options: ZoomableOptions = {}): ZoomableState & ZoomableHandlers {
  const {
    initialZoom = 1,
    minZoom: minZoomValue = 0.1,
    maxZoom: maxZoomValue = 5,
    zoomStep = 0.1,
  } = options;

  const zoom = ref(initialZoom);
  const minZoom = ref(minZoomValue);
  const maxZoom = ref(maxZoomValue);

  const zoomPercent = computed(() => Math.round(zoom.value * 100));

  /**
   * Clamp le zoom entre min et max.
   */
  function clampZoom(value: number): number {
    return Math.max(minZoom.value, Math.min(maxZoom.value, value));
  }

  /**
   * Zoom in.
   */
  function zoomIn(): void {
    zoom.value = clampZoom(zoom.value + zoomStep);
  }

  /**
   * Zoom out.
   */
  function zoomOut(): void {
    zoom.value = clampZoom(zoom.value - zoomStep);
  }

  /**
   * Zoom to fit (émet un événement).
   */
  function zoomToFit(): void {
    const event = new CustomEvent('zoom-to-fit');
    window.dispatchEvent(event);
  }

  /**
   * Zoom sur sélection (émet un événement).
   */
  function zoomToSelection(nodeIds: string[]): void {
    const event = new CustomEvent('zoom-to-selection', {
      detail: { nodeIds },
    });
    window.dispatchEvent(event);
  }

  /**
   * Set zoom level.
   */
  function setZoomLevel(level: number): void {
    zoom.value = clampZoom(level);
  }

  /**
   * Reset zoom.
   */
  function resetZoom(): void {
    zoom.value = 1;
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
  };
}
