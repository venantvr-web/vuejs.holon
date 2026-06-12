// src/composables/traits/useArrowable.ts
import { computed, type Ref } from 'vue'
import { useGraphStore } from '../../stores/graph'

/**
 * Types de flèches disponibles pour les marqueurs d'edges.
 */
export enum ArrowType {
  None = 'none',
  // Marqueur de départ discret (point d'origine)
  Dot = 'dot', // Petit point discret (défaut pour départ)
  SmallDot = 'small-dot', // Point très petit
  // Flèches standard
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

/**
 * Configuration complète des flèches pour un edge.
 */
export interface ArrowConfig {
  /**
   * Type de flèche au départ de l'edge.
   */
  startArrow: ArrowType
  /**
   * Type de flèche à l'arrivée de l'edge.
   */
  endArrow: ArrowType
  /**
   * Taille du marqueur de flèche.
   */
  size: number
  /**
   * Couleur du marqueur (optionnel).
   */
  color?: string
}

/**
 * Options de configuration pour le trait Arrowable.
 */
export interface ArrowableOptions {
  /**
   * Référence réactive vers l'ID de l'edge concerné.
   */
  edgeId: Ref<string>
}

/**
 * État réactif exposé par le trait Arrowable.
 */
export interface ArrowableState {
  /**
   * Type de flèche au départ de l'edge.
   */
  startArrow: Ref<ArrowType>
  /**
   * Type de flèche à l'arrivée de l'edge.
   */
  endArrow: Ref<ArrowType>
  /**
   * Taille des marqueurs de flèche.
   */
  arrowSize: Ref<number>
}

/**
 * Handlers (actions) exposés par le trait Arrowable.
 */
export interface ArrowableHandlers {
  /**
   * Définit le type de flèche au départ de l'edge.
   * @param type - Type de flèche à appliquer
   */
  setStartArrow: (type: ArrowType) => void
  /**
   * Définit le type de flèche à l'arrivée de l'edge.
   * @param type - Type de flèche à appliquer
   */
  setEndArrow: (type: ArrowType) => void
  /**
   * Définit la taille des marqueurs de flèche.
   * @param size - Taille en pixels
   */
  setArrowSize: (size: number) => void
  /**
   * Génère la définition SVG du marqueur de flèche.
   * @param type - Type de flèche
   * @param position - Position du marqueur (start ou end)
   * @param color - Couleur du marqueur
   * @returns Définition SVG du marqueur
   */
  getArrowMarkerDef: (type: ArrowType, position: 'start' | 'end', color: string) => string
}

// Définitions SVG des marqueurs de flèches
export const ARROW_MARKERS: Record<ArrowType, (size: number, filled: boolean) => string> = {
  [ArrowType.None]: () => '',

  // Points de départ discrets
  [ArrowType.Dot]: (size) => `
    <circle cx="${size / 2}" cy="${size / 2}" r="${size / 4}" fill="currentColor"/>
  `,

  [ArrowType.SmallDot]: (size) => `
    <circle cx="${size / 2}" cy="${size / 2}" r="${size / 6}" fill="currentColor"/>
  `,

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
}

// Calcule le point de référence (refX, refY) du marker selon le type et la position
// Le point de référence est le point qui sera aligné avec l'extrémité du path
function getMarkerRefPoint(
  type: ArrowType,
  position: 'start' | 'end',
  size: number
): { refX: number; refY: number } {
  const center = size / 2

  // Types centrés (points/cercles) - le centre doit être sur l'intersection
  const centeredTypes = [
    ArrowType.Dot,
    ArrowType.SmallDot,
    ArrowType.Circle,
    ArrowType.FilledCircle,
  ]

  if (centeredTypes.includes(type)) {
    return { refX: center, refY: center }
  }

  // Types diamant - le centre du losange doit être sur l'intersection
  const diamondTypes = [
    ArrowType.Diamond,
    ArrowType.FilledDiamond,
    ArrowType.ArchiComposition,
    ArrowType.ArchiAggregation,
  ]

  if (diamondTypes.includes(type)) {
    return { refX: center, refY: center }
  }

  // Types carrés
  const squareTypes = [ArrowType.Square, ArrowType.FilledSquare]

  if (squareTypes.includes(type)) {
    return { refX: center, refY: center }
  }

  // Types flèches directionnelles
  // Pour end: la pointe (à droite du path) doit être sur l'intersection
  // Pour start: la base de la flèche doit être sur l'intersection
  if (position === 'end') {
    return { refX: size, refY: center }
  } else {
    // Pour start, on veut que le marqueur soit visible au départ
    // refX=0 place la base de la flèche sur le point
    return { refX: 0, refY: center }
  }
}

/**
 * Trait permettant de gérer les marqueurs de flèches (start/end) pour les edges.
 *
 * Fournit un large éventail de types de flèches incluant les styles standards
 * et les types spécifiques ArchiMate pour la modélisation d'architecture.
 *
 * @param options - Configuration du trait
 * @returns État réactif et handlers pour la gestion des flèches
 *
 * @example
 * ```typescript
 * const { startArrow, endArrow, setEndArrow } = useArrowable({ edgeId: ref('edge-123') });
 * setEndArrow(ArrowType.FilledArrow); // Flèche pleine à l'arrivée
 * ```
 */
export function useArrowable(options: ArrowableOptions): ArrowableState & ArrowableHandlers {
  const graphStore = useGraphStore()

  const edge = computed(() => graphStore.edges[options.edgeId.value])

  const startArrow = computed((): ArrowType => {
    const e = edge.value
    // Par défaut : petit point discret pour marquer le départ
    return (e?.startArrow as ArrowType) ?? ArrowType.Dot
  })

  const endArrow = computed((): ArrowType => {
    const e = edge.value
    return (e?.endArrow as ArrowType) ?? ArrowType.Arrow
  })

  const arrowSize = computed((): number => {
    const e = edge.value
    return e?.arrowSize ?? 10
  })

  function setStartArrow(type: ArrowType) {
    if (edge.value) {
      graphStore.updateEdge(options.edgeId.value, { startArrow: type })
    }
  }

  function setEndArrow(type: ArrowType) {
    if (edge.value) {
      graphStore.updateEdge(options.edgeId.value, { endArrow: type })
    }
  }

  function setArrowSize(size: number) {
    if (edge.value) {
      graphStore.updateEdge(options.edgeId.value, { arrowSize: size })
    }
  }

  function getArrowMarkerDef(type: ArrowType, position: 'start' | 'end', color: string): string {
    if (type === ArrowType.None) return ''

    const size = arrowSize.value
    const id = `arrow-${type}-${position}-${color.replace('#', '')}`

    // Calculer refX/refY selon le type de marqueur et la position
    // Pour les points (Dot, SmallDot, Circle, FilledCircle), le centre doit être sur l'intersection
    // Pour les flèches, la pointe doit être sur l'intersection (position end) ou la base (position start)
    const { refX, refY } = getMarkerRefPoint(type, position, size)
    const orient = position === 'end' ? 'auto' : 'auto-start-reverse'

    const markerContent = ARROW_MARKERS[type]?.(size, type.includes('filled')) ?? ''

    return `
      <marker
        id="${id}"
        markerWidth="${size}"
        markerHeight="${size}"
        refX="${refX}"
        refY="${refY}"
        orient="${orient}"
        markerUnits="userSpaceOnUse"
        style="color: ${color}"
      >
        ${markerContent}
      </marker>
    `
  }

  return {
    startArrow: computed(() => startArrow.value),
    endArrow: computed(() => endArrow.value),
    arrowSize: computed(() => arrowSize.value),
    setStartArrow,
    setEndArrow,
    setArrowSize,
    getArrowMarkerDef,
  }
}

// Labels pour l'UI
export const ARROW_TYPE_LABELS: Record<ArrowType, string> = {
  [ArrowType.None]: 'Aucun',
  [ArrowType.Dot]: 'Point',
  [ArrowType.SmallDot]: 'Petit point',
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
}

// Marqueurs recommandés pour le départ (discrets)
export const START_MARKER_TYPES: ArrowType[] = [
  ArrowType.Dot,
  ArrowType.SmallDot,
  ArrowType.None,
  ArrowType.FilledCircle,
  ArrowType.Circle,
]

// Marqueurs recommandés pour l'arrivée (directionnels)
export const END_MARKER_TYPES: ArrowType[] = [
  ArrowType.Arrow,
  ArrowType.FilledArrow,
  ArrowType.Diamond,
  ArrowType.FilledDiamond,
  ArrowType.Circle,
  ArrowType.FilledCircle,
  ArrowType.None,
]
