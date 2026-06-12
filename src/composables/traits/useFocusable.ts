// src/composables/traits/useFocusable.ts
import { ref, computed, type Ref } from 'vue'
import { useGraphStore } from '../../stores/graph'
import { getCachedAbsolutePosition } from './utils/position-cache'
import type { Node } from '../../types'

/**
 * Directions cardinales utilisées pour la navigation spatiale au clavier.
 */
export type SpatialDirection = 'up' | 'down' | 'left' | 'right'

/**
 * Options de configuration pour le trait Focusable.
 */
export interface FocusableOptions {
  /**
   * ID du noeud concerné.
   */
  nodeId: Ref<string>
  /**
   * Index de tabulation.
   * @default 0
   */
  tabIndex?: number
  /**
   * Activer le focus trap (pour modales).
   * @default false
   */
  focusTrap?: boolean
}

/**
 * État réactif exposé par le trait Focusable.
 */
export interface FocusableState {
  /**
   * Indique si le noeud a le focus.
   */
  hasFocus: Ref<boolean>
  /**
   * Index de tabulation actuel.
   */
  tabIndex: Ref<number>
  /**
   * Indique si le noeud est focusable.
   */
  isFocusable: Ref<boolean>
}

/**
 * Handlers (actions) exposés par le trait Focusable.
 */
export interface FocusableHandlers {
  /**
   * Donne le focus au noeud.
   */
  focus: () => void
  /**
   * Retire le focus du noeud.
   */
  blur: () => void
  /**
   * Focus sur le noeud suivant (Tab).
   */
  focusNext: () => void
  /**
   * Focus sur le noeud précédent (Shift+Tab).
   */
  focusPrevious: () => void
  /**
   * Déplace le focus sur le noeud le plus proche dans la direction indiquée
   * (haut, bas, gauche, droite). Pondère la distance par l'écart à l'axe
   * pour préférer un voisin réellement aligné.
   */
  focusInDirection: (direction: SpatialDirection) => void
  /**
   * Définit l'index de tabulation.
   * @param index - Nouvel index
   */
  setTabIndex: (index: number) => void
  /**
   * Active/désactive le focus.
   * @param enabled - Activer ou désactiver
   */
  setFocusable: (enabled: boolean) => void
}

// État global du focus
const globalFocusedNodeId = ref<string | null>(null)
const focusTrapEnabled = ref(false)

/**
 * Trait permettant de gérer le focus clavier pour la navigation accessible.
 *
 * Implémente la navigation au clavier (Tab, Shift+Tab, flèches) et le focus trap
 * pour les modales. Conforme WCAG 2.1 AA pour l'accessibilité.
 *
 * @param options - Options de configuration
 * @returns État réactif et handlers pour le focus
 *
 * @example
 * ```typescript
 * const { hasFocus, focus, blur, focusNext } = useFocusable({
 *   nodeId: ref('node-123'),
 *   tabIndex: 0
 * });
 *
 * // Donner le focus
 * focus();
 *
 * // Navigation clavier
 * focusNext(); // Tab
 * focusPrevious(); // Shift+Tab
 * ```
 */
export function useFocusable(options: FocusableOptions): FocusableState & FocusableHandlers {
  const graphStore = useGraphStore()

  const tabIndex = ref(options.tabIndex ?? 0)
  const isFocusable = ref(true)

  const hasFocus = computed(() => globalFocusedNodeId.value === options.nodeId.value)

  /**
   * Donne le focus.
   */
  function focus(): void {
    if (!isFocusable.value) return

    const node = graphStore.nodes[options.nodeId.value]
    if (!node) return

    // Vérifier si le noeud est verrouillé
    if (node.data?.locked) return

    globalFocusedNodeId.value = options.nodeId.value

    // Émettre événement pour scroll vers le noeud
    const event = new CustomEvent('node-focused', {
      detail: { nodeId: options.nodeId.value },
    })
    window.dispatchEvent(event)
  }

  /**
   * Retire le focus.
   */
  function blur(): void {
    if (globalFocusedNodeId.value === options.nodeId.value) {
      globalFocusedNodeId.value = null
    }
  }

  /**
   * Focus suivant (Tab).
   */
  function focusNext(): void {
    const allNodes = Object.values(graphStore.nodes)
    const focusableNodes = allNodes.filter((n) => !n.data?.locked)

    if (focusableNodes.length === 0) return

    const currentIndex = focusableNodes.findIndex((n) => n.id === options.nodeId.value)

    const nextIndex = (currentIndex + 1) % focusableNodes.length
    const nextNode = focusableNodes[nextIndex]

    globalFocusedNodeId.value = nextNode.id

    // Émettre événement
    const event = new CustomEvent('node-focused', {
      detail: { nodeId: nextNode.id },
    })
    window.dispatchEvent(event)
  }

  /**
   * Focus précédent (Shift+Tab).
   */
  function focusPrevious(): void {
    const allNodes = Object.values(graphStore.nodes)
    const focusableNodes = allNodes.filter((n) => !n.data?.locked)

    if (focusableNodes.length === 0) return

    const currentIndex = focusableNodes.findIndex((n) => n.id === options.nodeId.value)

    const prevIndex = currentIndex - 1 < 0 ? focusableNodes.length - 1 : currentIndex - 1
    const prevNode = focusableNodes[prevIndex]

    globalFocusedNodeId.value = prevNode.id

    // Émettre événement
    const event = new CustomEvent('node-focused', {
      detail: { nodeId: prevNode.id },
    })
    window.dispatchEvent(event)
  }

  /**
   * Navigation spatiale : trouve le noeud le plus proche dans la direction
   * indiquée et lui donne le focus.
   *
   * Heuristique :
   * 1. On calcule le centre absolu du noeud courant et de tous les candidats.
   * 2. On garde uniquement les noeuds dont le centre est *strictement* du
   *    bon côté (par exemple, à droite pour `direction = 'right'`).
   * 3. Parmi eux, on minimise une distance pondérée :
   *      d = écart_axial + 2 × écart_perpendiculaire
   *    qui pénalise les voisins peu alignés avec le couloir directionnel.
   */
  function focusInDirection(direction: SpatialDirection): void {
    const currentNode = graphStore.nodes[options.nodeId.value]
    if (!currentNode) return
    const currentPos = getCachedAbsolutePosition(
      currentNode.id,
      graphStore.nodes as Record<string, Node>
    )
    if (!currentPos) return
    const cx = currentPos.x + currentNode.geometry.w / 2
    const cy = currentPos.y + currentNode.geometry.h / 2

    let best: { id: string; score: number } | null = null
    for (const candidate of Object.values(graphStore.nodes) as Node[]) {
      if (candidate.id === currentNode.id) continue
      if (candidate.data?.locked) continue
      const pos = getCachedAbsolutePosition(candidate.id, graphStore.nodes as Record<string, Node>)
      if (!pos) continue
      const px = pos.x + candidate.geometry.w / 2
      const py = pos.y + candidate.geometry.h / 2
      const dx = px - cx
      const dy = py - cy

      // Couloir directionnel : on ne considère que les voisins du bon côté.
      // Une marge de 1 px évite les zéros qui mèneraient à des incertitudes.
      let axial: number
      let perp: number
      switch (direction) {
        case 'right':
          // Cône 45° : on n'accepte un voisin que s'il est davantage à droite
          // qu'en haut ou en bas (sinon une flèche → choisirait un nœud bien
          // au-dessus mais à peine décalé).
          if (dx <= 1 || dx < Math.abs(dy)) continue
          axial = dx
          perp = Math.abs(dy)
          break
        case 'left':
          if (dx >= -1 || -dx < Math.abs(dy)) continue
          axial = -dx
          perp = Math.abs(dy)
          break
        case 'down':
          if (dy <= 1 || dy < Math.abs(dx)) continue
          axial = dy
          perp = Math.abs(dx)
          break
        case 'up':
          if (dy >= -1 || -dy < Math.abs(dx)) continue
          axial = -dy
          perp = Math.abs(dx)
          break
      }

      const score = axial + 2 * perp
      if (!best || score < best.score) {
        best = { id: candidate.id, score }
      }
    }

    if (!best) return
    globalFocusedNodeId.value = best.id
    window.dispatchEvent(new CustomEvent('node-focused', { detail: { nodeId: best.id } }))
  }

  /**
   * Set tab index.
   */
  function setTabIndex(index: number): void {
    tabIndex.value = index
  }

  /**
   * Set focusable.
   */
  function setFocusable(enabled: boolean): void {
    isFocusable.value = enabled

    if (!enabled && hasFocus.value) {
      blur()
    }
  }

  return {
    hasFocus,
    tabIndex,
    isFocusable,
    focus,
    blur,
    focusNext,
    focusPrevious,
    focusInDirection,
    setTabIndex,
    setFocusable,
  }
}

/**
 * Composable global pour interroger / piloter l'état de focus sans avoir à
 * instancier `useFocusable` pour un noeud spécifique.
 *
 * Utilisé par `GraphCanvas` pour câbler les flèches du clavier au noeud
 * actuellement focalisé, peu importe lequel.
 */
export function useFocusedNodeState() {
  const graphStore = useGraphStore()

  function focusInDirection(direction: SpatialDirection): void {
    const sourceId = globalFocusedNodeId.value
    if (!sourceId) return
    const source = graphStore.nodes[sourceId] as Node | undefined
    if (!source) return
    const sourcePos = getCachedAbsolutePosition(sourceId, graphStore.nodes as Record<string, Node>)
    if (!sourcePos) return
    const cx = sourcePos.x + source.geometry.w / 2
    const cy = sourcePos.y + source.geometry.h / 2

    let best: { id: string; score: number } | null = null
    for (const candidate of Object.values(graphStore.nodes) as Node[]) {
      if (candidate.id === sourceId) continue
      if (candidate.data?.locked) continue
      const pos = getCachedAbsolutePosition(candidate.id, graphStore.nodes as Record<string, Node>)
      if (!pos) continue
      const px = pos.x + candidate.geometry.w / 2
      const py = pos.y + candidate.geometry.h / 2
      const dx = px - cx
      const dy = py - cy

      let axial: number
      let perp: number
      switch (direction) {
        case 'right':
          // Cône 45° : on n'accepte un voisin que s'il est davantage à droite
          // qu'en haut ou en bas (sinon une flèche → choisirait un nœud bien
          // au-dessus mais à peine décalé).
          if (dx <= 1 || dx < Math.abs(dy)) continue
          axial = dx
          perp = Math.abs(dy)
          break
        case 'left':
          if (dx >= -1 || -dx < Math.abs(dy)) continue
          axial = -dx
          perp = Math.abs(dy)
          break
        case 'down':
          if (dy <= 1 || dy < Math.abs(dx)) continue
          axial = dy
          perp = Math.abs(dx)
          break
        case 'up':
          if (dy >= -1 || -dy < Math.abs(dx)) continue
          axial = -dy
          perp = Math.abs(dx)
          break
      }

      const score = axial + 2 * perp
      if (!best || score < best.score) {
        best = { id: candidate.id, score }
      }
    }

    if (!best) return
    globalFocusedNodeId.value = best.id
    window.dispatchEvent(new CustomEvent('node-focused', { detail: { nodeId: best.id } }))
  }

  function clearFocus(): void {
    globalFocusedNodeId.value = null
  }

  return {
    focusedNodeId: computed(() => globalFocusedNodeId.value),
    focusInDirection,
    clearFocus,
  }
}

/**
 * Composable global pour gérer le focus trap (modales).
 */
export function useFocusTrap() {
  function enableTrap(): void {
    focusTrapEnabled.value = true
  }

  function disableTrap(): void {
    focusTrapEnabled.value = false
  }

  return {
    enabled: computed(() => focusTrapEnabled.value),
    enableTrap,
    disableTrap,
  }
}
