// src/composables/traits/useStyleable.ts
import { ref, computed, type Ref } from 'vue';
import { useGraphStore } from '../../stores/graph';
import type { Styling } from '../../types';

export interface StyleableOptions {
  nodeId: Ref<string>;
}

export interface StyleableState {
  isStylePanelOpen: Ref<boolean>;
  currentStyle: Ref<Styling>;
}

export interface StyleableHandlers {
  openStylePanel: () => void;
  closeStylePanel: () => void;
  toggleStylePanel: () => void;
  updateFill: (color: string) => void;
  updateStroke: (color: string) => void;
  updateStrokeWidth: (width: number) => void;
  updateOpacity: (opacity: number) => void;
  updateStyle: (updates: Partial<Styling>) => void;
}

// Couleurs prédéfinies pour le sélecteur
export const PRESET_COLORS = [
  '#ffffff', '#f3f4f6', '#e5e7eb', '#d1d5db', '#9ca3af', '#6b7280', '#4b5563', '#374151', '#1f2937', '#111827',
  '#fef2f2', '#fee2e2', '#fecaca', '#fca5a5', '#f87171', '#ef4444', '#dc2626', '#b91c1c', '#991b1b', '#7f1d1d',
  '#fff7ed', '#ffedd5', '#fed7aa', '#fdba74', '#fb923c', '#f97316', '#ea580c', '#c2410c', '#9a3412', '#7c2d12',
  '#fefce8', '#fef9c3', '#fef08a', '#fde047', '#facc15', '#eab308', '#ca8a04', '#a16207', '#854d0e', '#713f12',
  '#f0fdf4', '#dcfce7', '#bbf7d0', '#86efac', '#4ade80', '#22c55e', '#16a34a', '#15803d', '#166534', '#14532d',
  '#eff6ff', '#dbeafe', '#bfdbfe', '#93c5fd', '#60a5fa', '#3b82f6', '#2563eb', '#1d4ed8', '#1e40af', '#1e3a8a',
  '#f5f3ff', '#ede9fe', '#ddd6fe', '#c4b5fd', '#a78bfa', '#8b5cf6', '#7c3aed', '#6d28d9', '#5b21b6', '#4c1d95',
  '#fdf4ff', '#fae8ff', '#f5d0fe', '#f0abfc', '#e879f9', '#d946ef', '#c026d3', '#a21caf', '#86198f', '#701a75',
];

// Types de fond
export type FillType = 'solid' | 'transparent' | 'gradient' | 'pattern';

export const FILL_TYPES: { value: FillType; label: string }[] = [
  { value: 'solid', label: 'Solide' },
  { value: 'transparent', label: 'Transparent' },
  { value: 'gradient', label: 'Dégradé' },
  { value: 'pattern', label: 'Motif' },
];

export function useStyleable(options: StyleableOptions): StyleableState & StyleableHandlers {
  const graphStore = useGraphStore();

  const isStylePanelOpen = ref(false);

  const currentStyle = computed(() => {
    const node = graphStore.nodes[options.nodeId.value];
    return node?.styling ?? {
      fill: '#ffffff',
      stroke: '#333333',
      strokeWidth: 1,
      opacity: 1,
    };
  });

  function openStylePanel() {
    isStylePanelOpen.value = true;
  }

  function closeStylePanel() {
    isStylePanelOpen.value = false;
  }

  function toggleStylePanel() {
    isStylePanelOpen.value = !isStylePanelOpen.value;
  }

  function updateStyle(updates: Partial<Styling>) {
    const node = graphStore.nodes[options.nodeId.value];
    if (!node) return;

    graphStore.updateNode(options.nodeId.value, {
      styling: {
        ...node.styling,
        ...updates,
      },
    });
  }

  function updateFill(color: string) {
    updateStyle({ fill: color });
  }

  function updateStroke(color: string) {
    updateStyle({ stroke: color });
  }

  function updateStrokeWidth(width: number) {
    updateStyle({ strokeWidth: Math.max(0, width) });
  }

  function updateOpacity(opacity: number) {
    updateStyle({ opacity: Math.max(0, Math.min(1, opacity)) });
  }

  return {
    isStylePanelOpen,
    currentStyle,
    openStylePanel,
    closeStylePanel,
    toggleStylePanel,
    updateFill,
    updateStroke,
    updateStrokeWidth,
    updateOpacity,
    updateStyle,
  };
}
