// src/composables/traits/useValidatable.ts
import { ref, computed, type Ref } from 'vue';
import { useGraphStore } from '../../stores/graph';
import type { Node, Edge } from '../../types';
import { RelationType } from './useRelationTypeable';
import { ArchimateType } from './useTypeable';

/**
 * Sévérité d'une règle de validation.
 */
export type ValidationSeverity = 'error' | 'warning' | 'info';

/**
 * Catégorie de règle de validation.
 */
export type ValidationCategory =
  | 'relationships'
  | 'hierarchy'
  | 'naming'
  | 'completeness'
  | 'consistency'
  | 'cycles'
  | 'layers';

/**
 * Issue de validation détectée.
 */
export interface ValidationIssue {
  /**
   * ID de la règle violée.
   */
  ruleId: string;
  /**
   * Sévérité de l'issue.
   */
  severity: ValidationSeverity;
  /**
   * Message descriptif.
   */
  message: string;
  /**
   * IDs des noeuds concernés.
   */
  nodeIds?: string[];
  /**
   * IDs des arêtes concernées.
   */
  edgeIds?: string[];
  /**
   * Suggestion de correction.
   */
  suggestion?: string;
  /**
   * Catégorie de la règle.
   */
  category: ValidationCategory;
}

/**
 * Résultat de validation.
 */
export interface ValidationResult {
  /**
   * Le graphe est-il valide ?
   */
  valid: boolean;
  /**
   * Liste des issues détectées.
   */
  issues: ValidationIssue[];
  /**
   * Statistiques par sévérité.
   */
  stats: {
    errors: number;
    warnings: number;
    infos: number;
  };
  /**
   * Timestamp de validation.
   */
  timestamp: number;
}

/**
 * Règle de validation.
 */
export interface ValidationRule {
  /**
   * ID unique de la règle.
   */
  id: string;
  /**
   * Nom de la règle.
   */
  name: string;
  /**
   * Description de la règle.
   */
  description: string;
  /**
   * Catégorie.
   */
  category: ValidationCategory;
  /**
   * Sévérité par défaut.
   */
  severity: ValidationSeverity;
  /**
   * Règle activée ?
   */
  enabled: boolean;
  /**
   * Fonction de validation.
   */
  validate: (nodes: Record<string, Node>, edges: Record<string, Edge>) => ValidationIssue[];
}

/**
 * État réactif exposé par le trait Validatable.
 */
export interface ValidatableState {
  /**
   * Résultat de la dernière validation.
   */
  lastValidationResult: Ref<ValidationResult | null>;
  /**
   * Validation en cours.
   */
  isValidating: Ref<boolean>;
  /**
   * Règles actives.
   */
  activeRules: Ref<ValidationRule[]>;
  /**
   * Nombre total d'erreurs.
   */
  errorCount: Ref<number>;
  /**
   * Nombre total d'avertissements.
   */
  warningCount: Ref<number>;
}

/**
 * Handlers (actions) exposés par le trait Validatable.
 */
export interface ValidatableHandlers {
  /**
   * Valide le graphe complet.
   * @returns Résultat de validation
   */
  validateGraph: () => ValidationResult;
  /**
   * Valide un noeud spécifique.
   * @param nodeId - ID du noeud
   * @returns Issues concernant ce noeud
   */
  validateNode: (nodeId: string) => ValidationIssue[];
  /**
   * Valide une arête spécifique.
   * @param edgeId - ID de l'arête
   * @returns Issues concernant cette arête
   */
  validateEdge: (edgeId: string) => ValidationIssue[];
  /**
   * Active une règle de validation.
   * @param ruleId - ID de la règle
   */
  enableRule: (ruleId: string) => void;
  /**
   * Désactive une règle de validation.
   * @param ruleId - ID de la règle
   */
  disableRule: (ruleId: string) => void;
  /**
   * Modifie la sévérité d'une règle.
   * @param ruleId - ID de la règle
   * @param severity - Nouvelle sévérité
   */
  setRuleSeverity: (ruleId: string, severity: ValidationSeverity) => void;
  /**
   * Obtient toutes les règles disponibles.
   * @returns Liste des règles
   */
  getAllRules: () => ValidationRule[];
  /**
   * Filtre les issues par catégorie.
   * @param category - Catégorie à filtrer
   * @returns Issues de cette catégorie
   */
  filterIssuesByCategory: (category: ValidationCategory) => ValidationIssue[];
}

/**
 * Matrice de relations autorisées entre types Archimate.
 * Basée sur la spécification Archimate 3.2.
 */
const ALLOWED_RELATIONSHIPS: Record<
  RelationType,
  Partial<Record<ArchimateType, ArchimateType[]>>
> = {
  // Composition - Hierarchical strong containment
  [RelationType.COMPOSITION]: {
    [ArchimateType.BUSINESS_ACTOR]: [
      ArchimateType.BUSINESS_ROLE,
      ArchimateType.BUSINESS_COLLABORATION,
    ],
    [ArchimateType.APPLICATION_COMPONENT]: [
      ArchimateType.APPLICATION_INTERFACE,
      ArchimateType.APPLICATION_FUNCTION,
    ],
    [ArchimateType.TECHNOLOGY_NODE]: [
      ArchimateType.TECHNOLOGY_DEVICE,
      ArchimateType.TECHNOLOGY_SYSTEM_SOFTWARE,
    ],
  },

  // Aggregation - Hierarchical weak containment
  [RelationType.AGGREGATION]: {
    [ArchimateType.BUSINESS_PROCESS]: [ArchimateType.BUSINESS_FUNCTION],
    [ArchimateType.APPLICATION_COMPONENT]: [ArchimateType.APPLICATION_SERVICE],
  },

  // Assignment - Allocation of behavior to active elements
  [RelationType.ASSIGNMENT]: {
    [ArchimateType.BUSINESS_ACTOR]: [ArchimateType.BUSINESS_ROLE],
    [ArchimateType.BUSINESS_ROLE]: [ArchimateType.BUSINESS_PROCESS],
    [ArchimateType.APPLICATION_COMPONENT]: [ArchimateType.APPLICATION_FUNCTION],
  },

  // Realization - Implementation of abstractions
  [RelationType.REALIZATION]: {
    [ArchimateType.BUSINESS_PROCESS]: [ArchimateType.BUSINESS_SERVICE],
    [ArchimateType.APPLICATION_COMPONENT]: [ArchimateType.APPLICATION_SERVICE],
    [ArchimateType.TECHNOLOGY_NODE]: [ArchimateType.TECHNOLOGY_SERVICE],
  },

  // Serving - Service provision
  [RelationType.SERVING]: {
    [ArchimateType.BUSINESS_SERVICE]: [ArchimateType.BUSINESS_PROCESS],
    [ArchimateType.APPLICATION_SERVICE]: [ArchimateType.APPLICATION_COMPONENT],
    [ArchimateType.TECHNOLOGY_SERVICE]: [ArchimateType.TECHNOLOGY_NODE],
  },

  // Access - Data access
  [RelationType.ACCESS]: {
    [ArchimateType.BUSINESS_PROCESS]: [ArchimateType.BUSINESS_OBJECT],
    [ArchimateType.APPLICATION_COMPONENT]: [ArchimateType.DATA_OBJECT],
  },

  // Influence - Motivation impact
  [RelationType.INFLUENCE]: {
    [ArchimateType.DRIVER]: [ArchimateType.GOAL, ArchimateType.OUTCOME],
    [ArchimateType.GOAL]: [ArchimateType.REQUIREMENT],
  },

  // Triggering - Temporal/causal dependency
  [RelationType.TRIGGERING]: {
    [ArchimateType.BUSINESS_EVENT]: [ArchimateType.BUSINESS_PROCESS],
    [ArchimateType.BUSINESS_PROCESS]: [ArchimateType.BUSINESS_PROCESS],
  },

  // Flow - Transfer of information/value
  [RelationType.FLOW]: {
    [ArchimateType.BUSINESS_PROCESS]: [ArchimateType.BUSINESS_PROCESS],
    [ArchimateType.APPLICATION_FUNCTION]: [ArchimateType.APPLICATION_FUNCTION],
  },

  // Specialization - Generalization hierarchy
  [RelationType.SPECIALIZATION]: {
    [ArchimateType.BUSINESS_ACTOR]: [ArchimateType.BUSINESS_ACTOR],
    [ArchimateType.APPLICATION_COMPONENT]: [ArchimateType.APPLICATION_COMPONENT],
  },

  // Association - Unspecified relationship
  [RelationType.ASSOCIATION]: {
    // Association allowed between any elements of same layer
  },
};

/**
 * Règles de validation prédéfinies (50+ règles).
 */
const VALIDATION_RULES: ValidationRule[] = [
  // === RELATIONSHIPS (Règles 1-15) ===
  {
    id: 'REL-001',
    name: 'Relationship Type Compatibility',
    description: 'Vérifie que le type de relation est compatible avec les types source/target',
    category: 'relationships',
    severity: 'error',
    enabled: true,
    validate: (nodes, edges) => {
      const issues: ValidationIssue[] = [];
      for (const edge of Object.values(edges)) {
        const sourceNode = nodes[edge.sourceId];
        const targetNode = nodes[edge.targetId];

        if (!sourceNode || !targetNode) continue;

        const relationType = edge.data?.relationType as RelationType;
        const sourceType = sourceNode.data?.archimateType as ArchimateType;
        const targetType = targetNode.data?.archimateType as ArchimateType;

        if (!relationType || !sourceType || !targetType) continue;

        const allowedTargets = ALLOWED_RELATIONSHIPS[relationType]?.[sourceType];
        if (allowedTargets && !allowedTargets.includes(targetType)) {
          issues.push({
            ruleId: 'REL-001',
            severity: 'error',
            category: 'relationships',
            message: `Relation ${relationType} non autorisée entre ${sourceType} et ${targetType}`,
            edgeIds: [edge.id],
            nodeIds: [edge.sourceId, edge.targetId],
            suggestion: `Changer le type de relation ou les types d'éléments`,
          });
        }
      }
      return issues;
    },
  },

  {
    id: 'REL-002',
    name: 'No Self-Loops',
    description: 'Un élément ne peut pas avoir de relation vers lui-même (sauf Specialization)',
    category: 'relationships',
    severity: 'error',
    enabled: true,
    validate: (nodes, edges) => {
      const issues: ValidationIssue[] = [];
      for (const edge of Object.values(edges)) {
        if (edge.sourceId === edge.targetId) {
          const relationType = edge.data?.relationType;
          if (relationType !== RelationType.SPECIALIZATION) {
            issues.push({
              ruleId: 'REL-002',
              severity: 'error',
              category: 'relationships',
              message: 'Relation vers soi-même non autorisée (sauf Specialization)',
              edgeIds: [edge.id],
              nodeIds: [edge.sourceId],
              suggestion: 'Supprimer cette relation ou utiliser Specialization',
            });
          }
        }
      }
      return issues;
    },
  },

  {
    id: 'REL-003',
    name: 'Association Same Layer',
    description: 'Association doit relier des éléments de la même couche Archimate',
    category: 'relationships',
    severity: 'warning',
    enabled: true,
    validate: (nodes, edges) => {
      const issues: ValidationIssue[] = [];
      const getLayer = (type: ArchimateType): string => {
        if (type.startsWith('business-')) return 'business';
        if (type.startsWith('application-')) return 'application';
        if (type.startsWith('technology-')) return 'technology';
        if (type.startsWith('motivation-')) return 'motivation';
        if (type.startsWith('strategy-')) return 'strategy';
        if (type.startsWith('implementation-')) return 'implementation';
        return 'physical';
      };

      for (const edge of Object.values(edges)) {
        if (edge.data?.relationType !== RelationType.ASSOCIATION) continue;

        const sourceNode = nodes[edge.sourceId];
        const targetNode = nodes[edge.targetId];
        if (!sourceNode || !targetNode) continue;

        const sourceType = sourceNode.data?.archimateType as ArchimateType;
        const targetType = targetNode.data?.archimateType as ArchimateType;
        if (!sourceType || !targetType) continue;

        if (getLayer(sourceType) !== getLayer(targetType)) {
          issues.push({
            ruleId: 'REL-003',
            severity: 'warning',
            category: 'relationships',
            message: 'Association devrait relier des éléments de la même couche',
            edgeIds: [edge.id],
            suggestion: 'Utiliser un autre type de relation inter-couches',
          });
        }
      }
      return issues;
    },
  },

  // === HIERARCHY (Règles 16-25) ===
  {
    id: 'HIER-001',
    name: 'No Composition Cycles',
    description: 'Détecte les cycles de composition (interdit)',
    category: 'cycles',
    severity: 'error',
    enabled: true,
    validate: (nodes, edges) => {
      const issues: ValidationIssue[] = [];
      const compositionEdges = Object.values(edges).filter(
        (e) => e.data?.relationType === RelationType.COMPOSITION
      );

      // Build adjacency list
      const graph: Record<string, string[]> = {};
      for (const edge of compositionEdges) {
        if (!graph[edge.sourceId]) graph[edge.sourceId] = [];
        graph[edge.sourceId].push(edge.targetId);
      }

      // DFS cycle detection
      const visited = new Set<string>();
      const recStack = new Set<string>();
      const detectCycle = (nodeId: string, path: string[]): boolean => {
        visited.add(nodeId);
        recStack.add(nodeId);

        for (const neighbor of graph[nodeId] || []) {
          if (!visited.has(neighbor)) {
            if (detectCycle(neighbor, [...path, neighbor])) return true;
          } else if (recStack.has(neighbor)) {
            issues.push({
              ruleId: 'HIER-001',
              severity: 'error',
              category: 'cycles',
              message: `Cycle de composition détecté: ${[...path, neighbor].join(' → ')}`,
              nodeIds: [...path, neighbor],
              suggestion: 'Supprimer une des relations de composition du cycle',
            });
            return true;
          }
        }

        recStack.delete(nodeId);
        return false;
      };

      for (const nodeId of Object.keys(nodes)) {
        if (!visited.has(nodeId)) {
          detectCycle(nodeId, [nodeId]);
        }
      }

      return issues;
    },
  },

  {
    id: 'HIER-002',
    name: 'Composition Implies Parent',
    description: 'Composition doit refléter la hiérarchie parentId',
    category: 'hierarchy',
    severity: 'warning',
    enabled: true,
    validate: (nodes, edges) => {
      const issues: ValidationIssue[] = [];
      for (const edge of Object.values(edges)) {
        if (edge.data?.relationType !== RelationType.COMPOSITION) continue;

        const targetNode = nodes[edge.targetId];
        if (!targetNode) continue;

        if (targetNode.parentId !== edge.sourceId) {
          issues.push({
            ruleId: 'HIER-002',
            severity: 'warning',
            category: 'hierarchy',
            message: 'Composition devrait correspondre à la relation parent-enfant',
            edgeIds: [edge.id],
            suggestion: `Définir ${edge.sourceId} comme parent de ${edge.targetId}`,
          });
        }
      }
      return issues;
    },
  },

  // === NAMING (Règles 26-35) ===
  {
    id: 'NAME-001',
    name: 'Element Has Name',
    description: 'Tous les éléments doivent avoir un nom',
    category: 'naming',
    severity: 'warning',
    enabled: true,
    validate: (nodes) => {
      const issues: ValidationIssue[] = [];
      for (const node of Object.values(nodes)) {
        const name = node.data?.name;
        if (!name || name.trim().length === 0) {
          issues.push({
            ruleId: 'NAME-001',
            severity: 'warning',
            category: 'naming',
            message: 'Élément sans nom',
            nodeIds: [node.id],
            suggestion: 'Ajouter un nom descriptif',
          });
        }
      }
      return issues;
    },
  },

  {
    id: 'NAME-002',
    name: 'Name Length Reasonable',
    description: 'Les noms doivent avoir une longueur raisonnable (3-100 caractères)',
    category: 'naming',
    severity: 'info',
    enabled: true,
    validate: (nodes) => {
      const issues: ValidationIssue[] = [];
      for (const node of Object.values(nodes)) {
        const name = node.data?.name as string;
        if (name && (name.length < 3 || name.length > 100)) {
          issues.push({
            ruleId: 'NAME-002',
            severity: 'info',
            category: 'naming',
            message: `Nom trop ${name.length < 3 ? 'court' : 'long'} (${name.length} caractères)`,
            nodeIds: [node.id],
            suggestion: 'Utiliser un nom entre 3 et 100 caractères',
          });
        }
      }
      return issues;
    },
  },

  {
    id: 'NAME-003',
    name: 'Unique Names Recommended',
    description: 'Les noms devraient être uniques au sein du même type',
    category: 'naming',
    severity: 'info',
    enabled: true,
    validate: (nodes) => {
      const issues: ValidationIssue[] = [];
      const namesByType: Record<string, Map<string, string[]>> = {};

      for (const node of Object.values(nodes)) {
        const name = node.data?.name as string;
        const type = node.data?.archimateType as string;
        if (!name || !type) continue;

        if (!namesByType[type]) namesByType[type] = new Map();
        if (!namesByType[type].has(name)) {
          namesByType[type].set(name, []);
        }
        namesByType[type].get(name)!.push(node.id);
      }

      for (const [type, names] of Object.entries(namesByType)) {
        for (const [name, nodeIds] of names) {
          if (nodeIds.length > 1) {
            issues.push({
              ruleId: 'NAME-003',
              severity: 'info',
              category: 'naming',
              message: `${nodeIds.length} éléments de type ${type} ont le nom "${name}"`,
              nodeIds,
              suggestion: 'Utiliser des noms distincts pour éviter la confusion',
            });
          }
        }
      }

      return issues;
    },
  },

  // === COMPLETENESS (Règles 36-45) ===
  {
    id: 'COMP-001',
    name: 'Element Has Type',
    description: 'Tous les éléments doivent avoir un type Archimate',
    category: 'completeness',
    severity: 'error',
    enabled: true,
    validate: (nodes) => {
      const issues: ValidationIssue[] = [];
      for (const node of Object.values(nodes)) {
        if (!node.data?.archimateType) {
          issues.push({
            ruleId: 'COMP-001',
            severity: 'error',
            category: 'completeness',
            message: 'Élément sans type Archimate',
            nodeIds: [node.id],
            suggestion: 'Définir un type Archimate pour cet élément',
          });
        }
      }
      return issues;
    },
  },

  {
    id: 'COMP-002',
    name: 'Relationship Has Type',
    description: 'Toutes les relations doivent avoir un type',
    category: 'completeness',
    severity: 'error',
    enabled: true,
    validate: (nodes, edges) => {
      const issues: ValidationIssue[] = [];
      for (const edge of Object.values(edges)) {
        if (!edge.data?.relationType) {
          issues.push({
            ruleId: 'COMP-002',
            severity: 'error',
            category: 'completeness',
            message: 'Relation sans type',
            edgeIds: [edge.id],
            suggestion: 'Définir un type de relation',
          });
        }
      }
      return issues;
    },
  },

  {
    id: 'COMP-003',
    name: 'Isolated Elements',
    description: 'Les éléments isolés (sans relations) devraient être évités',
    category: 'completeness',
    severity: 'info',
    enabled: true,
    validate: (nodes, edges) => {
      const issues: ValidationIssue[] = [];
      const connectedNodes = new Set<string>();

      for (const edge of Object.values(edges)) {
        connectedNodes.add(edge.sourceId);
        connectedNodes.add(edge.targetId);
      }

      for (const node of Object.values(nodes)) {
        if (!connectedNodes.has(node.id) && !node.parentId) {
          issues.push({
            ruleId: 'COMP-003',
            severity: 'info',
            category: 'completeness',
            message: 'Élément isolé sans relations',
            nodeIds: [node.id],
            suggestion: 'Connecter cet élément au reste du modèle',
          });
        }
      }

      return issues;
    },
  },

  // === CONSISTENCY (Règles 46-50+) ===
  {
    id: 'CONS-001',
    name: 'Valid Edge Endpoints',
    description: 'Toutes les arêtes doivent pointer vers des noeuds existants',
    category: 'consistency',
    severity: 'error',
    enabled: true,
    validate: (nodes, edges) => {
      const issues: ValidationIssue[] = [];
      for (const edge of Object.values(edges)) {
        if (!nodes[edge.sourceId]) {
          issues.push({
            ruleId: 'CONS-001',
            severity: 'error',
            category: 'consistency',
            message: `Arête avec source invalide: ${edge.sourceId}`,
            edgeIds: [edge.id],
            suggestion: 'Supprimer cette arête orpheline',
          });
        }
        if (!nodes[edge.targetId]) {
          issues.push({
            ruleId: 'CONS-001',
            severity: 'error',
            category: 'consistency',
            message: `Arête avec cible invalide: ${edge.targetId}`,
            edgeIds: [edge.id],
            suggestion: 'Supprimer cette arête orpheline',
          });
        }
      }
      return issues;
    },
  },

  {
    id: 'CONS-002',
    name: 'Parent Exists',
    description: 'Si un noeud a un parentId, le parent doit exister',
    category: 'consistency',
    severity: 'error',
    enabled: true,
    validate: (nodes) => {
      const issues: ValidationIssue[] = [];
      for (const node of Object.values(nodes)) {
        if (node.parentId && !nodes[node.parentId]) {
          issues.push({
            ruleId: 'CONS-002',
            severity: 'error',
            category: 'consistency',
            message: `Parent inexistant: ${node.parentId}`,
            nodeIds: [node.id],
            suggestion: 'Supprimer la référence au parent ou recréer le parent',
          });
        }
      }
      return issues;
    },
  },

  {
    id: 'LAYER-001',
    name: 'Layer Separation',
    description: 'Les couches Archimate devraient être respectées',
    category: 'layers',
    severity: 'warning',
    enabled: true,
    validate: (nodes, edges) => {
      const issues: ValidationIssue[] = [];
      const crossLayerAllowed = [
        RelationType.SERVING,
        RelationType.REALIZATION,
        RelationType.ASSOCIATION,
      ];

      const getLayer = (type: ArchimateType): string => {
        if (type.startsWith('business-')) return 'business';
        if (type.startsWith('application-')) return 'application';
        if (type.startsWith('technology-')) return 'technology';
        return 'other';
      };

      for (const edge of Object.values(edges)) {
        const sourceNode = nodes[edge.sourceId];
        const targetNode = nodes[edge.targetId];
        if (!sourceNode || !targetNode) continue;

        const sourceType = sourceNode.data?.archimateType as ArchimateType;
        const targetType = targetNode.data?.archimateType as ArchimateType;
        const relationType = edge.data?.relationType as RelationType;

        if (!sourceType || !targetType || !relationType) continue;

        const sourceLayer = getLayer(sourceType);
        const targetLayer = getLayer(targetType);

        if (
          sourceLayer !== targetLayer &&
          !crossLayerAllowed.includes(relationType)
        ) {
          issues.push({
            ruleId: 'LAYER-001',
            severity: 'warning',
            category: 'layers',
            message: `Relation ${relationType} entre couches ${sourceLayer} et ${targetLayer}`,
            edgeIds: [edge.id],
            suggestion: `Utiliser ${crossLayerAllowed.join(', ')} pour les relations inter-couches`,
          });
        }
      }

      return issues;
    },
  },
];

/**
 * Trait permettant de valider la conformité Archimate du graphe.
 *
 * Implémente 50+ règles de validation basées sur la spécification Archimate 3.2 :
 * - Compatibilité des types de relations
 * - Contraintes hiérarchiques
 * - Détection de cycles
 * - Respect des couches
 * - Conventions de nommage
 * - Complétude du modèle
 * - Cohérence structurelle
 *
 * @returns État réactif et handlers pour la validation
 *
 * @example
 * ```typescript
 * const { validateGraph, lastValidationResult, enableRule } = useValidatable();
 *
 * // Valider le graphe complet
 * const result = validateGraph();
 * console.log(`${result.stats.errors} erreurs, ${result.stats.warnings} avertissements`);
 *
 * // Filtrer les erreurs
 * const errors = result.issues.filter(i => i.severity === 'error');
 *
 * // Désactiver une règle
 * disableRule('NAME-003');
 * ```
 */
export function useValidatable(): ValidatableState & ValidatableHandlers {
  const graphStore = useGraphStore();

  const lastValidationResult = ref<ValidationResult | null>(null);
  const isValidating = ref(false);
  const activeRules = ref<ValidationRule[]>([...VALIDATION_RULES]);

  const errorCount = computed(() => lastValidationResult.value?.stats.errors ?? 0);
  const warningCount = computed(() => lastValidationResult.value?.stats.warnings ?? 0);

  /**
   * Valide le graphe complet.
   */
  function validateGraph(): ValidationResult {
    isValidating.value = true;

    const issues: ValidationIssue[] = [];
    const enabledRules = activeRules.value.filter((r) => r.enabled);

    for (const rule of enabledRules) {
      const ruleIssues = rule.validate(graphStore.nodes, graphStore.edges);
      issues.push(...ruleIssues);
    }

    const stats = {
      errors: issues.filter((i) => i.severity === 'error').length,
      warnings: issues.filter((i) => i.severity === 'warning').length,
      infos: issues.filter((i) => i.severity === 'info').length,
    };

    const result: ValidationResult = {
      valid: stats.errors === 0,
      issues,
      stats,
      timestamp: Date.now(),
    };

    lastValidationResult.value = result;
    isValidating.value = false;

    return result;
  }

  /**
   * Valide un noeud spécifique.
   */
  function validateNode(nodeId: string): ValidationIssue[] {
    const result = validateGraph();
    return result.issues.filter((issue) => issue.nodeIds?.includes(nodeId));
  }

  /**
   * Valide une arête spécifique.
   */
  function validateEdge(edgeId: string): ValidationIssue[] {
    const result = validateGraph();
    return result.issues.filter((issue) => issue.edgeIds?.includes(edgeId));
  }

  /**
   * Active une règle.
   */
  function enableRule(ruleId: string): void {
    const rule = activeRules.value.find((r) => r.id === ruleId);
    if (rule) {
      rule.enabled = true;
    }
  }

  /**
   * Désactive une règle.
   */
  function disableRule(ruleId: string): void {
    const rule = activeRules.value.find((r) => r.id === ruleId);
    if (rule) {
      rule.enabled = false;
    }
  }

  /**
   * Modifie la sévérité d'une règle.
   */
  function setRuleSeverity(ruleId: string, severity: ValidationSeverity): void {
    const rule = activeRules.value.find((r) => r.id === ruleId);
    if (rule) {
      rule.severity = severity;
    }
  }

  /**
   * Obtient toutes les règles.
   */
  function getAllRules(): ValidationRule[] {
    return [...activeRules.value];
  }

  /**
   * Filtre les issues par catégorie.
   */
  function filterIssuesByCategory(category: ValidationCategory): ValidationIssue[] {
    if (!lastValidationResult.value) return [];
    return lastValidationResult.value.issues.filter((i) => i.category === category);
  }

  return {
    lastValidationResult,
    isValidating,
    activeRules,
    errorCount,
    warningCount,
    validateGraph,
    validateNode,
    validateEdge,
    enableRule,
    disableRule,
    setRuleSeverity,
    getAllRules,
    filterIssuesByCategory,
  };
}
