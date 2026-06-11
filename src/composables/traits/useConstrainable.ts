// src/composables/traits/useConstrainable.ts
import { ref, type Ref } from 'vue';
import { useGraphStore } from '../../stores/graph';
import type { Node, Edge } from '../../types';
import { ArchimateType } from './useTypeable';
import { RelationType } from './useRelationTypeable';

/**
 * Type de contrainte architecturale.
 */
export type ConstraintType = 'forbidden' | 'required' | 'recommended';

/**
 * Sévérité d'une violation de contrainte.
 */
export type ConstraintSeverity = 'critical' | 'major' | 'minor' | 'info';

/**
 * Pattern de graphe à détecter.
 */
export interface GraphPattern {
  /**
   * ID unique du pattern.
   */
  id: string;
  /**
   * Nom du pattern.
   */
  name: string;
  /**
   * Description.
   */
  description: string;
  /**
   * Fonction de détection du pattern.
   * @returns IDs des noeuds/arêtes formant le pattern
   */
  detect: (
    nodes: Record<string, Node>,
    edges: Record<string, Edge>
  ) => Array<{ nodeIds: string[]; edgeIds: string[] }>;
}

/**
 * Contrainte architecturale.
 */
export interface ArchitecturalConstraint {
  /**
   * ID unique de la contrainte.
   */
  id: string;
  /**
   * Nom de la contrainte.
   */
  name: string;
  /**
   * Description.
   */
  description: string;
  /**
   * Type de contrainte.
   */
  type: ConstraintType;
  /**
   * Sévérité si violée.
   */
  severity: ConstraintSeverity;
  /**
   * Pattern à détecter.
   */
  pattern: GraphPattern;
  /**
   * Message en cas de violation.
   */
  message: string;
  /**
   * Suggestion de correction.
   */
  suggestion?: string;
  /**
   * Contrainte activée ?
   */
  enabled: boolean;
}

/**
 * Violation de contrainte détectée.
 */
export interface ConstraintViolation {
  /**
   * ID de la contrainte violée.
   */
  constraintId: string;
  /**
   * Nom de la contrainte.
   */
  constraintName: string;
  /**
   * Type de contrainte.
   */
  type: ConstraintType;
  /**
   * Sévérité.
   */
  severity: ConstraintSeverity;
  /**
   * Message.
   */
  message: string;
  /**
   * IDs des noeuds impliqués.
   */
  nodeIds: string[];
  /**
   * IDs des arêtes impliquées.
   */
  edgeIds: string[];
  /**
   * Suggestion de correction.
   */
  suggestion?: string;
}

/**
 * Résultat d'analyse de contraintes.
 */
export interface ConstraintAnalysisResult {
  /**
   * Violations détectées.
   */
  violations: ConstraintViolation[];
  /**
   * Patterns recommandés détectés.
   */
  goodPatterns: Array<{
    constraintId: string;
    name: string;
    nodeIds: string[];
    edgeIds: string[];
  }>;
  /**
   * Statistiques.
   */
  stats: {
    critical: number;
    major: number;
    minor: number;
    info: number;
  };
  /**
   * Timestamp.
   */
  timestamp: number;
}

/**
 * Métrique de qualité architecturale.
 */
export interface ArchitecturalMetric {
  /**
   * Nom de la métrique.
   */
  name: string;
  /**
   * Valeur calculée.
   */
  value: number;
  /**
   * Valeur cible recommandée.
   */
  target?: number;
  /**
   * Unité.
   */
  unit?: string;
  /**
   * Description.
   */
  description: string;
}

/**
 * État réactif exposé par le trait Constrainable.
 */
export interface ConstrainableState {
  /**
   * Résultat de la dernière analyse.
   */
  lastAnalysisResult: Ref<ConstraintAnalysisResult | null>;
  /**
   * Analyse en cours.
   */
  isAnalyzing: Ref<boolean>;
  /**
   * Contraintes actives.
   */
  activeConstraints: Ref<ArchitecturalConstraint[]>;
}

/**
 * Handlers (actions) exposés par le trait Constrainable.
 */
export interface ConstrainableHandlers {
  /**
   * Analyse le graphe pour détecter les violations de contraintes.
   * @returns Résultat d'analyse
   */
  analyzeConstraints: () => ConstraintAnalysisResult;
  /**
   * Active une contrainte.
   * @param constraintId - ID de la contrainte
   */
  enableConstraint: (constraintId: string) => void;
  /**
   * Désactive une contrainte.
   * @param constraintId - ID de la contrainte
   */
  disableConstraint: (constraintId: string) => void;
  /**
   * Ajoute une contrainte personnalisée.
   * @param constraint - Contrainte à ajouter
   */
  addCustomConstraint: (constraint: ArchitecturalConstraint) => void;
  /**
   * Supprime une contrainte personnalisée.
   * @param constraintId - ID de la contrainte
   */
  removeCustomConstraint: (constraintId: string) => void;
  /**
   * Calcule les métriques de qualité architecturale.
   * @returns Métriques calculées
   */
  calculateMetrics: () => ArchitecturalMetric[];
  /**
   * Obtient toutes les contraintes disponibles.
   * @returns Liste des contraintes
   */
  getAllConstraints: () => ArchitecturalConstraint[];
}

/**
 * Patterns prédéfinis.
 */
const PATTERNS: GraphPattern[] = [
  {
    id: 'GOD_OBJECT',
    name: 'God Object',
    description: 'Élément avec trop de relations (> 15)',
    detect: (_nodes, edges) => {
      const matches: Array<{ nodeIds: string[]; edgeIds: string[] }> = [];
      const relationCounts = new Map<string, string[]>();

      // Compter les relations par noeud
      for (const edge of Object.values(edges)) {
        if (!relationCounts.has(edge.sourceId)) {
          relationCounts.set(edge.sourceId, []);
        }
        if (!relationCounts.has(edge.targetId)) {
          relationCounts.set(edge.targetId, []);
        }
        relationCounts.get(edge.sourceId)!.push(edge.id);
        relationCounts.get(edge.targetId)!.push(edge.id);
      }

      // Détecter les noeuds avec > 15 relations
      for (const [nodeId, edgeIds] of relationCounts) {
        if (edgeIds.length > 15) {
          matches.push({ nodeIds: [nodeId], edgeIds });
        }
      }

      return matches;
    },
  },

  {
    id: 'CIRCULAR_DEPENDENCY',
    name: 'Circular Dependency',
    description: 'Cycle de dépendances entre composants',
    detect: (nodes, edges) => {
      const matches: Array<{ nodeIds: string[]; edgeIds: string[] }> = [];
      const dependencyEdges = Object.values(edges).filter(
        (e) =>
          e.data?.relationType === RelationType.Serving ||
          e.data?.relationType === RelationType.Realization
      );

      // Build adjacency list
      const graph: Record<string, Array<{ target: string; edgeId: string }>> = {};
      for (const edge of dependencyEdges) {
        if (!graph[edge.sourceId]) graph[edge.sourceId] = [];
        graph[edge.sourceId].push({ target: edge.targetId, edgeId: edge.id });
      }

      // DFS pour détecter cycles
      const visited = new Set<string>();
      const recStack = new Set<string>();
      const path: Array<{ nodeId: string; edgeId: string }> = [];

      const detectCycle = (nodeId: string): boolean => {
        visited.add(nodeId);
        recStack.add(nodeId);

        for (const { target, edgeId } of graph[nodeId] || []) {
          path.push({ nodeId: target, edgeId });

          if (!visited.has(target)) {
            if (detectCycle(target)) return true;
          } else if (recStack.has(target)) {
            // Cycle détecté
            const cycleStart = path.findIndex((p) => p.nodeId === target);
            const cycle = path.slice(cycleStart);
            matches.push({
              nodeIds: cycle.map((p) => p.nodeId),
              edgeIds: cycle.map((p) => p.edgeId),
            });
            return true;
          }

          path.pop();
        }

        recStack.delete(nodeId);
        return false;
      };

      for (const nodeId of Object.keys(nodes)) {
        if (!visited.has(nodeId)) {
          detectCycle(nodeId);
        }
      }

      return matches;
    },
  },

  {
    id: 'LAYERING_VIOLATION',
    name: 'Layering Violation',
    description: 'Dépendance inverse entre couches (ex: Business → Technology)',
    detect: (nodes, edges) => {
      const matches: Array<{ nodeIds: string[]; edgeIds: string[] }> = [];
      const getLayerIndex = (type: ArchimateType): number => {
        if (type.startsWith('technology-')) return 0;
        if (type.startsWith('application-')) return 1;
        if (type.startsWith('business-')) return 2;
        return -1;
      };

      for (const edge of Object.values(edges)) {
        const sourceNode = nodes[edge.sourceId];
        const targetNode = nodes[edge.targetId];
        if (!sourceNode || !targetNode) continue;

        const sourceType = sourceNode.data?.archimateType as ArchimateType;
        const targetType = targetNode.data?.archimateType as ArchimateType;
        if (!sourceType || !targetType) continue;

        const sourceLayer = getLayerIndex(sourceType);
        const targetLayer = getLayerIndex(targetType);

        // Violation si couche supérieure dépend de couche inférieure
        if (
          sourceLayer !== -1 &&
          targetLayer !== -1 &&
          sourceLayer > targetLayer &&
          edge.data?.relationType === RelationType.Serving
        ) {
          matches.push({
            nodeIds: [edge.sourceId, edge.targetId],
            edgeIds: [edge.id],
          });
        }
      }

      return matches;
    },
  },

  {
    id: 'DEAD_END',
    name: 'Dead End',
    description: 'Composant sans sortie (pas de relations sortantes)',
    detect: (nodes, edges) => {
      const matches: Array<{ nodeIds: string[]; edgeIds: string[] }> = [];
      const hasOutgoing = new Set<string>();

      for (const edge of Object.values(edges)) {
        hasOutgoing.add(edge.sourceId);
      }

      for (const node of Object.values(nodes)) {
        const type = node.data?.archimateType as ArchimateType;
        // Ignorer les types qui n'ont pas besoin de relations sortantes
        if (
          !hasOutgoing.has(node.id) &&
          type &&
          !type.includes('object') &&
          !type.includes('event')
        ) {
          matches.push({ nodeIds: [node.id], edgeIds: [] });
        }
      }

      return matches;
    },
  },

  {
    id: 'EXCESSIVE_NESTING',
    name: 'Excessive Nesting',
    description: 'Hiérarchie trop profonde (> 5 niveaux)',
    detect: (nodes) => {
      const matches: Array<{ nodeIds: string[]; edgeIds: string[] }> = [];

      const getDepth = (nodeId: string, visited = new Set<string>()): number => {
        if (visited.has(nodeId)) return 0; // Éviter les cycles
        visited.add(nodeId);

        const node = nodes[nodeId];
        if (!node || !node.parentId) return 1;

        return 1 + getDepth(node.parentId, visited);
      };

      for (const node of Object.values(nodes)) {
        const depth = getDepth(node.id);
        if (depth > 5) {
          // Trouver le chemin complet
          const path: string[] = [];
          let current: Node | undefined = node;
          while (current && path.length < 10) {
            path.unshift(current.id);
            current = current.parentId ? nodes[current.parentId] : undefined;
          }
          matches.push({ nodeIds: path, edgeIds: [] });
        }
      }

      return matches;
    },
  },

  {
    id: 'PROPER_LAYERING',
    name: 'Proper Layering (Good Pattern)',
    description: 'Séparation correcte des couches Archimate',
    detect: (nodes, edges) => {
      const matches: Array<{ nodeIds: string[]; edgeIds: string[] }> = [];
      const layers = {
        business: new Set<string>(),
        application: new Set<string>(),
        technology: new Set<string>(),
      };

      // Classifier les noeuds par couche
      for (const node of Object.values(nodes)) {
        const type = node.data?.archimateType as ArchimateType;
        if (!type) continue;

        if (type.startsWith('business-')) layers.business.add(node.id);
        if (type.startsWith('application-')) layers.application.add(node.id);
        if (type.startsWith('technology-')) layers.technology.add(node.id);
      }

      // Si toutes les couches sont représentées avec des relations appropriées
      if (
        layers.business.size > 0 &&
        layers.application.size > 0 &&
        layers.technology.size > 0
      ) {
        const allNodeIds = [
          ...layers.business,
          ...layers.application,
          ...layers.technology,
        ];
        const allEdgeIds = Object.values(edges)
          .filter(
            (e) =>
              allNodeIds.includes(e.sourceId) && allNodeIds.includes(e.targetId)
          )
          .map((e) => e.id);

        matches.push({ nodeIds: allNodeIds, edgeIds: allEdgeIds });
      }

      return matches;
    },
  },
];

/**
 * Contraintes prédéfinies.
 */
const PREDEFINED_CONSTRAINTS: ArchitecturalConstraint[] = [
  {
    id: 'CONST-001',
    name: 'Avoid God Objects',
    description: 'Éviter les composants avec trop de responsabilités',
    type: 'forbidden',
    severity: 'major',
    pattern: PATTERNS[0], // GOD_OBJECT
    message: 'Composant God Object détecté',
    suggestion:
      'Décomposer en composants plus petits avec responsabilités distinctes',
    enabled: true,
  },

  {
    id: 'CONST-002',
    name: 'No Circular Dependencies',
    description: 'Interdire les cycles de dépendances',
    type: 'forbidden',
    severity: 'critical',
    pattern: PATTERNS[1], // CIRCULAR_DEPENDENCY
    message: 'Dépendance circulaire détectée',
    suggestion: 'Introduire une abstraction ou inverser une dépendance',
    enabled: true,
  },

  {
    id: 'CONST-003',
    name: 'Respect Layer Order',
    description: 'Les couches supérieures ne doivent pas dépendre des inférieures',
    type: 'forbidden',
    severity: 'critical',
    pattern: PATTERNS[2], // LAYERING_VIOLATION
    message: 'Violation de séparation des couches',
    suggestion: 'Inverser la dépendance ou utiliser une interface',
    enabled: true,
  },

  {
    id: 'CONST-004',
    name: 'Avoid Dead Ends',
    description: 'Les composants doivent avoir des relations sortantes',
    type: 'recommended',
    severity: 'minor',
    pattern: PATTERNS[3], // DEAD_END
    message: 'Composant sans relations sortantes',
    suggestion: 'Vérifier que le composant a un rôle dans l\'architecture',
    enabled: true,
  },

  {
    id: 'CONST-005',
    name: 'Limit Hierarchy Depth',
    description: 'Limiter la profondeur de la hiérarchie',
    type: 'recommended',
    severity: 'minor',
    pattern: PATTERNS[4], // EXCESSIVE_NESTING
    message: 'Hiérarchie trop profonde',
    suggestion: 'Aplatir la hiérarchie ou introduire des niveaux intermédiaires',
    enabled: true,
  },

  {
    id: 'CONST-006',
    name: 'Proper Layer Separation',
    description: 'Encourager la séparation en couches',
    type: 'recommended',
    severity: 'info',
    pattern: PATTERNS[5], // PROPER_LAYERING
    message: 'Bonne séparation des couches Archimate',
    suggestion: 'Continuer à maintenir cette organisation',
    enabled: true,
  },
];

/**
 * Trait permettant de gérer les contraintes architecturales et détecter les anti-patterns.
 *
 * Détecte automatiquement :
 * - **God Objects** : Composants avec trop de responsabilités
 * - **Circular Dependencies** : Cycles de dépendances
 * - **Layering Violations** : Non-respect de la séparation des couches
 * - **Dead Ends** : Composants isolés sans rôle clair
 * - **Excessive Nesting** : Hiérarchies trop profondes
 *
 * Calcule des métriques de qualité :
 * - Couplage moyen
 * - Profondeur maximale
 * - Couverture des couches
 * - Ratio de conformité
 *
 * @returns État réactif et handlers pour les contraintes
 *
 * @example
 * ```typescript
 * const { analyzeConstraints, calculateMetrics } = useConstrainable();
 *
 * // Analyser les contraintes
 * const result = analyzeConstraints();
 * console.log(`${result.violations.length} violations détectées`);
 *
 * // Afficher les métriques
 * const metrics = calculateMetrics();
 * metrics.forEach(m => console.log(`${m.name}: ${m.value} ${m.unit || ''}`));
 * ```
 */
export function useConstrainable(): ConstrainableState & ConstrainableHandlers {
  const graphStore = useGraphStore();

  const lastAnalysisResult = ref<ConstraintAnalysisResult | null>(null);
  const isAnalyzing = ref(false);
  const activeConstraints = ref<ArchitecturalConstraint[]>([
    ...PREDEFINED_CONSTRAINTS,
  ]);

  /**
   * Analyse les contraintes.
   */
  function analyzeConstraints(): ConstraintAnalysisResult {
    isAnalyzing.value = true;

    const violations: ConstraintViolation[] = [];
    const goodPatterns: Array<{
      constraintId: string;
      name: string;
      nodeIds: string[];
      edgeIds: string[];
    }> = [];

    const enabledConstraints = activeConstraints.value.filter((c) => c.enabled);

    for (const constraint of enabledConstraints) {
      const matches = constraint.pattern.detect(
        graphStore.nodes,
        graphStore.edges
      );

      if (matches.length > 0) {
        if (constraint.type === 'forbidden') {
          // Violation
          for (const match of matches) {
            violations.push({
              constraintId: constraint.id,
              constraintName: constraint.name,
              type: constraint.type,
              severity: constraint.severity,
              message: constraint.message,
              nodeIds: match.nodeIds,
              edgeIds: match.edgeIds,
              suggestion: constraint.suggestion,
            });
          }
        } else if (constraint.type === 'recommended') {
          // Good pattern détecté
          for (const match of matches) {
            goodPatterns.push({
              constraintId: constraint.id,
              name: constraint.name,
              nodeIds: match.nodeIds,
              edgeIds: match.edgeIds,
            });
          }
        }
      }
    }

    const stats = {
      critical: violations.filter((v) => v.severity === 'critical').length,
      major: violations.filter((v) => v.severity === 'major').length,
      minor: violations.filter((v) => v.severity === 'minor').length,
      info: violations.filter((v) => v.severity === 'info').length,
    };

    const result: ConstraintAnalysisResult = {
      violations,
      goodPatterns,
      stats,
      timestamp: Date.now(),
    };

    lastAnalysisResult.value = result;
    isAnalyzing.value = false;

    return result;
  }

  /**
   * Active une contrainte.
   */
  function enableConstraint(constraintId: string): void {
    const constraint = activeConstraints.value.find((c) => c.id === constraintId);
    if (constraint) {
      constraint.enabled = true;
    }
  }

  /**
   * Désactive une contrainte.
   */
  function disableConstraint(constraintId: string): void {
    const constraint = activeConstraints.value.find((c) => c.id === constraintId);
    if (constraint) {
      constraint.enabled = false;
    }
  }

  /**
   * Ajoute une contrainte personnalisée.
   */
  function addCustomConstraint(constraint: ArchitecturalConstraint): void {
    activeConstraints.value.push(constraint);
  }

  /**
   * Supprime une contrainte personnalisée.
   */
  function removeCustomConstraint(constraintId: string): void {
    const index = activeConstraints.value.findIndex((c) => c.id === constraintId);
    if (index !== -1) {
      activeConstraints.value.splice(index, 1);
    }
  }

  /**
   * Calcule les métriques de qualité.
   */
  function calculateMetrics(): ArchitecturalMetric[] {
    const nodes = Object.values(graphStore.nodes);
    const edges = Object.values(graphStore.edges);

    const metrics: ArchitecturalMetric[] = [];

    // Métrique 1 : Couplage moyen
    const relationCounts = new Map<string, number>();
    for (const edge of edges) {
      relationCounts.set(edge.sourceId, (relationCounts.get(edge.sourceId) || 0) + 1);
      relationCounts.set(edge.targetId, (relationCounts.get(edge.targetId) || 0) + 1);
    }
    const avgCoupling =
      nodes.length > 0
        ? Array.from(relationCounts.values()).reduce((a, b) => a + b, 0) /
          nodes.length
        : 0;

    metrics.push({
      name: 'Couplage moyen',
      value: Math.round(avgCoupling * 10) / 10,
      target: 5,
      unit: 'relations/élément',
      description: 'Nombre moyen de relations par élément',
    });

    // Métrique 2 : Profondeur maximale
    const getDepth = (nodeId: string, visited = new Set<string>()): number => {
      if (visited.has(nodeId)) return 0;
      visited.add(nodeId);
      const node = nodes.find((n) => n.id === nodeId);
      if (!node || !node.parentId) return 1;
      return 1 + getDepth(node.parentId, visited);
    };

    const maxDepth = Math.max(...nodes.map((n) => getDepth(n.id)), 0);
    metrics.push({
      name: 'Profondeur hiérarchique max',
      value: maxDepth,
      target: 5,
      unit: 'niveaux',
      description: 'Profondeur maximale de la hiérarchie',
    });

    // Métrique 3 : Couverture des couches
    const layers = new Set<string>();
    for (const node of nodes) {
      const type = node.data?.archimateType as ArchimateType;
      if (type) {
        if (type.startsWith('business-')) layers.add('business');
        if (type.startsWith('application-')) layers.add('application');
        if (type.startsWith('technology-')) layers.add('technology');
      }
    }

    metrics.push({
      name: 'Couverture des couches',
      value: layers.size,
      target: 3,
      unit: 'couches',
      description: 'Nombre de couches Archimate utilisées',
    });

    // Métrique 4 : Ratio de documentation
    const documented = nodes.filter(
      (n) => n.data?.description && (n.data.description as string).length > 0
    ).length;
    const docRatio = nodes.length > 0 ? (documented / nodes.length) * 100 : 0;

    metrics.push({
      name: 'Taux de documentation',
      value: Math.round(docRatio),
      target: 80,
      unit: '%',
      description: 'Pourcentage d\'éléments avec description',
    });

    // Métrique 5 : Nombre de composants isolés
    const connected = new Set<string>();
    for (const edge of edges) {
      connected.add(edge.sourceId);
      connected.add(edge.targetId);
    }
    const isolated = nodes.filter(
      (n) => !connected.has(n.id) && !n.parentId
    ).length;

    metrics.push({
      name: 'Éléments isolés',
      value: isolated,
      target: 0,
      unit: 'éléments',
      description: 'Nombre d\'éléments sans relations',
    });

    return metrics;
  }

  /**
   * Obtient toutes les contraintes.
   */
  function getAllConstraints(): ArchitecturalConstraint[] {
    return [...activeConstraints.value];
  }

  return {
    lastAnalysisResult,
    isAnalyzing,
    activeConstraints,
    analyzeConstraints,
    enableConstraint,
    disableConstraint,
    addCustomConstraint,
    removeCustomConstraint,
    calculateMetrics,
    getAllConstraints,
  };
}
