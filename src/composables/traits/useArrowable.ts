// src/composables/traits/useArrowable.ts
import { computed, type Ref } from 'vue';
import { useGraphStore } from '../../stores/graph';

// Types de flèches
export enum ArrowType {
  None = 'none',
  Arrow = 'arrow', // Flèche simple
  FilledArrow = 'filled-arrow', // Flèche pleine
  Diamond = 'diamond', // Losange (composition)
  FilledDiamond = 'filled-diamond', // Losange plein (composition forte)
  Circle = 'circle', // Cercle
  FilledCircle = 'filled-circle', // Cercle plein
  Square = 'square', // Carré
  FilledSquare = 'filled-square', // Carré plein
  // Types Archimate
  ArchiComposition = 'archi-composition',
  ArchiAggregation = 'archi-aggregation',
  ArchiAssignment = 'archi-assignment',
  ArchiRealization = 'archi-realization',
  ArchiServing = 'archi-serving',
  ArchiAccess = 'archi-access',
  ArchiInfluence = 'archi-influence',
  ArchiTrigger = 'archi-trigger',
  ArchiFlow = 'archi-flow',
}

export interface ArrowConfig {
  startArrow: ArrowType;
  endArrow: ArrowType;
  size: number;
  color?: string;
}

export interface ArrowableOptions {
  edgeId: Ref<string>;
}

export interface ArrowableState {
  startArrow: Ref<ArrowType>;
  endArrow: Ref<ArrowType>;
  arrowSize: Ref<number>;
}

export interface ArrowableHandlers {
  setStartArrow: (type: ArrowType) => void;
  setEndArrow: (type: ArrowType) => void;
  setArrowSize: (size: number) => void;
  getArrowMarkerDef: (type: ArrowType, position: 'start' | 'end', color: string) => string;
}

// Définitions SVG des marqueurs de flèches
export const ARROW_MARKERS: Record<ArrowType, (size: number, filled: boolean) => string> = {
  [ArrowType.None]: () => '',

  [ArrowType.Arrow]: (size) => `
    <path d="M 0 0 L ${size} ${size / 2} L 0 ${size}" fill="none" stroke="currentColor" stroke-width="1.5"/>
  `,

  [ArrowType.FilledArrow]: (size) => `
    <path d="M 0 0 L ${size} ${size / 2} L 0 ${size} Z" fill="currentColor"/>
  `,

  [ArrowType.Diamond]: (size) => `
    <path d="M 0 ${size / 2} L ${size / 2} 0 L ${size} ${size / 2} L ${size / 2} ${size} Z" fill="none" stroke="currentColor" stroke-width="1.5"/>
  `,

  [ArrowType.FilledDiamond]: (size) => `
    <path d="M 0 ${size / 2} L ${size / 2} 0 L ${size} ${size / 2} L ${size / 2} ${size} Z" fill="currentColor"/>
  `,

  [ArrowType.Circle]: (size) => `
    <circle cx="${size / 2}" cy="${size / 2}" r="${size / 2 - 1}" fill="none" stroke="currentColor" stroke-width="1.5"/>
  `,

  [ArrowType.FilledCircle]: (size) => `
    <circle cx="${size / 2}" cy="${size / 2}" r="${size / 2 - 1}" fill="currentColor"/>
  `,

  [ArrowType.Square]: (size) => `
    <rect x="1" y="1" width="${size - 2}" height="${size - 2}" fill="none" stroke="currentColor" stroke-width="1.5"/>
  `,

  [ArrowType.FilledSquare]: (size) => `
    <rect x="1" y="1" width="${size - 2}" height="${size - 2}" fill="currentColor"/>
  `,

  // Archimate spécifiques
  [ArrowType.ArchiComposition]: (size) => `
    <path d="M 0 ${size / 2} L ${size / 2} 0 L ${size} ${size / 2} L ${size / 2} ${size} Z" fill="currentColor"/>
  `,

  [ArrowType.ArchiAggregation]: (size) => `
    <path d="M 0 ${size / 2} L ${size / 2} 0 L ${size} ${size / 2} L ${size / 2} ${size} Z" fill="white" stroke="currentColor" stroke-width="1.5"/>
  `,

  [ArrowType.ArchiAssignment]: (size) => `
    <circle cx="${size / 2}" cy="${size / 2}" r="${size / 3}" fill="currentColor"/>
    <path d="M ${size / 2} 0 L ${size} ${size / 2} L ${size / 2} ${size}" fill="none" stroke="currentColor" stroke-width="1.5"/>
  `,

  [ArrowType.ArchiRealization]: (size) => `
    <path d="M 0 0 L ${size} ${size / 2} L 0 ${size}" fill="white" stroke="currentColor" stroke-width="1.5"/>
  `,

  [ArrowType.ArchiServing]: (size) => `
    <path d="M 0 0 L ${size} ${size / 2} L 0 ${size} Z" fill="currentColor"/>
  `,

  [ArrowType.ArchiAccess]: (size) => `
    <path d="M 0 0 L ${size} ${size / 2} L 0 ${size}" fill="none" stroke="currentColor" stroke-width="1.5"/>
  `,

  [ArrowType.ArchiInfluence]: (size) => `
    <path d="M 0 0 L ${size} ${size / 2} L 0 ${size}" fill="none" stroke="currentColor" stroke-width="1.5" stroke-dasharray="3,2"/>
  `,

  [ArrowType.ArchiTrigger]: (size) => `
    <path d="M 0 0 L ${size} ${size / 2} L 0 ${size} Z" fill="currentColor"/>
  `,

  [ArrowType.ArchiFlow]: (size) => `
    <path d="M 0 0 L ${size} ${size / 2} L 0 ${size} Z" fill="currentColor"/>
  `,
};

export function useArrowable(options: ArrowableOptions): ArrowableState & ArrowableHandlers {
  const graphStore = useGraphStore();

  const edge = computed(() => graphStore.edges[options.edgeId.value]);

  const startArrow = computed((): ArrowType => {
    const e = edge.value;
    return ((e as any)?.startArrow as ArrowType) ?? ArrowType.None;
  });

  const endArrow = computed((): ArrowType => {
    const e = edge.value;
    return ((e as any)?.endArrow as ArrowType) ?? ArrowType.Arrow;
  });

  const arrowSize = computed((): number => {
    const e = edge.value;
    return ((e as any)?.arrowSize as number) ?? 10;
  });

  function setStartArrow(type: ArrowType) {
    // TODO: Implémenter la mise à jour de l'edge dans le store
  }

  function setEndArrow(type: ArrowType) {
    // TODO: Implémenter la mise à jour de l'edge dans le store
  }

  function setArrowSize(size: number) {
    // TODO: Implémenter la mise à jour de l'edge dans le store
  }

  function getArrowMarkerDef(type: ArrowType, position: 'start' | 'end', color: string): string {
    if (type === ArrowType.None) return '';

    const size = arrowSize.value;
    const id = `arrow-${type}-${position}-${color.replace('#', '')}`;
    const refX = position === 'end' ? size : 0;
    const orient = position === 'end' ? 'auto' : 'auto-start-reverse';

    const markerContent = ARROW_MARKERS[type]?.(size, type.includes('filled')) ?? '';

    return `
      <marker
        id="${id}"
        markerWidth="${size}"
        markerHeight="${size}"
        refX="${refX}"
        refY="${size / 2}"
        orient="${orient}"
        markerUnits="userSpaceOnUse"
        style="color: ${color}"
      >
        ${markerContent}
      </marker>
    `;
  }

  return {
    startArrow: computed(() => startArrow.value),
    endArrow: computed(() => endArrow.value),
    arrowSize: computed(() => arrowSize.value),
    setStartArrow,
    setEndArrow,
    setArrowSize,
    getArrowMarkerDef,
  };
}

// Labels pour l'UI
export const ARROW_TYPE_LABELS: Record<ArrowType, string> = {
  [ArrowType.None]: 'Aucune',
  [ArrowType.Arrow]: 'Flèche',
  [ArrowType.FilledArrow]: 'Flèche pleine',
  [ArrowType.Diamond]: 'Losange',
  [ArrowType.FilledDiamond]: 'Losange plein',
  [ArrowType.Circle]: 'Cercle',
  [ArrowType.FilledCircle]: 'Cercle plein',
  [ArrowType.Square]: 'Carré',
  [ArrowType.FilledSquare]: 'Carré plein',
  [ArrowType.ArchiComposition]: 'Composition',
  [ArrowType.ArchiAggregation]: 'Agrégation',
  [ArrowType.ArchiAssignment]: 'Assignation',
  [ArrowType.ArchiRealization]: 'Réalisation',
  [ArrowType.ArchiServing]: 'Service',
  [ArrowType.ArchiAccess]: 'Accès',
  [ArrowType.ArchiInfluence]: 'Influence',
  [ArrowType.ArchiTrigger]: 'Déclencheur',
  [ArrowType.ArchiFlow]: 'Flux',
};
