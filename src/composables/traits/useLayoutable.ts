// src/composables/traits/useLayoutable.ts
import { ref, type Ref } from 'vue'
import { useGraphStore } from '../../stores/graph'
import { forceSimulation, forceLink, forceManyBody, forceCenter, forceCollide } from 'd3-force'
import { hierarchy, tree } from 'd3-hierarchy'

/**
 * Algorithmes de layout disponibles.
 */
export type LayoutAlgorithm = 'force' | 'hierarchical' | 'circular' | 'grid' | 'tree'

/**
 * Options générales de layout.
 */
export interface LayoutOptions {
  /**
   * Animer l'application du layout.
   * @default true
   */
  animate?: boolean
  /**
   * Durée de l'animation en ms.
   * @default 1000
   */
  duration?: number
  /**
   * Espacement entre les noeuds.
   * @default 100
   */
  spacing?: number
}

/**
 * Options spécifiques au layout force-directed.
 */
export interface ForceLayoutOptions extends LayoutOptions {
  /**
   * Force de répulsion entre noeuds.
   * @default -300
   */
  chargeStrength?: number
  /**
   * Distance des liens.
   * @default 100
   */
  linkDistance?: number
  /**
   * Force de collision (évite chevauchements).
   * @default 50
   */
  collisionRadius?: number
}

/**
 * Options spécifiques au layout hiérarchique.
 */
export interface HierarchicalLayoutOptions extends LayoutOptions {
  /**
   * Direction du layout.
   * @default 'top-bottom'
   */
  direction?: 'top-bottom' | 'bottom-top' | 'left-right' | 'right-left'
  /**
   * Espacement vertical entre niveaux.
   * @default 150
   */
  levelSpacing?: number
}

/**
 * État réactif exposé par le trait Layoutable.
 */
export interface LayoutableState {
  /**
   * Layout en cours d'application.
   */
  isLayouting: Ref<boolean>
  /**
   * Algorithme actuel.
   */
  currentAlgorithm: Ref<LayoutAlgorithm | null>
}

/**
 * Handlers (actions) exposés par le trait Layoutable.
 */
export interface LayoutableHandlers {
  /**
   * Applique un algorithme de layout.
   * @param algorithm - Algorithme à utiliser
   * @param options - Options de configuration
   */
  applyLayout: (algorithm: LayoutAlgorithm, options?: LayoutOptions) => Promise<void>
  /**
   * Arrête le layout en cours.
   */
  stopLayout: () => void
  /**
   * Réinitialise les positions des noeuds.
   */
  resetLayout: () => void
}

/**
 * Trait permettant d'appliquer des algorithmes de layout automatique.
 *
 * Supporte 5 algorithmes :
 * - **force**: Force-directed avec d3-force (Fruchterman-Reingold)
 * - **hierarchical**: Layout hiérarchique par niveaux
 * - **circular**: Disposition circulaire
 * - **grid**: Grille régulière
 * - **tree**: Arbre avec d3-hierarchy (Reingold-Tilford)
 *
 * @returns État réactif et handlers pour les layouts
 *
 * @example
 * ```typescript
 * const { applyLayout, stopLayout } = useLayoutable();
 *
 * // Layout force-directed
 * await applyLayout('force', {
 *   chargeStrength: -500,
 *   linkDistance: 150,
 *   animate: true
 * });
 *
 * // Layout hiérarchique
 * await applyLayout('hierarchical', {
 *   direction: 'top-bottom',
 *   levelSpacing: 200
 * });
 * ```
 */
// État global (partagé entre toutes les instances).
const isLayouting = ref(false)
const currentAlgorithm = ref<LayoutAlgorithm | null>(null)
let simulation: any = null

export function useLayoutable(): LayoutableState & LayoutableHandlers {
  const graphStore = useGraphStore()

  /**
   * Layout force-directed avec d3-force.
   */
  async function applyForceLayout(options: ForceLayoutOptions = {}): Promise<void> {
    const {
      chargeStrength = -300,
      linkDistance = 100,
      collisionRadius = 50,
      animate = true,
      duration = 1000,
    } = options

    const nodes = Object.values(graphStore.nodes).map((n) => ({
      id: n.id,
      x: n.geometry.x,
      y: n.geometry.y,
    }))

    const links = Object.values(graphStore.edges).map((e) => ({
      source: e.sourceId,
      target: e.targetId,
    }))

    // Créer la simulation d3-force
    simulation = forceSimulation(nodes)
      .force(
        'link',
        forceLink(links)
          .id((d: any) => d.id)
          .distance(linkDistance)
      )
      .force('charge', forceManyBody().strength(chargeStrength))
      .force('center', forceCenter(400, 300))
      .force('collide', forceCollide(collisionRadius))

    // Exécuter la simulation
    for (let i = 0; i < 300; i++) {
      simulation.tick()
    }

    // Appliquer les nouvelles positions
    if (animate) {
      // Animation via événement
      const event = new CustomEvent('apply-layout', {
        detail: { nodes, duration },
      })
      window.dispatchEvent(event)

      await new Promise((resolve) => setTimeout(resolve, duration))
    }

    // Mettre à jour le store
    for (const node of nodes) {
      graphStore.updateNode(node.id, {
        geometry: {
          ...graphStore.nodes[node.id].geometry,
          x: node.x || 0,
          y: node.y || 0,
        },
      })
    }

    simulation = null
  }

  /**
   * Layout hiérarchique par niveaux.
   */
  async function applyHierarchicalLayout(options: HierarchicalLayoutOptions = {}): Promise<void> {
    const {
      direction = 'top-bottom',
      levelSpacing = 150,
      spacing = 100,
      animate = true,
      duration = 1000,
    } = options

    const nodes = Object.values(graphStore.nodes)
    const rootNodes = nodes.filter((n) => n.parentId === null)

    if (rootNodes.length === 0) return

    // Calculer les niveaux
    const levels = new Map<string, number>()
    const queue: Array<{ id: string; level: number }> = rootNodes.map((n) => ({
      id: n.id,
      level: 0,
    }))

    while (queue.length > 0) {
      const { id, level } = queue.shift()!
      levels.set(id, level)

      const children = nodes.filter((n) => n.parentId === id)
      for (const child of children) {
        queue.push({ id: child.id, level: level + 1 })
      }
    }

    // Positionner les noeuds par niveau
    const nodesByLevel = new Map<number, string[]>()
    for (const [nodeId, level] of levels) {
      if (!nodesByLevel.has(level)) {
        nodesByLevel.set(level, [])
      }
      nodesByLevel.get(level)!.push(nodeId)
    }

    const positions = new Map<string, { x: number; y: number }>()

    for (const [level, nodeIds] of nodesByLevel) {
      const y = direction === 'top-bottom' ? level * levelSpacing : 0
      const x = direction === 'left-right' ? level * levelSpacing : 0

      nodeIds.forEach((nodeId, index) => {
        const offsetX = index * spacing - (nodeIds.length * spacing) / 2
        const offsetY = index * spacing - (nodeIds.length * spacing) / 2

        positions.set(nodeId, {
          x: direction === 'top-bottom' || direction === 'bottom-top' ? offsetX : x,
          y: direction === 'top-bottom' || direction === 'bottom-top' ? y : offsetY,
        })
      })
    }

    // Appliquer les positions
    if (animate) {
      await new Promise((resolve) => setTimeout(resolve, duration))
    }

    for (const [nodeId, pos] of positions) {
      graphStore.updateNode(nodeId, {
        geometry: {
          ...graphStore.nodes[nodeId].geometry,
          x: pos.x + 400,
          y: pos.y + 300,
        },
      })
    }
  }

  /**
   * Layout circulaire.
   */
  async function applyCircularLayout(options: LayoutOptions = {}): Promise<void> {
    const { spacing = 200, animate = true, duration = 1000 } = options

    const nodes = Object.values(graphStore.nodes)
    const nodeCount = nodes.length

    if (nodeCount === 0) return

    const radius = spacing
    const angleStep = (2 * Math.PI) / nodeCount

    // Positionner en cercle
    const positions = nodes.map((node, index) => {
      const angle = index * angleStep
      return {
        id: node.id,
        x: 400 + radius * Math.cos(angle),
        y: 300 + radius * Math.sin(angle),
      }
    })

    if (animate) {
      await new Promise((resolve) => setTimeout(resolve, duration))
    }

    for (const pos of positions) {
      graphStore.updateNode(pos.id, {
        geometry: {
          ...graphStore.nodes[pos.id].geometry,
          x: pos.x,
          y: pos.y,
        },
      })
    }
  }

  /**
   * Layout en grille.
   */
  async function applyGridLayout(options: LayoutOptions = {}): Promise<void> {
    const { spacing = 150, animate = true, duration = 1000 } = options

    const nodes = Object.values(graphStore.nodes)
    const nodeCount = nodes.length

    if (nodeCount === 0) return

    const cols = Math.ceil(Math.sqrt(nodeCount))

    const positions = nodes.map((node, index) => {
      const col = index % cols
      const row = Math.floor(index / cols)

      return {
        id: node.id,
        x: col * spacing,
        y: row * spacing,
      }
    })

    if (animate) {
      await new Promise((resolve) => setTimeout(resolve, duration))
    }

    for (const pos of positions) {
      graphStore.updateNode(pos.id, {
        geometry: {
          ...graphStore.nodes[pos.id].geometry,
          x: pos.x + 100,
          y: pos.y + 100,
        },
      })
    }
  }

  /**
   * Layout en arbre avec d3-hierarchy.
   */
  async function applyTreeLayout(options: LayoutOptions = {}): Promise<void> {
    const { spacing = 100, animate = true, duration = 1000 } = options

    const nodes = Object.values(graphStore.nodes)
    const rootNodes = nodes.filter((n) => n.parentId === null)

    if (rootNodes.length === 0) return

    // Utiliser le premier root trouvé
    const rootNode = rootNodes[0]

    // Construire la hiérarchie
    const buildHierarchy = (nodeId: string): any => {
      const children = nodes.filter((n) => n.parentId === nodeId)

      return {
        id: nodeId,
        children: children.map((c) => buildHierarchy(c.id)),
      }
    }

    const root = hierarchy(buildHierarchy(rootNode.id))
    const treeLayout = tree().nodeSize([spacing, spacing])

    treeLayout(root)

    // Appliquer les positions
    if (animate) {
      await new Promise((resolve) => setTimeout(resolve, duration))
    }

    root.descendants().forEach((d: any) => {
      graphStore.updateNode(d.data.id, {
        geometry: {
          ...graphStore.nodes[d.data.id].geometry,
          x: d.x + 400,
          y: d.y + 100,
        },
      })
    })
  }

  /**
   * Applique un layout.
   */
  async function applyLayout(
    algorithm: LayoutAlgorithm,
    options: LayoutOptions = {}
  ): Promise<void> {
    isLayouting.value = true
    currentAlgorithm.value = algorithm

    try {
      switch (algorithm) {
        case 'force':
          await applyForceLayout(options as ForceLayoutOptions)
          break
        case 'hierarchical':
          await applyHierarchicalLayout(options as HierarchicalLayoutOptions)
          break
        case 'circular':
          await applyCircularLayout(options)
          break
        case 'grid':
          await applyGridLayout(options)
          break
        case 'tree':
          await applyTreeLayout(options)
          break
      }
    } finally {
      isLayouting.value = false
      currentAlgorithm.value = null
    }
  }

  /**
   * Arrête le layout en cours.
   */
  function stopLayout(): void {
    if (simulation) {
      simulation.stop()
      simulation = null
    }
    isLayouting.value = false
    currentAlgorithm.value = null
  }

  /**
   * Réinitialise les positions.
   */
  function resetLayout(): void {
    const nodes = Object.values(graphStore.nodes)

    nodes.forEach((node, index) => {
      graphStore.updateNode(node.id, {
        geometry: {
          ...node.geometry,
          x: 100 + (index % 10) * 150,
          y: 100 + Math.floor(index / 10) * 150,
        },
      })
    })
  }

  return {
    isLayouting,
    currentAlgorithm,
    applyLayout,
    stopLayout,
    resetLayout,
  }
}
