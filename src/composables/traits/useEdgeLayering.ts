// src/composables/traits/useEdgeLayering.ts
// Gestion du z-order et de la visibilité des connecteurs (edges)
import { ref, computed, type Ref, type ComputedRef } from 'vue';
import { useGraphStore } from '../../stores/graph';

// === MODES DE VISIBILITÉ ===

export enum EdgeVisibilityMode {
  All = 'all',                    // Tous les connecteurs visibles
  Selected = 'selected',          // Seulement les connecteurs des noeuds sélectionnés
  Hovered = 'hovered',            // Connecteurs visibles au survol des noeuds
  Connected = 'connected',        // Connecteurs du noeud actif + ses voisins
  None = 'none',                  // Aucun connecteur visible (mode clean)
}

export const VISIBILITY_MODE_LABELS: Record<EdgeVisibilityMode, string> = {
  [EdgeVisibilityMode.All]: 'Tous visibles',
  [EdgeVisibilityMode.Selected]: 'Sélection uniquement',
  [EdgeVisibilityMode.Hovered]: 'Au survol',
  [EdgeVisibilityMode.Connected]: 'Connexions actives',
  [EdgeVisibilityMode.None]: 'Masqués',
};

// === CONFIGURATION ===

export interface EdgeLayeringConfig {
  // Z-order
  edgeLayerOffset: number;        // Offset de base pour les edges (au-dessus des noeuds)
  selectedEdgeBoost: number;      // Boost z-index pour edge sélectionné
  connectedNodeBoost: number;     // Boost z-index pour noeuds connectés à un edge sélectionné

  // Visibilité
  visibilityMode: EdgeVisibilityMode;
  fadeInactiveEdges: boolean;     // Atténuer les edges non-pertinents
  inactiveOpacity: number;        // Opacité des edges inactifs (0-1)

  // Animation
  transitionDuration: number;     // Durée des transitions CSS (ms)
}

export const DEFAULT_EDGE_LAYERING_CONFIG: EdgeLayeringConfig = {
  edgeLayerOffset: 10000,         // Les edges sont dans un "layer" au-dessus des noeuds
  selectedEdgeBoost: 100,         // Edge sélectionné encore plus haut
  connectedNodeBoost: 50,         // Noeuds connectés boostés
  visibilityMode: EdgeVisibilityMode.All,
  fadeInactiveEdges: true,
  inactiveOpacity: 0.3,
  transitionDuration: 150,
};

// === ÉTAT GLOBAL ===

// Edges sélectionnés
const selectedEdgeIds = ref<Set<string>>(new Set());
const focusedEdgeId = ref<string | null>(null);
const hoveredNodeId = ref<string | null>(null);

// Configuration globale
const globalConfig = ref<EdgeLayeringConfig>({ ...DEFAULT_EDGE_LAYERING_CONFIG });

// === INTERFACES ===

export interface EdgeLayeringOptions {
  edgeId: Ref<string>;
  // Références aux noeuds sélectionnés (depuis useSelectable)
  selectedNodeIds?: Ref<Set<string>>;
}

export interface EdgeLayeringState {
  isSelected: ComputedRef<boolean>;
  isFocused: ComputedRef<boolean>;
  isVisible: ComputedRef<boolean>;
  opacity: ComputedRef<number>;
  zIndex: ComputedRef<number>;
  connectedNodeIds: ComputedRef<string[]>;
  // Style calculé pour le SVG
  computedStyle: ComputedRef<EdgeComputedStyle>;
}

export interface EdgeComputedStyle {
  opacity: number;
  visibility: 'visible' | 'hidden';
  zIndex: number;
  transition: string;
  // Pour les noeuds connectés
  sourceNodeBoost: number;
  targetNodeBoost: number;
}

export interface EdgeLayeringHandlers {
  select: (addToSelection?: boolean) => void;
  deselect: () => void;
  focus: () => void;
  blur: () => void;
}

// === COMPOSABLE POUR UN EDGE ===

export function useEdgeLayering(options: EdgeLayeringOptions): EdgeLayeringState & EdgeLayeringHandlers {
  const graphStore = useGraphStore();

  // Edge actuel
  const edge = computed(() => graphStore.edges[options.edgeId.value]);

  // État de sélection
  const isSelected = computed(() => selectedEdgeIds.value.has(options.edgeId.value));
  const isFocused = computed(() => focusedEdgeId.value === options.edgeId.value);

  // Noeuds connectés
  const connectedNodeIds = computed(() => {
    const e = edge.value;
    if (!e) return [];
    return [e.sourceId, e.targetId].filter(Boolean);
  });

  // Visibilité selon le mode
  const isVisible = computed(() => {
    const config = globalConfig.value;
    const e = edge.value;
    if (!e) return false;

    switch (config.visibilityMode) {
      case EdgeVisibilityMode.All:
        return true;

      case EdgeVisibilityMode.None:
        return false;

      case EdgeVisibilityMode.Selected: {
        // Visible si l'edge est sélectionné OU si un de ses noeuds est sélectionné
        if (isSelected.value) return true;
        const selectedNodes = options.selectedNodeIds?.value ?? new Set();
        return selectedNodes.has(e.sourceId) || selectedNodes.has(e.targetId);
      }

      case EdgeVisibilityMode.Hovered: {
        // Visible si survolé ou si un noeud connecté est survolé
        if (isSelected.value) return true;
        const hovered = hoveredNodeId.value;
        return hovered !== null && (e.sourceId === hovered || e.targetId === hovered);
      }

      case EdgeVisibilityMode.Connected: {
        // Visible si l'edge ou un de ses noeuds est actif
        if (isSelected.value) return true;
        const selectedNodes = options.selectedNodeIds?.value ?? new Set();
        const hovered = hoveredNodeId.value;
        return (
          selectedNodes.has(e.sourceId) ||
          selectedNodes.has(e.targetId) ||
          e.sourceId === hovered ||
          e.targetId === hovered
        );
      }

      default:
        return true;
    }
  });

  // Opacité calculée
  const opacity = computed(() => {
    const config = globalConfig.value;

    if (!isVisible.value) return 0;

    // Edge sélectionné ou focusé : pleine opacité
    if (isSelected.value || isFocused.value) return 1;

    // Si fadeInactiveEdges est activé et qu'il y a une sélection
    if (config.fadeInactiveEdges) {
      const hasSelection = selectedEdgeIds.value.size > 0 ||
                          (options.selectedNodeIds?.value?.size ?? 0) > 0;

      if (hasSelection && config.visibilityMode !== EdgeVisibilityMode.All) {
        // Vérifier si cet edge est "pertinent"
        const e = edge.value;
        if (e) {
          const selectedNodes = options.selectedNodeIds?.value ?? new Set();
          const isRelevant = selectedNodes.has(e.sourceId) || selectedNodes.has(e.targetId);
          if (!isRelevant) {
            return config.inactiveOpacity;
          }
        }
      }
    }

    return 1;
  });

  // Z-index calculé
  const zIndex = computed(() => {
    const config = globalConfig.value;
    let z = config.edgeLayerOffset;

    // Boost si sélectionné
    if (isSelected.value) {
      z += config.selectedEdgeBoost;
    }

    // Z-index personnalisé de l'edge (si défini)
    const e = edge.value;
    if (e?.data?.zIndex !== undefined) {
      z += e.data.zIndex;
    }

    return z;
  });

  // Style calculé complet
  const computedStyle = computed<EdgeComputedStyle>(() => {
    const config = globalConfig.value;
    const boost = isSelected.value ? config.connectedNodeBoost : 0;

    return {
      opacity: opacity.value,
      visibility: isVisible.value ? 'visible' : 'hidden',
      zIndex: zIndex.value,
      transition: `opacity ${config.transitionDuration}ms ease, visibility ${config.transitionDuration}ms ease`,
      sourceNodeBoost: boost,
      targetNodeBoost: boost,
    };
  });

  // === HANDLERS ===

  function select(addToSelection = false) {
    if (!addToSelection) {
      selectedEdgeIds.value.clear();
    }
    selectedEdgeIds.value.add(options.edgeId.value);
    focusedEdgeId.value = options.edgeId.value;
  }

  function deselect() {
    selectedEdgeIds.value.delete(options.edgeId.value);
    if (focusedEdgeId.value === options.edgeId.value) {
      focusedEdgeId.value = null;
    }
  }

  function focus() {
    focusedEdgeId.value = options.edgeId.value;
  }

  function blur() {
    if (focusedEdgeId.value === options.edgeId.value) {
      focusedEdgeId.value = null;
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
  };
}

// === ÉTAT GLOBAL (CANVAS) ===

export interface EdgeLayeringGlobalState {
  selectedEdgeIds: Ref<Set<string>>;
  focusedEdgeId: Ref<string | null>;
  hoveredNodeId: Ref<string | null>;
  config: Ref<EdgeLayeringConfig>;
}

export interface EdgeLayeringGlobalHandlers {
  // Sélection
  clearEdgeSelection: () => void;
  selectEdge: (edgeId: string, addToSelection?: boolean) => void;
  deselectEdge: (edgeId: string) => void;
  selectAllEdges: () => void;
  selectEdgesOfNodes: (nodeIds: string[]) => void;

  // Hover
  setHoveredNode: (nodeId: string | null) => void;

  // Configuration
  setVisibilityMode: (mode: EdgeVisibilityMode) => void;
  setConfig: (config: Partial<EdgeLayeringConfig>) => void;

  // Utilitaires
  getEdgesOfNode: (nodeId: string) => string[];
  getConnectedNodes: (edgeId: string) => string[];
  getNodeZIndexBoost: (nodeId: string) => number;

  // Tri des edges par z-index
  sortEdgesByZIndex: <T extends { id: string; data?: { zIndex?: number } }>(edges: T[]) => T[];
}

export function useEdgeLayeringState(): EdgeLayeringGlobalState & EdgeLayeringGlobalHandlers {
  const graphStore = useGraphStore();

  // === SÉLECTION ===

  function clearEdgeSelection() {
    selectedEdgeIds.value.clear();
    focusedEdgeId.value = null;
  }

  function selectEdge(edgeId: string, addToSelection = false) {
    if (!addToSelection) {
      selectedEdgeIds.value.clear();
    }
    selectedEdgeIds.value.add(edgeId);
    focusedEdgeId.value = edgeId;
  }

  function deselectEdge(edgeId: string) {
    selectedEdgeIds.value.delete(edgeId);
    if (focusedEdgeId.value === edgeId) {
      focusedEdgeId.value = null;
    }
  }

  function selectAllEdges() {
    selectedEdgeIds.value = new Set(Object.keys(graphStore.edges));
    focusedEdgeId.value = null;
  }

  function selectEdgesOfNodes(nodeIds: string[]) {
    const nodeSet = new Set(nodeIds);
    const edgeIds = Object.values(graphStore.edges)
      .filter(e => nodeSet.has(e.sourceId) || nodeSet.has(e.targetId))
      .map(e => e.id);

    selectedEdgeIds.value = new Set(edgeIds);
  }

  // === HOVER ===

  function setHoveredNode(nodeId: string | null) {
    hoveredNodeId.value = nodeId;
  }

  // === CONFIGURATION ===

  function setVisibilityMode(mode: EdgeVisibilityMode) {
    globalConfig.value = {
      ...globalConfig.value,
      visibilityMode: mode,
    };
  }

  function setConfig(config: Partial<EdgeLayeringConfig>) {
    globalConfig.value = {
      ...globalConfig.value,
      ...config,
    };
  }

  // === UTILITAIRES ===

  function getEdgesOfNode(nodeId: string): string[] {
    return Object.values(graphStore.edges)
      .filter(e => e.sourceId === nodeId || e.targetId === nodeId)
      .map(e => e.id);
  }

  function getConnectedNodes(edgeId: string): string[] {
    const edge = graphStore.edges[edgeId];
    if (!edge) return [];
    return [edge.sourceId, edge.targetId];
  }

  function getNodeZIndexBoost(nodeId: string): number {
    const config = globalConfig.value;

    // Vérifier si un edge sélectionné est connecté à ce noeud
    for (const edgeId of selectedEdgeIds.value) {
      const edge = graphStore.edges[edgeId];
      if (edge && (edge.sourceId === nodeId || edge.targetId === nodeId)) {
        return config.connectedNodeBoost;
      }
    }

    return 0;
  }

  function sortEdgesByZIndex<T extends { id: string; data?: { zIndex?: number } }>(edges: T[]): T[] {
    const config = globalConfig.value;

    return [...edges].sort((a, b) => {
      let zA = config.edgeLayerOffset + (a.data?.zIndex ?? 0);
      let zB = config.edgeLayerOffset + (b.data?.zIndex ?? 0);

      // Boost pour les sélectionnés
      if (selectedEdgeIds.value.has(a.id)) zA += config.selectedEdgeBoost;
      if (selectedEdgeIds.value.has(b.id)) zB += config.selectedEdgeBoost;

      return zA - zB;
    });
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
  };
}

// === HELPER: Calcul du z-index effectif d'un noeud ===

export function useNodeZIndexWithEdgeBoost(
  nodeId: Ref<string>,
  baseZIndex: Ref<number>
): ComputedRef<number> {
  const graphStore = useGraphStore();

  return computed(() => {
    const config = globalConfig.value;
    let z = baseZIndex.value;

    // Vérifier si un edge sélectionné est connecté à ce noeud
    for (const edgeId of selectedEdgeIds.value) {
      const edge = graphStore.edges[edgeId];
      if (edge && (edge.sourceId === nodeId.value || edge.targetId === nodeId.value)) {
        z += config.connectedNodeBoost;
        break;
      }
    }

    return z;
  });
}
