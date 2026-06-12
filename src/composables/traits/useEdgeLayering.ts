// src/composables/traits/useEdgeLayering.ts
// Gestion du z-order et de la visibilité des connecteurs (edges)
import { ref, computed, type Ref, type ComputedRef } from 'vue'
import { useGraphStore } from '../../stores/graph'

/**
 * Modes de visibilité disponibles pour les edges.
 */
export enum EdgeVisibilityMode {
  /**
   * Tous les connecteurs visibles.
   */
  All = 'all',
  /**
   * Seulement les connecteurs des noeuds sélectionnés.
   */
  Selected = 'selected',
  /**
   * Connecteurs visibles au survol des noeuds.
   */
  Hovered = 'hovered',
  /**
   * Connecteurs du noeud actif et ses voisins.
   */
  Connected = 'connected',
  /**
   * Aucun connecteur visible (mode clean).
   */
  None = 'none',
}

/**
 * Labels affichables pour les modes de visibilité.
 */
export const VISIBILITY_MODE_LABELS: Record<EdgeVisibilityMode, string> = {
  [EdgeVisibilityMode.All]: 'Tous visibles',
  [EdgeVisibilityMode.Selected]: 'Sélection uniquement',
  [EdgeVisibilityMode.Hovered]: 'Au survol',
  [EdgeVisibilityMode.Connected]: 'Connexions actives',
  [EdgeVisibilityMode.None]: 'Masqués',
}

/**
 * Configuration globale du layering et de la visibilité des edges.
 */
export interface EdgeLayeringConfig {
  /**
   * Offset de base pour les edges (au-dessus des noeuds).
   */
  edgeLayerOffset: number
  /**
   * Boost z-index pour edge sélectionné.
   */
  selectedEdgeBoost: number
  /**
   * Boost z-index pour noeuds connectés à un edge sélectionné.
   */
  connectedNodeBoost: number
  /**
   * Mode de visibilité des edges.
   */
  visibilityMode: EdgeVisibilityMode
  /**
   * Atténuer les edges non-pertinents.
   */
  fadeInactiveEdges: boolean
  /**
   * Opacité des edges inactifs (0-1).
   */
  inactiveOpacity: number
  /**
   * Durée des transitions CSS (ms).
   */
  transitionDuration: number
}

export const DEFAULT_EDGE_LAYERING_CONFIG: EdgeLayeringConfig = {
  edgeLayerOffset: 10000, // Les edges sont dans un "layer" au-dessus des noeuds
  selectedEdgeBoost: 100, // Edge sélectionné encore plus haut
  connectedNodeBoost: 50, // Noeuds connectés boostés
  visibilityMode: EdgeVisibilityMode.All,
  fadeInactiveEdges: true,
  inactiveOpacity: 0.3,
  transitionDuration: 150,
}

// === ÉTAT GLOBAL ===

// Edges sélectionnés
const selectedEdgeIds = ref<Set<string>>(new Set())
const focusedEdgeId = ref<string | null>(null)
const hoveredNodeId = ref<string | null>(null)

// Configuration globale
const globalConfig = ref<EdgeLayeringConfig>({ ...DEFAULT_EDGE_LAYERING_CONFIG })

/**
 * Options de configuration pour le trait EdgeLayering.
 */
export interface EdgeLayeringOptions {
  /**
   * Référence réactive vers l'ID de l'edge concerné.
   */
  edgeId: Ref<string>
  /**
   * Références aux noeuds sélectionnés (depuis useSelectable).
   */
  selectedNodeIds?: Ref<Set<string>>
}

/**
 * État réactif exposé par le trait EdgeLayering.
 */
export interface EdgeLayeringState {
  /**
   * Indique si l'edge est sélectionné.
   */
  isSelected: ComputedRef<boolean>
  /**
   * Indique si l'edge a le focus.
   */
  isFocused: ComputedRef<boolean>
  /**
   * Indique si l'edge est visible selon le mode de visibilité.
   */
  isVisible: ComputedRef<boolean>
  /**
   * Opacité calculée de l'edge.
   */
  opacity: ComputedRef<number>
  /**
   * Z-index calculé de l'edge.
   */
  zIndex: ComputedRef<number>
  /**
   * IDs des noeuds connectés par cet edge.
   */
  connectedNodeIds: ComputedRef<string[]>
  /**
   * Style calculé complet pour le rendu SVG.
   */
  computedStyle: ComputedRef<EdgeComputedStyle>
}

/**
 * Style calculé pour un edge incluant visibilité et layering.
 */
export interface EdgeComputedStyle {
  /**
   * Opacité finale de l'edge.
   */
  opacity: number
  /**
   * Visibilité CSS de l'edge.
   */
  visibility: 'visible' | 'hidden'
  /**
   * Z-index final de l'edge.
   */
  zIndex: number
  /**
   * Transitions CSS appliquées.
   */
  transition: string
  /**
   * Boost z-index pour le noeud source.
   */
  sourceNodeBoost: number
  /**
   * Boost z-index pour le noeud cible.
   */
  targetNodeBoost: number
}

/**
 * Handlers (actions) exposés par le trait EdgeLayering.
 */
export interface EdgeLayeringHandlers {
  /**
   * Sélectionne l'edge.
   * @param addToSelection - Si true, ajoute à la sélection actuelle
   */
  select: (addToSelection?: boolean) => void
  /**
   * Désélectionne l'edge.
   */
  deselect: () => void
  /**
   * Donne le focus à l'edge.
   */
  focus: () => void
  /**
   * Retire le focus de l'edge.
   */
  blur: () => void
}

/**
 * Trait permettant de gérer le z-order et la visibilité d'un edge individuel.
 *
 * Calcule automatiquement la visibilité, l'opacité et le z-index selon le mode
 * de visibilité global et l'état de sélection.
 *
 * @param options - Configuration du trait
 * @returns État réactif et handlers pour le layering de l'edge
 *
 * @example
 * ```typescript
 * const { isVisible, computedStyle, select } = useEdgeLayering({
 *   edgeId: ref('edge-123'),
 *   selectedNodeIds: ref(new Set(['node-1']))
 * });
 * ```
 */
export function useEdgeLayering(
  options: EdgeLayeringOptions
): EdgeLayeringState & EdgeLayeringHandlers {
  const graphStore = useGraphStore()

  // Edge actuel
  const edge = computed(() => graphStore.edges[options.edgeId.value])

  // État de sélection
  const isSelected = computed(() => selectedEdgeIds.value.has(options.edgeId.value))
  const isFocused = computed(() => focusedEdgeId.value === options.edgeId.value)

  // Noeuds connectés
  const connectedNodeIds = computed(() => {
    const e = edge.value
    if (!e) return []
    return [e.sourceId, e.targetId].filter(Boolean)
  })

  // Visibilité selon le mode
  const isVisible = computed(() => {
    const config = globalConfig.value
    const e = edge.value
    if (!e) return false

    switch (config.visibilityMode) {
      case EdgeVisibilityMode.All:
        return true

      case EdgeVisibilityMode.None:
        return false

      case EdgeVisibilityMode.Selected: {
        // Visible si l'edge est sélectionné OU si un de ses noeuds est sélectionné
        if (isSelected.value) return true
        const selectedNodes = options.selectedNodeIds?.value ?? new Set()
        return selectedNodes.has(e.sourceId) || selectedNodes.has(e.targetId)
      }

      case EdgeVisibilityMode.Hovered: {
        // Visible si survolé ou si un noeud connecté est survolé
        if (isSelected.value) return true
        const hovered = hoveredNodeId.value
        return hovered !== null && (e.sourceId === hovered || e.targetId === hovered)
      }

      case EdgeVisibilityMode.Connected: {
        // Visible si l'edge ou un de ses noeuds est actif
        if (isSelected.value) return true
        const selectedNodes = options.selectedNodeIds?.value ?? new Set()
        const hovered = hoveredNodeId.value
        return (
          selectedNodes.has(e.sourceId) ||
          selectedNodes.has(e.targetId) ||
          e.sourceId === hovered ||
          e.targetId === hovered
        )
      }

      default:
        return true
    }
  })

  // Opacité calculée
  const opacity = computed(() => {
    const config = globalConfig.value

    if (!isVisible.value) return 0

    // Edge sélectionné ou focusé : pleine opacité
    if (isSelected.value || isFocused.value) return 1

    // Si fadeInactiveEdges est activé et qu'il y a une sélection
    if (config.fadeInactiveEdges) {
      const hasSelection =
        selectedEdgeIds.value.size > 0 || (options.selectedNodeIds?.value?.size ?? 0) > 0

      if (hasSelection && config.visibilityMode !== EdgeVisibilityMode.All) {
        // Vérifier si cet edge est "pertinent"
        const e = edge.value
        if (e) {
          const selectedNodes = options.selectedNodeIds?.value ?? new Set()
          const isRelevant = selectedNodes.has(e.sourceId) || selectedNodes.has(e.targetId)
          if (!isRelevant) {
            return config.inactiveOpacity
          }
        }
      }
    }

    return 1
  })

  // Z-index calculé
  const zIndex = computed(() => {
    const config = globalConfig.value
    let z = config.edgeLayerOffset

    // Boost si sélectionné
    if (isSelected.value) {
      z += config.selectedEdgeBoost
    }

    // Z-index personnalisé de l'edge (si défini)
    const e = edge.value
    if (e?.data?.zIndex !== undefined) {
      z += e.data.zIndex
    }

    return z
  })

  // Style calculé complet
  const computedStyle = computed<EdgeComputedStyle>(() => {
    const config = globalConfig.value
    const boost = isSelected.value ? config.connectedNodeBoost : 0

    return {
      opacity: opacity.value,
      visibility: isVisible.value ? 'visible' : 'hidden',
      zIndex: zIndex.value,
      transition: `opacity ${config.transitionDuration}ms ease, visibility ${config.transitionDuration}ms ease`,
      sourceNodeBoost: boost,
      targetNodeBoost: boost,
    }
  })

  // === HANDLERS ===

  function select(addToSelection = false) {
    if (!addToSelection) {
      selectedEdgeIds.value.clear()
    }
    selectedEdgeIds.value.add(options.edgeId.value)
    focusedEdgeId.value = options.edgeId.value
  }

  function deselect() {
    selectedEdgeIds.value.delete(options.edgeId.value)
    if (focusedEdgeId.value === options.edgeId.value) {
      focusedEdgeId.value = null
    }
  }

  function focus() {
    focusedEdgeId.value = options.edgeId.value
  }

  function blur() {
    if (focusedEdgeId.value === options.edgeId.value) {
      focusedEdgeId.value = null
    }
  }

  return {
    // State
    isSelected,
    isFocused,
    isVisible,
    opacity,
    zIndex,
    connectedNodeIds,
    computedStyle,
    // Handlers
    select,
    deselect,
    focus,
    blur,
  }
}

/**
 * État global partagé pour le layering des edges au niveau canvas.
 */
export interface EdgeLayeringGlobalState {
  /**
   * Set des IDs des edges sélectionnés.
   */
  selectedEdgeIds: Ref<Set<string>>
  /**
   * ID de l'edge ayant le focus (peut être null).
   */
  focusedEdgeId: Ref<string | null>
  /**
   * ID du noeud actuellement survolé (peut être null).
   */
  hoveredNodeId: Ref<string | null>
  /**
   * Configuration globale du layering.
   */
  config: Ref<EdgeLayeringConfig>
}

/**
 * Handlers globaux pour la gestion du layering des edges.
 */
export interface EdgeLayeringGlobalHandlers {
  /**
   * Vide la sélection d'edges.
   */
  clearEdgeSelection: () => void
  /**
   * Sélectionne un edge.
   * @param edgeId - ID de l'edge à sélectionner
   * @param addToSelection - Si true, ajoute à la sélection actuelle
   */
  selectEdge: (edgeId: string, addToSelection?: boolean) => void
  /**
   * Désélectionne un edge.
   * @param edgeId - ID de l'edge à désélectionner
   */
  deselectEdge: (edgeId: string) => void
  /**
   * Sélectionne tous les edges du graphe.
   */
  selectAllEdges: () => void
  /**
   * Sélectionne tous les edges connectés aux noeuds spécifiés.
   * @param nodeIds - IDs des noeuds
   */
  selectEdgesOfNodes: (nodeIds: string[]) => void
  /**
   * Définit le noeud actuellement survolé.
   * @param nodeId - ID du noeud survolé (null si aucun)
   */
  setHoveredNode: (nodeId: string | null) => void
  /**
   * Change le mode de visibilité global des edges.
   * @param mode - Nouveau mode de visibilité
   */
  setVisibilityMode: (mode: EdgeVisibilityMode) => void
  /**
   * Met à jour la configuration globale.
   * @param config - Configuration partielle à appliquer
   */
  setConfig: (config: Partial<EdgeLayeringConfig>) => void
  /**
   * Récupère tous les edges connectés à un noeud.
   * @param nodeId - ID du noeud
   * @returns IDs des edges connectés
   */
  getEdgesOfNode: (nodeId: string) => string[]
  /**
   * Récupère les noeuds connectés par un edge.
   * @param edgeId - ID de l'edge
   * @returns IDs des noeuds source et cible
   */
  getConnectedNodes: (edgeId: string) => string[]
  /**
   * Calcule le boost de z-index d'un noeud si connecté à un edge sélectionné.
   * @param nodeId - ID du noeud
   * @returns Valeur du boost
   */
  getNodeZIndexBoost: (nodeId: string) => number
  /**
   * Trie les edges par z-index effectif.
   * @param edges - Liste d'edges à trier
   * @returns Liste triée
   */
  sortEdgesByZIndex: <T extends { id: string; data?: { zIndex?: number } }>(edges: T[]) => T[]
}

/**
 * Composable fournissant l'état global et les handlers pour la gestion du layering des edges.
 *
 * Gère la sélection globale, le mode de visibilité et le calcul des z-index.
 *
 * @returns État global et handlers pour le layering des edges
 */
export function useEdgeLayeringState(): EdgeLayeringGlobalState & EdgeLayeringGlobalHandlers {
  const graphStore = useGraphStore()

  // === SÉLECTION ===

  function clearEdgeSelection() {
    selectedEdgeIds.value.clear()
    focusedEdgeId.value = null
  }

  function selectEdge(edgeId: string, addToSelection = false) {
    if (!addToSelection) {
      selectedEdgeIds.value.clear()
    }
    selectedEdgeIds.value.add(edgeId)
    focusedEdgeId.value = edgeId
  }

  function deselectEdge(edgeId: string) {
    selectedEdgeIds.value.delete(edgeId)
    if (focusedEdgeId.value === edgeId) {
      focusedEdgeId.value = null
    }
  }

  function selectAllEdges() {
    selectedEdgeIds.value = new Set(Object.keys(graphStore.edges))
    focusedEdgeId.value = null
  }

  function selectEdgesOfNodes(nodeIds: string[]) {
    const nodeSet = new Set(nodeIds)
    const edgeIds = Object.values(graphStore.edges)
      .filter((e) => nodeSet.has(e.sourceId) || nodeSet.has(e.targetId))
      .map((e) => e.id)

    selectedEdgeIds.value = new Set(edgeIds)
  }

  // === HOVER ===

  function setHoveredNode(nodeId: string | null) {
    hoveredNodeId.value = nodeId
  }

  // === CONFIGURATION ===

  function setVisibilityMode(mode: EdgeVisibilityMode) {
    globalConfig.value = {
      ...globalConfig.value,
      visibilityMode: mode,
    }
  }

  function setConfig(config: Partial<EdgeLayeringConfig>) {
    globalConfig.value = {
      ...globalConfig.value,
      ...config,
    }
  }

  // === UTILITAIRES ===

  function getEdgesOfNode(nodeId: string): string[] {
    return Object.values(graphStore.edges)
      .filter((e) => e.sourceId === nodeId || e.targetId === nodeId)
      .map((e) => e.id)
  }

  function getConnectedNodes(edgeId: string): string[] {
    const edge = graphStore.edges[edgeId]
    if (!edge) return []
    return [edge.sourceId, edge.targetId]
  }

  function getNodeZIndexBoost(nodeId: string): number {
    const config = globalConfig.value

    // Vérifier si un edge sélectionné est connecté à ce noeud
    for (const edgeId of selectedEdgeIds.value) {
      const edge = graphStore.edges[edgeId]
      if (edge && (edge.sourceId === nodeId || edge.targetId === nodeId)) {
        return config.connectedNodeBoost
      }
    }

    return 0
  }

  function sortEdgesByZIndex<T extends { id: string; data?: { zIndex?: number } }>(
    edges: T[]
  ): T[] {
    const config = globalConfig.value

    return [...edges].sort((a, b) => {
      let zA = config.edgeLayerOffset + (a.data?.zIndex ?? 0)
      let zB = config.edgeLayerOffset + (b.data?.zIndex ?? 0)

      // Boost pour les sélectionnés
      if (selectedEdgeIds.value.has(a.id)) zA += config.selectedEdgeBoost
      if (selectedEdgeIds.value.has(b.id)) zB += config.selectedEdgeBoost

      return zA - zB
    })
  }

  return {
    // State
    selectedEdgeIds,
    focusedEdgeId,
    hoveredNodeId,
    config: globalConfig,
    // Handlers
    clearEdgeSelection,
    selectEdge,
    deselectEdge,
    selectAllEdges,
    selectEdgesOfNodes,
    setHoveredNode,
    setVisibilityMode,
    setConfig,
    getEdgesOfNode,
    getConnectedNodes,
    getNodeZIndexBoost,
    sortEdgesByZIndex,
  }
}

// === HELPER: Calcul du z-index effectif d'un noeud ===

export function useNodeZIndexWithEdgeBoost(
  nodeId: Ref<string>,
  baseZIndex: Ref<number>
): ComputedRef<number> {
  const graphStore = useGraphStore()

  return computed(() => {
    const config = globalConfig.value
    let z = baseZIndex.value

    // Vérifier si un edge sélectionné est connecté à ce noeud
    for (const edgeId of selectedEdgeIds.value) {
      const edge = graphStore.edges[edgeId]
      if (edge && (edge.sourceId === nodeId.value || edge.targetId === nodeId.value)) {
        z += config.connectedNodeBoost
        break
      }
    }

    return z
  })
}
