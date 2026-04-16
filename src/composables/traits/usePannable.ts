// src/composables/traits/usePannable.ts
import { ref, type Ref } from 'vue';

/**
 * Options de configuration pour le trait Pannable.
 */
export interface PannableOptions {
  /**
   * Position initiale du pan X.
   * @default 0
   */
  initialX?: number;
  /**
   * Position initiale du pan Y.
   * @default 0
   */
  initialY?: number;
  /**
   * Activer l'animation des transitions.
   * @default true
   */
  animate?: boolean;
  /**
   * Durée de l'animation en ms.
   * @default 300
   */
  animationDuration?: number;
}

/**
 * État réactif exposé par le trait Pannable.
 */
export interface PannableState {
  /**
   * Position X du pan.
   */
  panX: Ref<number>;
  /**
   * Position Y du pan.
   */
  panY: Ref<number>;
  /**
   * Indique si une animation est en cours.
   */
  isAnimating: Ref<boolean>;
}

/**
 * Handlers (actions) exposés par le trait Pannable.
 */
export interface PannableHandlers {
  /**
   * Déplace la vue vers une position absolue.
   * @param x - Position X cible
   * @param y - Position Y cible
   * @param animate - Animer la transition
   */
  panTo: (x: number, y: number, animate?: boolean) => void;
  /**
   * Déplace la vue de manière relative.
   * @param dx - Déplacement X
   * @param dy - Déplacement Y
   */
  panBy: (dx: number, dy: number) => void;
  /**
   * Réinitialise le pan à l'origine.
   * @param animate - Animer la transition
   */
  resetPan: (animate?: boolean) => void;
  /**
   * Centre la vue sur un point.
   * @param x - Coordonnée X à centrer
   * @param y - Coordonnée Y à centrer
   * @param viewportWidth - Largeur du viewport
   * @param viewportHeight - Hauteur du viewport
   * @param animate - Animer la transition
   */
  centerOn: (
    x: number,
    y: number,
    viewportWidth: number,
    viewportHeight: number,
    animate?: boolean
  ) => void;
}

/**
 * Trait permettant de gérer le pan (déplacement) du canvas.
 *
 * Fournit une API programmatique pour contrôler la position du viewport avec
 * support optionnel de l'animation pour des transitions fluides.
 *
 * @param options - Options de configuration
 * @returns État réactif et handlers pour le pan
 *
 * @example
 * ```typescript
 * const { panX, panY, panTo, panBy, centerOn } = usePannable({
 *   initialX: 0,
 *   initialY: 0,
 *   animate: true
 * });
 *
 * // Déplacement absolu
 * panTo(100, 200, true); // avec animation
 *
 * // Déplacement relatif
 * panBy(50, -30); // décale de 50px à droite, 30px vers le haut
 *
 * // Centrer sur un point
 * centerOn(nodeX, nodeY, viewportW, viewportH, true);
 * ```
 */
export function usePannable(options: PannableOptions = {}): PannableState & PannableHandlers {
  const {
    initialX = 0,
    initialY = 0,
    animate: defaultAnimate = true,
    animationDuration = 300,
  } = options;

  const panX = ref(initialX);
  const panY = ref(initialY);
  const isAnimating = ref(false);

  /**
   * Pan to absolute position.
   */
  function panTo(x: number, y: number, animate: boolean = defaultAnimate): void {
    if (animate) {
      isAnimating.value = true;

      // Émettre événement pour animation CSS
      const event = new CustomEvent('pan-animate', {
        detail: { x, y, duration: animationDuration },
      });
      window.dispatchEvent(event);

      setTimeout(() => {
        panX.value = x;
        panY.value = y;
        isAnimating.value = false;
      }, animationDuration);
    } else {
      panX.value = x;
      panY.value = y;
    }
  }

  /**
   * Pan by relative offset.
   */
  function panBy(dx: number, dy: number): void {
    panX.value += dx;
    panY.value += dy;
  }

  /**
   * Reset pan to origin.
   */
  function resetPan(animate: boolean = defaultAnimate): void {
    panTo(0, 0, animate);
  }

  /**
   * Center on a point.
   */
  function centerOn(
    x: number,
    y: number,
    viewportWidth: number,
    viewportHeight: number,
    animate: boolean = defaultAnimate
  ): void {
    const targetX = viewportWidth / 2 - x;
    const targetY = viewportHeight / 2 - y;
    panTo(targetX, targetY, animate);
  }

  return {
    panX,
    panY,
    isAnimating,
    panTo,
    panBy,
    resetPan,
    centerOn,
  };
}
