// src/composables/traits/useDraggable.ts
import { ref, type Ref } from 'vue'
import { useGraphStore } from '../../stores/graph'
import { useSelectionState } from './useSelectable'
import { useSnappable, useSnapState } from './useSnappable'
import { isAncestorOf } from './utils/trait-helpers'
import { rafThrottle } from './utils/raf-throttle'
import type { Node } from '../../types'

/**
 * Options de configuration pour le trait Draggable.
 */
export interface DraggableOptions {
  /**
   * Référence réactive vers l'ID du noeud concerné.
   */
  nodeId: Ref<string>
  /**
   * Niveau de zoom actuel pour ajuster les déplacements.
   */
  zoomLevel?: Ref<number>
  /**
   * Callback appelé au début du glissement.
   */
  onDragStart?: () => void
  /**
   * Callback appelé pendant le glissement.
   * @param dx - Déplacement horizontal
   * @param dy - Déplacement vertical
   */
  onDragMove?: (dx: number, dy: number) => void
  /**
   * Callback appelé à la fin du glissement.
   */
  onDragEnd?: () => void
  /**
   * Si true, notifie le parent pour qu'il recalcule son autosize.
   */
  notifyParentOnMove?: boolean
}

/**
 * État réactif exposé par le trait Draggable.
 */
export interface DraggableState {
  /**
   * Indique si le noeud est actuellement en cours de glissement.
   */
  isDragging: Ref<boolean>
  /**
   * Delta de déplacement depuis le début du glissement.
   */
  dragDelta: Ref<{ x: number; y: number }>
}

/**
 * Handlers (actions) exposés par le trait Draggable.
 */
export interface DraggableHandlers {
  /**
   * Démarre le glissement du noeud.
   * @param event - Événement de souris déclencheur
   */
  handleDragStart: (event: MouseEvent) => void
}

/**
 * Trait permettant de rendre un noeud déplaçable par glisser-déposer.
 *
 * Gère automatiquement le zoom, les callbacks, et la notification du parent
 * pour les recalculs d'autosize des containers.
 *
 * @param options - Configuration du trait
 * @returns État réactif et handlers pour le glissement
 *
 * @example
 * ```typescript
 * const { isDragging, handleDragStart } = useDraggable({
 *   nodeId: ref('node-123'),
 *   zoomLevel: ref(1.5)
 * });
 * ```
 */
export function useDraggable(options: DraggableOptions): DraggableState & DraggableHandlers {
  const graphStore = useGraphStore()
  const { selectedNodeIds } = useSelectionState()
  const snap = useSnappable({ nodeId: options.nodeId })
  // Permet de désactiver le magnétisme temporairement (maintenir Alt pendant le drag).
  const snapDisabledForThisDrag = ref(false)

  const isDragging = ref(false)
  const dragStart = ref({ x: 0, y: 0 })
  const initialPos = ref({ x: 0, y: 0 })
  const dragDelta = ref({ x: 0, y: 0 })
  // Positions initiales des compagnons de drag (multi-sélection).
  // Stockés uniquement si le noeud est dans une sélection multiple au début du drag.
  const companionsInitial = ref<Map<string, { x: number; y: number }>>(new Map())

  function handleDragStart(event: MouseEvent) {
    // PointerEvent étend MouseEvent : la même signature accepte la souris,
    // le tactile et le stylet sans branchement. `button = 0` vaut « bouton
    // principal » dans tous les cas.
    if (event.button !== 0) return

    const node = graphStore.nodes[options.nodeId.value]
    if (!node) return

    event.stopPropagation()
    isDragging.value = true
    dragStart.value = { x: event.clientX, y: event.clientY }
    initialPos.value = { x: node.geometry.x, y: node.geometry.y }
    dragDelta.value = { x: 0, y: 0 }

    // Préparer le déplacement synchronisé si ce noeud fait partie d'une sélection multiple.
    companionsInitial.value = new Map()
    const selection = selectedNodeIds.value
    if (selection.has(options.nodeId.value) && selection.size > 1) {
      const selected = Array.from(selection)
      for (const id of selected) {
        if (id === options.nodeId.value) continue
        // Exclure les descendants d'un autre noeud sélectionné : ils suivront
        // automatiquement leur parent via la hiérarchie des transforms.
        const hasSelectedAncestor = selected.some(
          (other) => other !== id && isAncestorOf(other, id)
        )
        if (hasSelectedAncestor) continue

        const companion = graphStore.nodes[id]
        if (companion) {
          companionsInitial.value.set(id, { x: companion.geometry.x, y: companion.geometry.y })
        }
      }
    }

    options.onDragStart?.()

    // Pointer Events au lieu de mouse* pour supporter souris + tactile + stylet.
    window.addEventListener('pointermove', throttledDragMove)
    window.addEventListener('pointerup', handleDragEnd)
    window.addEventListener('pointercancel', handleDragEnd)
  }

  function handleDragMove(event: MouseEvent) {
    if (!isDragging.value) return

    // Alt pendant le drag désactive le magnétisme pour ce déplacement.
    snapDisabledForThisDrag.value = event.altKey

    const zoom = options.zoomLevel?.value ?? 1
    const rawDx = (event.clientX - dragStart.value.x) / zoom
    const rawDy = (event.clientY - dragStart.value.y) / zoom

    const node = graphStore.nodes[options.nodeId.value]
    if (!node) return

    // Appliquer le magnétisme au noeud principal (sauf si compagnons présents
    // : dans ce cas, le snap complique le déplacement synchronisé et on le
    // désactive pour préserver la cohérence du groupe traîné).
    let effectiveDx = rawDx
    let effectiveDy = rawDy
    if (companionsInitial.value.size === 0 && !snapDisabledForThisDrag.value) {
      const targetX = initialPos.value.x + rawDx
      const targetY = initialPos.value.y + rawDy
      const snapped = snap.snapPosition(targetX, targetY)
      effectiveDx = snapped.x - initialPos.value.x
      effectiveDy = snapped.y - initialPos.value.y
    } else {
      // Pas de snap : vider les guides actifs
      snap.activeGuides.value = []
      snap.isSnapping.value = false
    }

    dragDelta.value = { x: effectiveDx, y: effectiveDy }

    // Toutes les mutations d'un même tick de drag tiennent dans une seule
    // transaction IndexedDB pour garantir l'atomicité (pas de demi-drag
    // persisté) et réduire l'overhead.
    const patches: Array<{ id: string; updates: Partial<Node> }> = [
      {
        id: options.nodeId.value,
        updates: {
          geometry: {
            ...node.geometry,
            x: initialPos.value.x + effectiveDx,
            y: initialPos.value.y + effectiveDy,
          },
        },
      },
    ]

    for (const [id, start] of companionsInitial.value) {
      const companion = graphStore.nodes[id]
      if (!companion) continue
      patches.push({
        id,
        updates: {
          geometry: {
            ...companion.geometry,
            x: start.x + effectiveDx,
            y: start.y + effectiveDy,
          },
        },
      })
    }

    graphStore.batchedUpdateNodes(patches)

    options.onDragMove?.(effectiveDx, effectiveDy)
  }

  // Throttle à 1 fois par frame : les MouseEvent peuvent arriver à 120+ Hz
  // alors que le rendu est plafonné à 60–120. Inutile de mettre à jour le
  // store plus souvent que l'écran ne rafraîchit.
  const throttledDragMove = rafThrottle(handleDragMove)

  function handleDragEnd() {
    isDragging.value = false
    companionsInitial.value.clear()
    // Effacer les guides de snap (locaux et globaux)
    snap.activeGuides.value = []
    snap.isSnapping.value = false
    const { clearActiveGuides } = useSnapState()
    clearActiveGuides()

    // Notifier le parent pour recalculer l'autosize
    if (options.notifyParentOnMove !== false) {
      notifyParentAutosize()
    }

    options.onDragEnd?.()

    // Annuler une frame déjà planifiée (peut survivre au pointerup si le
    // dernier pointermove est arrivé juste avant).
    throttledDragMove.cancel()
    window.removeEventListener('pointermove', throttledDragMove)
    window.removeEventListener('pointerup', handleDragEnd)
    window.removeEventListener('pointercancel', handleDragEnd)
  }

  /** Notifie le parent que cet enfant a bougé, pour déclencher l'autosize */
  function notifyParentAutosize() {
    const node = graphStore.nodes[options.nodeId.value]
    if (!node?.parentId) return

    // Émettre un événement custom que le parent peut écouter
    // On utilise un CustomEvent sur window pour découpler les composants
    window.dispatchEvent(
      new CustomEvent('child-moved', {
        detail: {
          childId: options.nodeId.value,
          parentId: node.parentId,
        },
      })
    )
  }

  return {
    isDragging,
    dragDelta,
    handleDragStart,
  }
}
