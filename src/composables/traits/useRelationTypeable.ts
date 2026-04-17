// src/composables/traits/useRelationTypeable.ts
// Gestion des types de relations Archimate avec validation
import { ref, computed, type Ref } from 'vue';
import { useGraphStore } from '../../stores/graph';
import { ArrowType } from './useArrowable';

// Types de relations Archimate
export enum RelationType {
  // Structural
  Composition = 'composition',
  Aggregation = 'aggregation',
  Assignment = 'assignment',
  Realization = 'realization',
  // Dependency
  Serving = 'serving',
  Access = 'access',
  Influence = 'influence',
  Association = 'association',
  // Dynamic
  Triggering = 'triggering',
  Flow = 'flow',
  // Other
  Specialization = 'specialization',
  // Junctions
  AndJunction = 'and-junction',
  OrJunction = 'or-junction',
}

// Catégories de relations
export enum RelationCategory {
  Structural = 'structural',
  Dependency = 'dependency',
  Dynamic = 'dynamic',
  Other = 'other',
}

// Layers Archimate pour validation
export type ArchimateLayer =
  | 'strategy'
  | 'business'
  | 'application'
  | 'technology'
  | 'physical'
  | 'motivation'
  | 'implementation';

// Type d'accès pour la relation Access
export type AccessType = 'read' | 'write' | 'readwrite';

// Force d'influence pour la relation Influence
export type InfluenceStrength = '+' | '++' | '-' | '--' | '?' | '0';

// Type de flux pour la relation Flow
export type FlowType = 'information' | 'material' | 'money' | 'energy';

// Configuration d'une relation
export interface RelationConfig {
  type: RelationType;
  category: RelationCategory;
  name: string;
  description: string;
  // Style visuel
  lineStyle: 'solid' | 'dashed' | 'dotted';
  sourceMarker: ArrowType;
  targetMarker: ArrowType;
  defaultColor: string;
  // Validation
  validation: RelationValidation;
  // Propriétés spécifiques (optionnelles)
  properties?: {
    accessType?: AccessType;
    influenceStrength?: InfluenceStrength;
    flowType?: FlowType;
    bidirectional?: boolean;
  };
}

// Règles de validation pour une relation
export interface RelationValidation {
  // Layers autorisés
  allowedSourceLayers?: ArchimateLayer[];
  allowedTargetLayers?: ArchimateLayer[];
  // Types spécifiques autorisés (si vide = tous du layer)
  allowedSourceTypes?: string[];
  allowedTargetTypes?: string[];
  // Contraintes
  sameLayerOnly?: boolean;
  crossLayerDirection?: 'up' | 'down' | 'both'; // up = tech→app→business
  // Self-reference
  allowSelfLoop?: boolean;
}

// Configuration de toutes les relations Archimate
export const RELATION_CONFIGS: Record<RelationType, RelationConfig> = {
  // === STRUCTURAL ===
  [RelationType.Composition]: {
    type: RelationType.Composition,
    category: RelationCategory.Structural,
    name: 'Composition',
    description: 'Indicates that an element consists of one or more other concepts',
    lineStyle: 'solid',
    sourceMarker: ArrowType.FilledDiamond,
    targetMarker: ArrowType.None,
    defaultColor: '#000000',
    validation: {
      sameLayerOnly: true,
      allowSelfLoop: false,
    },
  },

  [RelationType.Aggregation]: {
    type: RelationType.Aggregation,
    category: RelationCategory.Structural,
    name: 'Aggregation',
    description: 'Indicates that an element combines one or more other concepts',
    lineStyle: 'solid',
    sourceMarker: ArrowType.Diamond,
    targetMarker: ArrowType.None,
    defaultColor: '#000000',
    validation: {
      sameLayerOnly: true,
      allowSelfLoop: false,
    },
  },

  [RelationType.Assignment]: {
    type: RelationType.Assignment,
    category: RelationCategory.Structural,
    name: 'Assignment',
    description: 'Links active elements to units of behavior',
    lineStyle: 'solid',
    sourceMarker: ArrowType.FilledCircle,
    targetMarker: ArrowType.None,
    defaultColor: '#000000',
    validation: {
      crossLayerDirection: 'both',
      allowSelfLoop: false,
    },
  },

  [RelationType.Realization]: {
    type: RelationType.Realization,
    category: RelationCategory.Structural,
    name: 'Realization',
    description: 'Indicates that an entity realizes another entity',
    lineStyle: 'dashed',
    sourceMarker: ArrowType.None,
    targetMarker: ArrowType.Arrow,
    defaultColor: '#000000',
    validation: {
      crossLayerDirection: 'up',
      allowSelfLoop: false,
    },
  },

  // === DEPENDENCY ===
  [RelationType.Serving]: {
    type: RelationType.Serving,
    category: RelationCategory.Dependency,
    name: 'Serving',
    description: 'Models that an element provides its functionality to another element',
    lineStyle: 'solid',
    sourceMarker: ArrowType.None,
    targetMarker: ArrowType.Circle,
    defaultColor: '#000000',
    validation: {
      crossLayerDirection: 'up',
      allowSelfLoop: false,
    },
  },

  [RelationType.Access]: {
    type: RelationType.Access,
    category: RelationCategory.Dependency,
    name: 'Access',
    description: 'Models the access of a behavior element to a business/data object',
    lineStyle: 'dashed',
    sourceMarker: ArrowType.None,
    targetMarker: ArrowType.Arrow,
    defaultColor: '#000000',
    validation: {
      allowSelfLoop: false,
    },
    properties: {
      accessType: 'readwrite',
    },
  },

  [RelationType.Influence]: {
    type: RelationType.Influence,
    category: RelationCategory.Dependency,
    name: 'Influence',
    description: 'Models that an element affects another element',
    lineStyle: 'dotted',
    sourceMarker: ArrowType.None,
    targetMarker: ArrowType.Arrow,
    defaultColor: '#000000',
    validation: {
      allowSelfLoop: false,
    },
    properties: {
      influenceStrength: '+',
    },
  },

  [RelationType.Association]: {
    type: RelationType.Association,
    category: RelationCategory.Dependency,
    name: 'Association',
    description: 'Models an unspecified relationship between elements',
    lineStyle: 'solid',
    sourceMarker: ArrowType.None,
    targetMarker: ArrowType.None,
    defaultColor: '#000000',
    validation: {
      allowSelfLoop: true,
    },
    properties: {
      bidirectional: true,
    },
  },

  // === DYNAMIC ===
  [RelationType.Triggering]: {
    type: RelationType.Triggering,
    category: RelationCategory.Dynamic,
    name: 'Triggering',
    description: 'Models a temporal or causal relationship between elements',
    lineStyle: 'solid',
    sourceMarker: ArrowType.None,
    targetMarker: ArrowType.FilledArrow,
    defaultColor: '#000000',
    validation: {
      sameLayerOnly: true,
      allowSelfLoop: false,
    },
  },

  [RelationType.Flow]: {
    type: RelationType.Flow,
    category: RelationCategory.Dynamic,
    name: 'Flow',
    description: 'Models transfer from one element to another',
    lineStyle: 'dashed',
    sourceMarker: ArrowType.None,
    targetMarker: ArrowType.FilledArrow,
    defaultColor: '#000000',
    validation: {
      allowSelfLoop: false,
    },
    properties: {
      flowType: 'information',
    },
  },

  // === OTHER ===
  [RelationType.Specialization]: {
    type: RelationType.Specialization,
    category: RelationCategory.Other,
    name: 'Specialization',
    description: 'Indicates that an element is a specific kind of another element',
    lineStyle: 'solid',
    sourceMarker: ArrowType.None,
    targetMarker: ArrowType.Arrow,
    defaultColor: '#000000',
    validation: {
      sameLayerOnly: true,
      allowSelfLoop: false,
    },
  },

  [RelationType.AndJunction]: {
    type: RelationType.AndJunction,
    category: RelationCategory.Other,
    name: 'AND Junction',
    description: 'Used to connect relationships of the same type (AND logic)',
    lineStyle: 'solid',
    sourceMarker: ArrowType.None,
    targetMarker: ArrowType.None,
    defaultColor: '#000000',
    validation: {
      allowSelfLoop: false,
    },
  },

  [RelationType.OrJunction]: {
    type: RelationType.OrJunction,
    category: RelationCategory.Other,
    name: 'OR Junction',
    description: 'Used to connect relationships of the same type (OR logic)',
    lineStyle: 'solid',
    sourceMarker: ArrowType.None,
    targetMarker: ArrowType.None,
    defaultColor: '#000000',
    validation: {
      allowSelfLoop: false,
    },
  },
};

// Labels pour l'UI
export const RELATION_TYPE_LABELS: Record<RelationType, string> = {
  [RelationType.Composition]: 'Composition ◆─',
  [RelationType.Aggregation]: 'Aggregation ◇─',
  [RelationType.Assignment]: 'Assignment ●─',
  [RelationType.Realization]: 'Realization ─ ─▷',
  [RelationType.Serving]: 'Serving ─○',
  [RelationType.Access]: 'Access ─ ─→',
  [RelationType.Influence]: 'Influence ···>',
  [RelationType.Association]: 'Association ───',
  [RelationType.Triggering]: 'Triggering ─▷',
  [RelationType.Flow]: 'Flow ─ ─▷',
  [RelationType.Specialization]: 'Specialization ─▷',
  [RelationType.AndJunction]: 'AND Junction ●',
  [RelationType.OrJunction]: 'OR Junction ○',
};

// Mapping Layer → types d'éléments autorisés (simplifié)
const LAYER_ELEMENTS: Record<ArchimateLayer, string[]> = {
  strategy: [
    'strategy-resource', 'strategy-capability', 'strategy-value-stream',
    'strategy-course-of-action',
  ],
  business: [
    'business-actor', 'business-role', 'business-collaboration',
    'business-interface', 'business-process', 'business-function',
    'business-interaction', 'business-event', 'business-service',
    'business-object', 'business-contract', 'business-representation',
    'business-product',
  ],
  application: [
    'application-component', 'application-collaboration', 'application-interface',
    'application-function', 'application-process', 'application-interaction',
    'application-event', 'application-service', 'application-data-object',
  ],
  technology: [
    'technology-node', 'technology-device', 'technology-system-software',
    'technology-collaboration', 'technology-interface', 'technology-path',
    'technology-communication-network', 'technology-function', 'technology-process',
    'technology-interaction', 'technology-event', 'technology-service',
    'technology-artifact',
  ],
  physical: [
    'physical-equipment', 'physical-facility', 'physical-distribution-network',
    'physical-material',
  ],
  motivation: [
    'motivation-stakeholder', 'motivation-driver', 'motivation-assessment',
    'motivation-goal', 'motivation-outcome', 'motivation-principle',
    'motivation-requirement', 'motivation-constraint', 'motivation-meaning',
    'motivation-value',
  ],
  implementation: [
    'implementation-work-package', 'implementation-deliverable',
    'implementation-plateau', 'implementation-gap',
  ],
};

// Hiérarchie des layers (pour crossLayerDirection)
const LAYER_HIERARCHY: ArchimateLayer[] = [
  'technology',
  'physical',
  'application',
  'business',
  'strategy',
  'motivation',
  'implementation',
];

/**
 * Options de configuration pour le trait RelationTypeable.
 */
export interface RelationTypeableOptions {
  /** Identifiant réactif de l'arête */
  edgeId: Ref<string>;
}

/**
 * État réactif géré par le trait RelationTypeable.
 */
export interface RelationTypeableState {
  /** Type de relation ArchiMate actuel */
  relationType: Ref<RelationType>;
  /** Configuration complète de la relation (style, validation, etc.) */
  relationConfig: Ref<RelationConfig>;
  /** Catégorie de la relation (structural, dependency, dynamic, other) */
  relationCategory: Ref<RelationCategory>;
  /** Type d'accès pour les relations Access (read, write, readwrite) */
  accessType: Ref<AccessType | null>;
  /** Force d'influence pour les relations Influence (+, ++, -, --, ?, 0) */
  influenceStrength: Ref<InfluenceStrength | null>;
  /** Type de flux pour les relations Flow (information, material, money, energy) */
  flowType: Ref<FlowType | null>;
  /** Indique si la relation est valide selon les règles ArchiMate */
  isValid: Ref<boolean>;
  /** Message d'erreur de validation si invalide */
  validationError: Ref<string | null>;
}

/**
 * Gestionnaires d'actions fournis par le trait RelationTypeable.
 */
export interface RelationTypeableHandlers {
  /** Définit le type de relation ArchiMate */
  setRelationType: (type: RelationType) => void;
  /** Définit le type d'accès (pour relations Access uniquement) */
  setAccessType: (type: AccessType) => void;
  /** Définit la force d'influence (pour relations Influence uniquement) */
  setInfluenceStrength: (strength: InfluenceStrength) => void;
  /** Définit le type de flux (pour relations Flow uniquement) */
  setFlowType: (type: FlowType) => void;
  /** Valide la relation selon les règles ArchiMate et retourne le résultat */
  validateRelation: () => { valid: boolean; error?: string };
  /** Retourne les types de relations autorisés entre deux types de noeuds */
  getAvailableRelationTypes: (sourceType: string, targetType: string) => RelationType[];
}

/**
 * Ajoute la capacité de typage et validation des relations ArchiMate à une arête.
 *
 * Gère 13 types de relations ArchiMate répartis en 4 catégories (structural,
 * dependency, dynamic, other) avec validation automatique selon les règles
 * ArchiMate (couches autorisées, directions cross-layer, etc.). Configure
 * automatiquement le style visuel (marqueurs, couleur, tirets).
 *
 * @param options - Configuration du trait
 * @returns État réactif et gestionnaires pour le typage de relation
 *
 * @example
 * ```ts
 * const { setRelationType, validateRelation } = useRelationTypeable({ edgeId });
 * setRelationType(RelationType.Composition);
 * const { valid, error } = validateRelation();
 * ```
 */
export function useRelationTypeable(options: RelationTypeableOptions): RelationTypeableState & RelationTypeableHandlers {
  const graphStore = useGraphStore();

  // État local
  const validationError = ref<string | null>(null);

  // Type de relation actuel (stocké dans edge.data pour cohérence avec
  // useValidatable, useExportable, useImportable qui lisent tous edge.data.*).
  const relationType = computed((): RelationType => {
    const edge = graphStore.edges[options.edgeId.value];
    if (!edge) return RelationType.Association;
    return (edge.data?.relationType as RelationType) ?? RelationType.Association;
  });

  const relationConfig = computed((): RelationConfig => RELATION_CONFIGS[relationType.value]);
  const relationCategory = computed((): RelationCategory => relationConfig.value.category);

  const accessType = computed((): AccessType | null => {
    if (relationType.value !== RelationType.Access) return null;
    return (graphStore.edges[options.edgeId.value]?.data?.accessType as AccessType) ?? 'readwrite';
  });

  const influenceStrength = computed((): InfluenceStrength | null => {
    if (relationType.value !== RelationType.Influence) return null;
    return (graphStore.edges[options.edgeId.value]?.data?.influenceStrength as InfluenceStrength) ?? '+';
  });

  const flowType = computed((): FlowType | null => {
    if (relationType.value !== RelationType.Flow) return null;
    return (graphStore.edges[options.edgeId.value]?.data?.flowType as FlowType) ?? 'information';
  });

  // Validation
  const isValid = computed((): boolean => {
    const result = validateRelation();
    return result.valid;
  });

  // Récupère le layer d'un type d'élément
  function getLayerForType(elementType: string): ArchimateLayer | null {
    for (const [layer, types] of Object.entries(LAYER_ELEMENTS)) {
      if (types.includes(elementType)) {
        return layer as ArchimateLayer;
      }
    }
    return null;
  }

  // Vérifie si un layer est "au-dessus" d'un autre dans la hiérarchie
  function isLayerAbove(layer1: ArchimateLayer, layer2: ArchimateLayer): boolean {
    const idx1 = LAYER_HIERARCHY.indexOf(layer1);
    const idx2 = LAYER_HIERARCHY.indexOf(layer2);
    return idx1 > idx2;
  }

  // Valide la relation actuelle
  function validateRelation(): { valid: boolean; error?: string } {
    const edge = graphStore.edges[options.edgeId.value];
    if (!edge) {
      return { valid: false, error: 'Edge introuvable' };
    }

    const sourceNode = graphStore.nodes[edge.sourceId];
    const targetNode = graphStore.nodes[edge.targetId];

    if (!sourceNode || !targetNode) {
      return { valid: false, error: 'Noeuds source ou cible introuvables' };
    }

    const config = relationConfig.value;
    const validation = config.validation;

    // Vérifier self-loop
    if (!validation.allowSelfLoop && edge.sourceId === edge.targetId) {
      validationError.value = `${config.name} ne peut pas être une boucle sur soi-même`;
      return { valid: false, error: validationError.value };
    }

    // Récupérer les types Archimate
    const sourceType = (sourceNode.data?.archimateType as string) ?? sourceNode.type;
    const targetType = (targetNode.data?.archimateType as string) ?? targetNode.type;

    const sourceLayer = getLayerForType(sourceType);
    const targetLayer = getLayerForType(targetType);

    // Vérifier sameLayerOnly
    if (validation.sameLayerOnly && sourceLayer && targetLayer && sourceLayer !== targetLayer) {
      validationError.value = `${config.name} doit rester dans le même layer`;
      return { valid: false, error: validationError.value };
    }

    // Vérifier crossLayerDirection
    if (validation.crossLayerDirection && sourceLayer && targetLayer && sourceLayer !== targetLayer) {
      if (validation.crossLayerDirection === 'up') {
        if (!isLayerAbove(targetLayer, sourceLayer)) {
          validationError.value = `${config.name} doit aller vers un layer supérieur`;
          return { valid: false, error: validationError.value };
        }
      } else if (validation.crossLayerDirection === 'down') {
        if (!isLayerAbove(sourceLayer, targetLayer)) {
          validationError.value = `${config.name} doit aller vers un layer inférieur`;
          return { valid: false, error: validationError.value };
        }
      }
    }

    // Vérifier allowedSourceLayers
    if (validation.allowedSourceLayers && sourceLayer) {
      if (!validation.allowedSourceLayers.includes(sourceLayer)) {
        validationError.value = `Source non autorisée pour ${config.name}`;
        return { valid: false, error: validationError.value };
      }
    }

    // Vérifier allowedTargetLayers
    if (validation.allowedTargetLayers && targetLayer) {
      if (!validation.allowedTargetLayers.includes(targetLayer)) {
        validationError.value = `Cible non autorisée pour ${config.name}`;
        return { valid: false, error: validationError.value };
      }
    }

    // Vérifier allowedSourceTypes
    if (validation.allowedSourceTypes && validation.allowedSourceTypes.length > 0) {
      if (!validation.allowedSourceTypes.includes(sourceType)) {
        validationError.value = `Type source non autorisé pour ${config.name}`;
        return { valid: false, error: validationError.value };
      }
    }

    // Vérifier allowedTargetTypes
    if (validation.allowedTargetTypes && validation.allowedTargetTypes.length > 0) {
      if (!validation.allowedTargetTypes.includes(targetType)) {
        validationError.value = `Type cible non autorisé pour ${config.name}`;
        return { valid: false, error: validationError.value };
      }
    }

    validationError.value = null;
    return { valid: true };
  }

  function updateEdgeData(patch: Record<string, unknown>) {
    const edge = graphStore.edges[options.edgeId.value];
    if (!edge) return;
    graphStore.updateEdge(options.edgeId.value, {
      data: { ...(edge.data ?? {}), ...patch },
    });
  }

  // Définit le type de relation et ses métadonnées visuelles associées
  function setRelationType(type: RelationType) {
    const config = RELATION_CONFIGS[type];
    updateEdgeData({
      relationType: type,
      lineStyle: config.lineStyle,
      sourceMarker: config.sourceMarker,
      targetMarker: config.targetMarker,
    });
    // Les marqueurs d'arêtes vivent aussi dans les champs startArrow/endArrow
    // lus par EdgeLayer ; synchroniser pour cohérence visuelle.
    graphStore.updateEdge(options.edgeId.value, {
      startArrow: config.sourceMarker,
      endArrow: config.targetMarker,
    });
  }

  function setAccessType(type: AccessType) {
    if (relationType.value !== RelationType.Access) return;
    updateEdgeData({ accessType: type });
  }

  function setInfluenceStrength(strength: InfluenceStrength) {
    if (relationType.value !== RelationType.Influence) return;
    updateEdgeData({ influenceStrength: strength });
  }

  function setFlowType(type: FlowType) {
    if (relationType.value !== RelationType.Flow) return;
    updateEdgeData({ flowType: type });
  }

  // Retourne les types de relations disponibles pour une paire source/target
  function getAvailableRelationTypes(sourceType: string, targetType: string): RelationType[] {
    const available: RelationType[] = [];
    const sourceLayer = getLayerForType(sourceType);
    const targetLayer = getLayerForType(targetType);

    for (const [type, config] of Object.entries(RELATION_CONFIGS)) {
      const validation = config.validation;

      // Vérifier sameLayerOnly
      if (validation.sameLayerOnly && sourceLayer !== targetLayer) {
        continue;
      }

      // Vérifier crossLayerDirection
      if (validation.crossLayerDirection && sourceLayer && targetLayer && sourceLayer !== targetLayer) {
        if (validation.crossLayerDirection === 'up' && !isLayerAbove(targetLayer, sourceLayer)) {
          continue;
        }
        if (validation.crossLayerDirection === 'down' && !isLayerAbove(sourceLayer, targetLayer)) {
          continue;
        }
      }

      // Vérifier allowedSourceLayers
      if (validation.allowedSourceLayers && sourceLayer) {
        if (!validation.allowedSourceLayers.includes(sourceLayer)) {
          continue;
        }
      }

      // Vérifier allowedTargetLayers
      if (validation.allowedTargetLayers && targetLayer) {
        if (!validation.allowedTargetLayers.includes(targetLayer)) {
          continue;
        }
      }

      // Vérifier allowedSourceTypes
      if (validation.allowedSourceTypes && validation.allowedSourceTypes.length > 0) {
        if (!validation.allowedSourceTypes.includes(sourceType)) {
          continue;
        }
      }

      // Vérifier allowedTargetTypes
      if (validation.allowedTargetTypes && validation.allowedTargetTypes.length > 0) {
        if (!validation.allowedTargetTypes.includes(targetType)) {
          continue;
        }
      }

      available.push(type as RelationType);
    }

    return available;
  }

  return {
    relationType: computed(() => relationType.value),
    relationConfig: computed(() => relationConfig.value),
    relationCategory: computed(() => relationCategory.value),
    accessType: computed(() => accessType.value),
    influenceStrength: computed(() => influenceStrength.value),
    flowType: computed(() => flowType.value),
    isValid: computed(() => isValid.value),
    validationError: computed(() => validationError.value),
    setRelationType,
    setAccessType,
    setInfluenceStrength,
    setFlowType,
    validateRelation,
    getAvailableRelationTypes,
  };
}

// Helpers exportés
export function getRelationsByCategory(category: RelationCategory): RelationType[] {
  return Object.values(RelationType).filter(
    type => RELATION_CONFIGS[type].category === category
  );
}

export function getAllRelationTypes(): RelationType[] {
  return Object.values(RelationType);
}

export function getRelationConfig(type: RelationType): RelationConfig {
  return RELATION_CONFIGS[type];
}
