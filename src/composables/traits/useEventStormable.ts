// src/composables/traits/useEventStormable.ts
import { ref, computed, type Ref } from 'vue'
import { useGraphStore } from '../../stores/graph'
import type { Node } from '../../types'

/**
 * Notation active du canevas.
 *
 * - `archimate` : notation historique de Holon (7 couches, types Archimate)
 * - `event-storming` : atelier Event Storming (stickers Brandolini)
 */
export type NotationMode = 'archimate' | 'event-storming'

/**
 * Types de stickers Event Storming (palette « Big Picture » classique).
 */
export type EventStormingType =
  | 'domain-event'
  | 'command'
  | 'actor'
  | 'aggregate'
  | 'policy'
  | 'read-model'
  | 'external-system'
  | 'hotspot'

/**
 * Définition d'un sticker : apparence par défaut et sémantique.
 * Les libellés canoniques sont en anglais (identifiants techniques) ;
 * l'affichage localisé passe par les clés i18n `es.type.<type>`.
 */
export interface EventStormingStickerDef {
  /** Libellé canonique (anglais, non localisé). */
  label: string
  /** Icône emoji affichée dans la palette. */
  icon: string
  /** Couleur de fond du sticker (convention Brandolini). */
  fill: string
  /** Couleur de bordure, dérivée assombrie du fond. */
  stroke: string
  /** Largeur par défaut en unités monde. */
  width: number
  /** Hauteur par défaut en unités monde. */
  height: number
  /** Les agrégats sont des conteneurs ; les autres stickers sont des formes. */
  nodeType: Node['type']
}

/**
 * Catalogue des stickers Event Storming avec les couleurs conventionnelles :
 * orange (événement), bleu (commande), jaune (acteur), jaune pâle (agrégat),
 * lilas (politique), vert (modèle de lecture), rose (système externe),
 * rouge (point chaud).
 */
export const EVENT_STORMING_TYPES: Record<EventStormingType, EventStormingStickerDef> = {
  'domain-event': {
    label: 'Domain Event',
    icon: '⚡',
    fill: '#FFA94D',
    stroke: '#E8590C',
    width: 140,
    height: 90,
    nodeType: 'shape',
  },
  command: {
    label: 'Command',
    icon: '📮',
    fill: '#74C0FC',
    stroke: '#1971C2',
    width: 140,
    height: 90,
    nodeType: 'shape',
  },
  actor: {
    label: 'Actor',
    icon: '👤',
    fill: '#FFE066',
    stroke: '#F08C00',
    width: 100,
    height: 70,
    nodeType: 'shape',
  },
  aggregate: {
    label: 'Aggregate',
    icon: '📦',
    fill: '#FFF3BF',
    stroke: '#E9B949',
    width: 240,
    height: 160,
    nodeType: 'container',
  },
  policy: {
    label: 'Policy',
    icon: '📜',
    fill: '#B197FC',
    stroke: '#6741D9',
    width: 140,
    height: 90,
    nodeType: 'shape',
  },
  'read-model': {
    label: 'Read Model',
    icon: '📊',
    fill: '#8CE99A',
    stroke: '#2F9E44',
    width: 140,
    height: 90,
    nodeType: 'shape',
  },
  'external-system': {
    label: 'External System',
    icon: '🌐',
    fill: '#FAA2C1',
    stroke: '#C2255C',
    width: 160,
    height: 90,
    nodeType: 'shape',
  },
  hotspot: {
    label: 'Hotspot',
    icon: '🔥',
    fill: '#FF6B6B',
    stroke: '#C92A2A',
    width: 120,
    height: 90,
    nodeType: 'shape',
  },
} as const

/**
 * Grammaire Event Storming : pour chaque type source, la liste des types
 * cibles qu'une flèche peut légitimement viser.
 *
 * Cycle canonique : acteur → commande → agrégat → événement → politique →
 * commande, l'événement alimentant aussi le modèle de lecture qui informe
 * l'acteur. Les systèmes externes reçoivent des commandes et émettent des
 * événements. Le point chaud est un marqueur libre : il se connecte à tout
 * (et tout peut s'y connecter) sans contrainte.
 */
export const EVENT_STORMING_GRAMMAR: Record<EventStormingType, readonly EventStormingType[]> = {
  actor: ['command'],
  command: ['aggregate', 'external-system'],
  aggregate: ['domain-event'],
  'external-system': ['domain-event'],
  'domain-event': ['policy', 'read-model', 'external-system'],
  policy: ['command'],
  'read-model': ['actor'],
  hotspot: [],
} as const

/**
 * Violation de la grammaire Event Storming détectée sur une arête.
 */
export interface GrammarIssue {
  /** ID de l'arête fautive. */
  edgeId: string
  /** Type du sticker source. */
  sourceType: EventStormingType
  /** Type du sticker cible. */
  targetType: EventStormingType
  /** Message d'explication (clé technique, localisable côté UI). */
  message: string
}

/**
 * État réactif exposé par le trait EventStormable.
 */
export interface EventStormableState {
  /** Notation active du canevas (persistée en localStorage). */
  notationMode: Ref<NotationMode>
  /** Vrai quand le mode Event Storming est actif. */
  isEventStormingMode: Ref<boolean>
}

/**
 * Handlers (actions) exposés par le trait EventStormable.
 */
export interface EventStormableHandlers {
  /** Change la notation active et la persiste. */
  setNotationMode: (mode: NotationMode) => void
  /** Alterne entre les deux notations. */
  toggleNotationMode: () => void
  /**
   * Construit un gabarit de noeud prêt à être instancié (drag & drop ou
   * création programmatique) pour un type de sticker donné.
   * @param type - Type de sticker
   * @param name - Nom localisé du noeud (défaut : libellé canonique)
   */
  createStickerTemplate: (type: EventStormingType, name?: string) => Omit<Node, 'id' | 'parentId'>
  /** Renvoie le type Event Storming d'un noeud, ou null. */
  getStickerType: (node: Node | undefined | null) => EventStormingType | null
  /**
   * Vérifie la grammaire Event Storming sur toutes les arêtes reliant deux
   * stickers typés. Les arêtes impliquant un noeud non typé ou un point
   * chaud sont ignorées (annotations libres).
   */
  checkGrammar: () => GrammarIssue[]
}

const STORAGE_KEY = 'holon-notation-mode'

function loadModeFromStorage(): NotationMode {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw === 'event-storming' ? 'event-storming' : 'archimate'
  } catch {
    return 'archimate'
  }
}

// État global au module : la notation est une propriété du canevas entier,
// partagée entre la Toolbar (bascule) et la Sidebar (palette), comme les
// autres traits applicatifs (thème, filtres, versions).
const notationMode = ref<NotationMode>(loadModeFromStorage())

/**
 * Ajoute la capacité « atelier Event Storming » à l'application.
 *
 * Fournit la bascule de notation du canevas, le catalogue de stickers
 * (couleurs et tailles conventionnelles), la fabrique de gabarits pour la
 * palette, et un vérificateur de grammaire (acteur → commande → agrégat →
 * événement → politique/modèle de lecture).
 *
 * @returns État réactif et handlers du mode Event Storming
 *
 * @example
 * ```typescript
 * const { setNotationMode, createStickerTemplate } = useEventStormable();
 * setNotationMode('event-storming');
 * const template = createStickerTemplate('domain-event', 'Commande validée');
 * await graphStore.createNode(template, null);
 * ```
 */
export function useEventStormable(): EventStormableState & EventStormableHandlers {
  const graphStore = useGraphStore()

  function setNotationMode(mode: NotationMode): void {
    notationMode.value = mode
    try {
      localStorage.setItem(STORAGE_KEY, mode)
    } catch {
      // Stockage indisponible (mode privé, quota) : non bloquant.
    }
  }

  function toggleNotationMode(): void {
    setNotationMode(notationMode.value === 'archimate' ? 'event-storming' : 'archimate')
  }

  function createStickerTemplate(
    type: EventStormingType,
    name?: string
  ): Omit<Node, 'id' | 'parentId'> {
    const def = EVENT_STORMING_TYPES[type]
    return {
      type: def.nodeType,
      geometry: { x: 0, y: 0, w: def.width, h: def.height },
      styling: { fill: def.fill, stroke: def.stroke, strokeWidth: 1.5, opacity: 1 },
      data: {
        name: name ?? def.label,
        eventStormingType: type,
        // Le fill du sticker est signifiant (convention de couleurs) : on le
        // marque comme personnalisé pour qu'aucun tint de type ne l'écrase.
        customFill: true,
        // Les agrégats accueillent commandes et événements : ils grandissent
        // avec leur contenu comme les containers de la bibliothèque.
        ...(def.nodeType === 'container' ? { autosize: true } : {}),
      },
    }
  }

  function getStickerType(node: Node | undefined | null): EventStormingType | null {
    const type = node?.data?.eventStormingType as string | undefined
    if (type && type in EVENT_STORMING_TYPES) return type as EventStormingType
    return null
  }

  function checkGrammar(): GrammarIssue[] {
    const issues: GrammarIssue[] = []
    for (const edge of Object.values(graphStore.edges)) {
      const sourceType = getStickerType(graphStore.nodes[edge.sourceId])
      const targetType = getStickerType(graphStore.nodes[edge.targetId])
      // On ne juge que les liens entre deux stickers typés.
      if (!sourceType || !targetType) continue
      // Le point chaud est une annotation : toujours valide, dans les deux sens.
      if (sourceType === 'hotspot' || targetType === 'hotspot') continue

      if (!EVENT_STORMING_GRAMMAR[sourceType].includes(targetType)) {
        issues.push({
          edgeId: edge.id,
          sourceType,
          targetType,
          message: `es.grammar.invalid`,
        })
      }
    }
    return issues
  }

  return {
    notationMode,
    isEventStormingMode: computed(() => notationMode.value === 'event-storming'),
    setNotationMode,
    toggleNotationMode,
    createStickerTemplate,
    getStickerType,
    checkGrammar,
  }
}

/**
 * Renvoie le catalogue à plat, dans l'ordre du cycle canonique de l'atelier,
 * pour l'affichage de la palette.
 */
export function getAllEventStormingTypes(): Array<
  { type: EventStormingType } & EventStormingStickerDef
> {
  const order: EventStormingType[] = [
    'domain-event',
    'command',
    'actor',
    'aggregate',
    'policy',
    'read-model',
    'external-system',
    'hotspot',
  ]
  return order.map((type) => ({ type, ...EVENT_STORMING_TYPES[type] }))
}
