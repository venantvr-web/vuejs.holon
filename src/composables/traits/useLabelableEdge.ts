// src/composables/traits/useLabelableEdge.ts
import { computed, type Ref } from 'vue';
import { useGraphStore } from '../../stores/graph';

/**
 * Label d'une arête avec position et offset.
 */
export interface EdgeLabel {
  /**
   * Texte du label.
   */
  text: string;
  /**
   * Position sur l'arête (0 = source, 1 = target).
   * @default 0.5
   */
  position: number;
  /**
   * Offset par rapport à la ligne de l'arête.
   */
  offset: {
    x: number;
    y: number;
  };
  /**
   * Style de texte.
   */
  style?: {
    fontSize?: number;
    fontFamily?: string;
    fill?: string;
    fontWeight?: string;
  };
  /**
   * Arrière-plan du label.
   */
  background?: {
    fill?: string;
    padding?: number;
    borderRadius?: number;
  };
}

/**
 * Options de configuration pour le trait LabelableEdge.
 */
export interface LabelableEdgeOptions {
  /**
   * Référence réactive vers l'ID de l'arête concernée.
   */
  edgeId: Ref<string>;
}

/**
 * État réactif exposé par le trait LabelableEdge.
 */
export interface LabelableEdgeState {
  /**
   * Labels de l'arête.
   */
  labels: Ref<EdgeLabel[]>;
  /**
   * Indique si l'arête a des labels.
   */
  hasLabels: Ref<boolean>;
}

/**
 * Handlers (actions) exposés par le trait LabelableEdge.
 */
export interface LabelableEdgeHandlers {
  /**
   * Ajoute un label à l'arête.
   * @param label - Label à ajouter
   */
  addLabel: (label: Partial<EdgeLabel> & { text: string }) => void;
  /**
   * Met à jour un label existant.
   * @param index - Index du label
   * @param updates - Propriétés à mettre à jour
   */
  updateLabel: (index: number, updates: Partial<EdgeLabel>) => void;
  /**
   * Supprime un label.
   * @param index - Index du label à supprimer
   */
  removeLabel: (index: number) => void;
  /**
   * Supprime tous les labels.
   */
  clearLabels: () => void;
  /**
   * Déplace un label le long de l'arête.
   * @param index - Index du label
   * @param position - Nouvelle position (0-1)
   */
  setLabelPosition: (index: number, position: number) => void;
  /**
   * Ajuste l'offset d'un label.
   * @param index - Index du label
   * @param offset - Nouvel offset
   */
  setLabelOffset: (index: number, offset: { x: number; y: number }) => void;
}

/**
 * Trait permettant de gérer des labels sur les arêtes.
 *
 * Les labels peuvent être positionnés le long de l'arête avec des offsets personnalisés
 * et des styles de texte configurables.
 *
 * @param options - Options de configuration
 * @returns État réactif et handlers pour les labels d'arête
 *
 * @example
 * ```typescript
 * const { labels, addLabel, updateLabel } = useLabelableEdge({
 *   edgeId: ref('edge-123')
 * });
 *
 * // Ajouter un label au milieu
 * addLabel({
 *   text: 'implements',
 *   position: 0.5,
 *   offset: { x: 0, y: -10 }
 * });
 *
 * // Déplacer le label
 * setLabelPosition(0, 0.3); // 30% depuis la source
 * ```
 */
export function useLabelableEdge(options: LabelableEdgeOptions): LabelableEdgeState & LabelableEdgeHandlers {
  const graphStore = useGraphStore();

  const labels = computed((): EdgeLabel[] => {
    const edge = graphStore.edges[options.edgeId.value];
    if (!edge) return [];

    return (edge.data?.labels as EdgeLabel[]) || [];
  });

  const hasLabels = computed(() => labels.value.length > 0);

  /**
   * Ajoute un label.
   */
  function addLabel(label: Partial<EdgeLabel> & { text: string }): void {
    const edge = graphStore.edges[options.edgeId.value];
    if (!edge) return;

    const newLabel: EdgeLabel = {
      text: label.text,
      position: label.position ?? 0.5,
      offset: label.offset ?? { x: 0, y: -10 },
      style: label.style ?? {
        fontSize: 12,
        fontFamily: 'Arial, sans-serif',
        fill: '#000000',
        fontWeight: 'normal',
      },
      background: label.background ?? {
        fill: '#ffffff',
        padding: 4,
        borderRadius: 2,
      },
    };

    const currentLabels = labels.value;
    const updatedLabels = [...currentLabels, newLabel];

    graphStore.updateEdge(options.edgeId.value, {
      data: {
        ...edge.data,
        labels: updatedLabels,
      },
    });
  }

  /**
   * Met à jour un label.
   */
  function updateLabel(index: number, updates: Partial<EdgeLabel>): void {
    const edge = graphStore.edges[options.edgeId.value];
    if (!edge) return;

    const currentLabels = labels.value;
    if (index < 0 || index >= currentLabels.length) return;

    const updatedLabels = [...currentLabels];
    updatedLabels[index] = { ...updatedLabels[index], ...updates };

    graphStore.updateEdge(options.edgeId.value, {
      data: {
        ...edge.data,
        labels: updatedLabels,
      },
    });
  }

  /**
   * Supprime un label.
   */
  function removeLabel(index: number): void {
    const edge = graphStore.edges[options.edgeId.value];
    if (!edge) return;

    const currentLabels = labels.value;
    if (index < 0 || index >= currentLabels.length) return;

    const updatedLabels = currentLabels.filter((_, i) => i !== index);

    graphStore.updateEdge(options.edgeId.value, {
      data: {
        ...edge.data,
        labels: updatedLabels,
      },
    });
  }

  /**
   * Efface tous les labels.
   */
  function clearLabels(): void {
    const edge = graphStore.edges[options.edgeId.value];
    if (!edge) return;

    graphStore.updateEdge(options.edgeId.value, {
      data: {
        ...edge.data,
        labels: [],
      },
    });
  }

  /**
   * Définit la position d'un label.
   */
  function setLabelPosition(index: number, position: number): void {
    updateLabel(index, { position: Math.max(0, Math.min(1, position)) });
  }

  /**
   * Définit l'offset d'un label.
   */
  function setLabelOffset(index: number, offset: { x: number; y: number }): void {
    updateLabel(index, { offset });
  }

  return {
    labels,
    hasLabels,
    addLabel,
    updateLabel,
    removeLabel,
    clearLabels,
    setLabelPosition,
    setLabelOffset,
  };
}
