// src/composables/traits/useTypeable.ts
import { computed, type Ref } from 'vue'
import { useGraphStore } from '../../stores/graph'

// Types Archimate standards
export const ARCHIMATE_TYPES = {
  // Business Layer
  business: {
    label: 'Business',
    color: '#FFFFB5',
    types: {
      'business-actor': { label: 'Actor', icon: '👤' },
      'business-role': { label: 'Role', icon: '🎭' },
      'business-collaboration': { label: 'Collaboration', icon: '🤝' },
      'business-interface': { label: 'Interface', icon: '🔌' },
      'business-process': { label: 'Process', icon: '⚙️' },
      'business-function': { label: 'Function', icon: '📦' },
      'business-interaction': { label: 'Interaction', icon: '↔️' },
      'business-event': { label: 'Event', icon: '⚡' },
      'business-service': { label: 'Service', icon: '🎯' },
      'business-object': { label: 'Object', icon: '📄' },
      'business-contract': { label: 'Contract', icon: '📜' },
      'business-representation': { label: 'Representation', icon: '🖼️' },
      'business-product': { label: 'Product', icon: '📦' },
    },
  },
  // Application Layer
  application: {
    label: 'Application',
    color: '#B5FFFF',
    types: {
      'application-component': { label: 'Component', icon: '🧩' },
      'application-collaboration': { label: 'Collaboration', icon: '🤝' },
      'application-interface': { label: 'Interface', icon: '🔌' },
      'application-function': { label: 'Function', icon: '⚡' },
      'application-interaction': { label: 'Interaction', icon: '↔️' },
      'application-process': { label: 'Process', icon: '⚙️' },
      'application-event': { label: 'Event', icon: '📡' },
      'application-service': { label: 'Service', icon: '🎯' },
      'application-data-object': { label: 'Data Object', icon: '💾' },
    },
  },
  // Technology Layer
  technology: {
    label: 'Technology',
    color: '#C9E7B7',
    types: {
      'technology-node': { label: 'Node', icon: '🖥️' },
      'technology-device': { label: 'Device', icon: '📱' },
      'technology-system-software': { label: 'System Software', icon: '💿' },
      'technology-collaboration': { label: 'Collaboration', icon: '🤝' },
      'technology-interface': { label: 'Interface', icon: '🔌' },
      'technology-path': { label: 'Path', icon: '🛤️' },
      'technology-communication-network': { label: 'Network', icon: '🌐' },
      'technology-function': { label: 'Function', icon: '⚡' },
      'technology-process': { label: 'Process', icon: '⚙️' },
      'technology-interaction': { label: 'Interaction', icon: '↔️' },
      'technology-event': { label: 'Event', icon: '📡' },
      'technology-service': { label: 'Service', icon: '🎯' },
      'technology-artifact': { label: 'Artifact', icon: '📦' },
    },
  },
  // Motivation Layer
  motivation: {
    label: 'Motivation',
    color: '#CCCCFF',
    types: {
      'motivation-stakeholder': { label: 'Stakeholder', icon: '👥' },
      'motivation-driver': { label: 'Driver', icon: '🎯' },
      'motivation-assessment': { label: 'Assessment', icon: '📊' },
      'motivation-goal': { label: 'Goal', icon: '🏆' },
      'motivation-outcome': { label: 'Outcome', icon: '✅' },
      'motivation-principle': { label: 'Principle', icon: '📐' },
      'motivation-requirement': { label: 'Requirement', icon: '📋' },
      'motivation-constraint': { label: 'Constraint', icon: '🚫' },
      'motivation-meaning': { label: 'Meaning', icon: '💡' },
      'motivation-value': { label: 'Value', icon: '💎' },
    },
  },
  // Strategy Layer
  strategy: {
    label: 'Strategy',
    color: '#F5DEAA',
    types: {
      'strategy-resource': { label: 'Resource', icon: '🔧' },
      'strategy-capability': { label: 'Capability', icon: '💪' },
      'strategy-course-of-action': { label: 'Course of Action', icon: '🗺️' },
      'strategy-value-stream': { label: 'Value Stream', icon: '📈' },
    },
  },
  // Implementation & Migration
  implementation: {
    label: 'Implementation',
    color: '#FFE0E0',
    types: {
      'implementation-work-package': { label: 'Work Package', icon: '📁' },
      'implementation-deliverable': { label: 'Deliverable', icon: '📦' },
      'implementation-event': { label: 'Event', icon: '🎉' },
      'implementation-plateau': { label: 'Plateau', icon: '🏔️' },
      'implementation-gap': { label: 'Gap', icon: '⚠️' },
    },
  },
  // Physical Layer
  physical: {
    label: 'Physical',
    color: '#C9E7B7',
    types: {
      'physical-equipment': { label: 'Equipment', icon: '🔧' },
      'physical-facility': { label: 'Facility', icon: '🏭' },
      'physical-distribution-network': { label: 'Distribution Network', icon: '🚚' },
      'physical-material': { label: 'Material', icon: '📦' },
    },
  },
  // Generic / Other
  generic: {
    label: 'Generic',
    color: '#E0E0E0',
    types: {
      'generic-grouping': { label: 'Grouping', icon: '📂' },
      'generic-location': { label: 'Location', icon: '📍' },
      'generic-junction': { label: 'Junction', icon: '⊕' },
      'generic-note': { label: 'Note', icon: '📝' },
    },
  },
} as const

export type ArchimateLayer = keyof typeof ARCHIMATE_TYPES

/**
 * Enum des types Archimate (pour compatibilité avec nouveaux traits).
 */
export enum ArchimateType {
  // Business Layer
  BUSINESS_ACTOR = 'business-actor',
  BUSINESS_ROLE = 'business-role',
  BUSINESS_COLLABORATION = 'business-collaboration',
  BUSINESS_INTERFACE = 'business-interface',
  BUSINESS_PROCESS = 'business-process',
  BUSINESS_FUNCTION = 'business-function',
  BUSINESS_INTERACTION = 'business-interaction',
  BUSINESS_EVENT = 'business-event',
  BUSINESS_SERVICE = 'business-service',
  BUSINESS_OBJECT = 'business-object',
  BUSINESS_CONTRACT = 'business-contract',
  BUSINESS_REPRESENTATION = 'business-representation',
  BUSINESS_PRODUCT = 'business-product',

  // Application Layer
  APPLICATION_COMPONENT = 'application-component',
  APPLICATION_COLLABORATION = 'application-collaboration',
  APPLICATION_INTERFACE = 'application-interface',
  APPLICATION_FUNCTION = 'application-function',
  APPLICATION_INTERACTION = 'application-interaction',
  APPLICATION_PROCESS = 'application-process',
  APPLICATION_EVENT = 'application-event',
  APPLICATION_SERVICE = 'application-service',
  DATA_OBJECT = 'application-data-object',

  // Technology Layer
  TECHNOLOGY_NODE = 'technology-node',
  TECHNOLOGY_DEVICE = 'technology-device',
  TECHNOLOGY_SYSTEM_SOFTWARE = 'technology-system-software',
  TECHNOLOGY_COLLABORATION = 'technology-collaboration',
  TECHNOLOGY_INTERFACE = 'technology-interface',
  TECHNOLOGY_PATH = 'technology-path',
  TECHNOLOGY_COMMUNICATION_NETWORK = 'technology-communication-network',
  TECHNOLOGY_FUNCTION = 'technology-function',
  TECHNOLOGY_PROCESS = 'technology-process',
  TECHNOLOGY_INTERACTION = 'technology-interaction',
  TECHNOLOGY_EVENT = 'technology-event',
  TECHNOLOGY_SERVICE = 'technology-service',
  TECHNOLOGY_ARTIFACT = 'technology-artifact',

  // Motivation Layer
  STAKEHOLDER = 'motivation-stakeholder',
  DRIVER = 'motivation-driver',
  ASSESSMENT = 'motivation-assessment',
  GOAL = 'motivation-goal',
  OUTCOME = 'motivation-outcome',
  PRINCIPLE = 'motivation-principle',
  REQUIREMENT = 'motivation-requirement',
  CONSTRAINT = 'motivation-constraint',
  MEANING = 'motivation-meaning',
  VALUE = 'motivation-value',

  // Strategy Layer
  RESOURCE = 'strategy-resource',
  CAPABILITY = 'strategy-capability',
  COURSE_OF_ACTION = 'strategy-course-of-action',
  VALUE_STREAM = 'strategy-value-stream',

  // Implementation & Migration
  WORK_PACKAGE = 'implementation-work-package',
  DELIVERABLE = 'implementation-deliverable',
  IMPLEMENTATION_EVENT = 'implementation-event',
  PLATEAU = 'implementation-plateau',
  GAP = 'implementation-gap',

  // Physical Layer
  EQUIPMENT = 'physical-equipment',
  FACILITY = 'physical-facility',
  DISTRIBUTION_NETWORK = 'physical-distribution-network',
  MATERIAL = 'physical-material',

  // Generic / Other
  GROUPING = 'generic-grouping',
  LOCATION = 'generic-location',
  JUNCTION = 'generic-junction',
  NOTE = 'generic-note',
}

// Type alias pour compatibilité avec code existant
export type ArchimateTypeString = string

/**
 * Options de configuration pour le trait Typeable.
 */
export interface TypeableOptions {
  /** Identifiant réactif du noeud */
  nodeId: Ref<string>
}

/**
 * État réactif géré par le trait Typeable.
 */
export interface TypeableState {
  /** Type ArchiMate du noeud */
  archimateType: Ref<ArchimateType | null>
  /** Couche ArchiMate à laquelle appartient le type */
  archimateLayer: Ref<ArchimateLayer | null>
  /** Libellé du type en toutes lettres */
  typeLabel: Ref<string>
  /** Icône associée au type */
  typeIcon: Ref<string>
  /** Couleur de la couche ArchiMate (hex opaque) */
  typeColor: Ref<string>
  /** Couleur de remplissage teintée (rgba avec alpha) pour le fond du noeud */
  typeTintFill: Ref<string>
}

/**
 * Gestionnaires d'actions fournis par le trait Typeable.
 */
export interface TypeableHandlers {
  /** Définit le type ArchiMate et applique automatiquement la couleur de couche */
  setType: (type: ArchimateType) => void
  /** Supprime le type ArchiMate du noeud */
  clearType: () => void
}

/**
 * Ajoute la capacité de typage ArchiMate à un noeud.
 *
 * Gère l'attribution d'un type ArchiMate parmi 7 couches (Business, Application,
 * Technology, Motivation, Strategy, Implementation, Physical) avec application
 * automatique des couleurs standards et métadonnées (icônes, libellés).
 *
 * @param options - Configuration du trait
 * @returns État réactif et gestionnaires pour le typage ArchiMate
 */
export function useTypeable(options: TypeableOptions): TypeableState & TypeableHandlers {
  const graphStore = useGraphStore()

  const archimateType = computed(() => {
    const node = graphStore.nodes[options.nodeId.value]
    return node?.data?.archimateType ?? null
  })

  // Toutes les métadonnées (couche, libellé, icône, couleur) proviennent de
  // l'index inverse pré-calculé au chargement du module : plus aucune
  // recherche linéaire sur ARCHIMATE_TYPES à chaque évaluation réactive.
  const typeInfo = computed(() => getArchimateTypeInfo(archimateType.value))

  const archimateLayer = computed((): ArchimateLayer | null => typeInfo.value?.layer ?? null)

  const typeLabel = computed(() => typeInfo.value?.label ?? '')

  const typeIcon = computed(() => typeInfo.value?.icon ?? '')

  const typeColor = computed(() => typeInfo.value?.color ?? '#ffffff')

  /**
   * Convertit un hex (#RGB ou #RRGGBB) en rgba avec l'alpha donné.
   * Utilisé pour générer le fond teinté des noeuds Archimate : la couleur
   * de la layer reste reconnaissable tout en laissant passer le fond.
   */
  function hexToRgba(hex: string, alpha: number): string {
    let h = hex.replace('#', '')
    if (h.length === 3)
      h = h
        .split('')
        .map((c) => c + c)
        .join('')
    const r = parseInt(h.slice(0, 2), 16)
    const g = parseInt(h.slice(2, 4), 16)
    const b = parseInt(h.slice(4, 6), 16)
    return `rgba(${r}, ${g}, ${b}, ${alpha})`
  }

  const typeTintFill = computed(() => {
    const color = typeColor.value
    if (color === '#ffffff') return ''
    return hexToRgba(color, 0.35)
  })

  function setType(type: ArchimateType) {
    const node = graphStore.nodes[options.nodeId.value]
    if (!node) return
    // On stocke uniquement le type — le fill reste piloté par le trait
    // Styleable + le tint Archimate est calculé à l'affichage. Permet à
    // l'utilisateur de surcharger la couleur sans perdre le type.
    graphStore.updateNode(options.nodeId.value, {
      data: { ...node.data, archimateType: type },
    })
  }

  function clearType() {
    const node = graphStore.nodes[options.nodeId.value]
    if (!node) return

    const newData = { ...node.data }
    delete newData.archimateType

    graphStore.updateNode(options.nodeId.value, {
      data: newData,
    })
  }

  return {
    archimateType: computed(() => archimateType.value),
    archimateLayer: computed(() => archimateLayer.value),
    typeLabel,
    typeIcon,
    typeColor,
    typeTintFill,
    setType,
    clearType,
  }
}

/**
 * Métadonnées agrégées d'un type Archimate, pré-indexées pour un accès O(1).
 */
export interface ArchimateTypeInfo {
  /** Couche à laquelle appartient le type. */
  layer: ArchimateLayer
  /** Libellé de la couche. */
  layerLabel: string
  /** Libellé du type. */
  label: string
  /** Icône associée. */
  icon: string
  /** Couleur de la couche (hex opaque). */
  color: string
  /**
   * Nom PascalCase conforme au standard Open Group, utilisé comme `xsi:type`
   * dans l'export/import Archimate XML.
   */
  xmiType: string
}

/**
 * Cas particuliers où la transformation kebab → Pascal ne produit pas le nom
 * standard Open Group : la couche « generic » n'est pas préfixée dans le
 * standard (Grouping, Location, Junction).
 */
const XMI_TYPE_OVERRIDES: Record<string, string> = {
  'generic-grouping': 'Grouping',
  'generic-location': 'Location',
  'generic-junction': 'Junction',
  // « note » n'a pas d'équivalent élément Archimate normalisé ; on conserve un
  // nom stable et réversible pour préserver l'aller-retour interne.
  'generic-note': 'Note',
}

/**
 * Convertit un identifiant kebab-case (`business-actor`) en PascalCase
 * (`BusinessActor`).
 */
function kebabToPascal(type: string): string {
  return type
    .split('-')
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join('')
}

/**
 * Index inverse type interne → métadonnées, et index Pascal → type interne.
 * Construits une seule fois au chargement du module : les recherches linéaires
 * répétées (`archimateLayer`, `typeLabel`, `typeIcon`) et les mappings XML
 * s'appuient dessus.
 */
const TYPE_INDEX = new Map<string, ArchimateTypeInfo>()
const XMI_TO_TYPE = new Map<string, string>()

for (const [layerKey, layer] of Object.entries(ARCHIMATE_TYPES)) {
  for (const [typeKey, def] of Object.entries(layer.types)) {
    const xmiType = XMI_TYPE_OVERRIDES[typeKey] ?? kebabToPascal(typeKey)
    TYPE_INDEX.set(typeKey, {
      layer: layerKey as ArchimateLayer,
      layerLabel: layer.label,
      label: (def as { label: string }).label,
      icon: (def as { icon: string }).icon,
      color: layer.color,
      xmiType,
    })
    XMI_TO_TYPE.set(xmiType, typeKey)
  }
}

/**
 * Renvoie les métadonnées d'un type Archimate interne en O(1), ou `null` si le
 * type est inconnu.
 */
export function getArchimateTypeInfo(type: string | null | undefined): ArchimateTypeInfo | null {
  if (!type) return null
  return TYPE_INDEX.get(type) ?? null
}

/**
 * Convertit un type interne (kebab-case) en `xsi:type` standard (PascalCase)
 * pour l'export Archimate XML. Les types inconnus sont transformés à la volée.
 */
export function toArchimateXmiType(type: string): string {
  return TYPE_INDEX.get(type)?.xmiType ?? kebabToPascal(type)
}

/**
 * Convertit un `xsi:type` standard (PascalCase) en type interne (kebab-case)
 * pour l'import Archimate XML. Renvoie `null` si aucun type interne ne
 * correspond (l'appelant peut alors décider de conserver la valeur brute).
 */
export function fromArchimateXmiType(xmiType: string): string | null {
  return XMI_TO_TYPE.get(xmiType) ?? null
}

// Helper pour obtenir tous les types à plat
export function getAllArchimateTypes(): Array<{
  type: string
  label: string
  icon: string
  layer: string
  layerLabel: string
  color: string
}> {
  const result: Array<{
    type: string
    label: string
    icon: string
    layer: string
    layerLabel: string
    color: string
  }> = []

  for (const [layer, config] of Object.entries(ARCHIMATE_TYPES)) {
    for (const [type, typeConfig] of Object.entries(config.types)) {
      result.push({
        type,
        label: typeConfig.label,
        icon: typeConfig.icon,
        layer,
        layerLabel: config.label,
        color: config.color,
      })
    }
  }

  return result
}
