// src/composables/traits/useSuggestable.ts
import { ref, computed, type Ref } from 'vue';
import { useGraphStore } from '../../stores/graph';
import type { Node, Edge } from '../../types';
import { ArchimateType } from './useTypeable';
import { RelationType } from './useRelationTypeable';

/**
 * Type de suggestion.
 */
export type SuggestionType =
  | 'connection'
  | 'pattern'
  | 'refactoring'
  | 'naming'
  | 'completion'
  | 'optimization';

/**
 * Priorité de suggestion.
 */
export type SuggestionPriority = 'high' | 'medium' | 'low';

/**
 * Suggestion intelligente.
 */
export interface Suggestion {
  /**
   * ID unique de la suggestion.
   */
  id: string;
  /**
   * Type de suggestion.
   */
  type: SuggestionType;
  /**
   * Priorité.
   */
  priority: SuggestionPriority;
  /**
   * Description de la suggestion.
   */
  description: string;
  /**
   * Justification / raisonnement.
   */
  reasoning: string;
  /**
   * Niveau de confiance (0-1).
   */
  confidence: number;
  /**
   * IDs des noeuds concernés.
   */
  nodeIds?: string[];
  /**
   * IDs des arêtes concernées.
   */
  edgeIds?: string[];
  /**
   * Fonction pour appliquer la suggestion.
   */
  apply: () => void;
  /**
   * Fonction pour rejeter la suggestion.
   */
  dismiss: () => void;
  /**
   * Timestamp de création.
   */
  timestamp: number;
}

/**
 * Suggestion de connexion entre deux noeuds.
 */
export interface ConnectionSuggestion {
  /**
   * ID du noeud source.
   */
  sourceId: string;
  /**
   * ID du noeud cible.
   */
  targetId: string;
  /**
   * Type de relation suggéré.
   */
  relationType: RelationType;
  /**
   * Raison de la suggestion.
   */
  reason: string;
  /**
   * Confiance (0-1).
   */
  confidence: number;
}

/**
 * Pattern architectural suggéré.
 */
export interface PatternSuggestion {
  /**
   * Nom du pattern.
   */
  name: string;
  /**
   * Description du pattern.
   */
  description: string;
  /**
   * Éléments à créer.
   */
  elementsToCreate: Array<{
    type: ArchimateType;
    name: string;
    parentId?: string;
  }>;
  /**
   * Relations à créer.
   */
  relationsToCreate: Array<{
    sourceIndex: number; // Index dans elementsToCreate
    targetIndex: number;
    relationType: RelationType;
  }>;
}

/**
 * Contexte pour les suggestions.
 */
export interface SuggestionContext {
  /**
   * Noeud actuellement sélectionné.
   */
  selectedNodeId?: string;
  /**
   * Noeuds visibles dans le viewport.
   */
  visibleNodeIds?: string[];
  /**
   * Historique des actions récentes.
   */
  recentActions?: string[];
}

/**
 * État réactif exposé par le trait Suggestable.
 */
export interface SuggestableState {
  /**
   * Suggestions actives.
   */
  activeSuggestions: Ref<Suggestion[]>;
  /**
   * Suggestions rejetées (cachées).
   */
  dismissedSuggestions: Ref<Set<string>>;
  /**
   * Génération en cours.
   */
  isGenerating: Ref<boolean>;
  /**
   * Nombre de suggestions par type.
   */
  suggestionCounts: Ref<Record<SuggestionType, number>>;
}

/**
 * Handlers (actions) exposés par le trait Suggestable.
 */
export interface SuggestableHandlers {
  /**
   * Génère toutes les suggestions pour le contexte actuel.
   * @param context - Contexte optionnel
   * @returns Suggestions générées
   */
  generateSuggestions: (context?: SuggestionContext) => Suggestion[];
  /**
   * Suggère des connexions pour un noeud.
   * @param nodeId - ID du noeud
   * @returns Suggestions de connexions
   */
  suggestConnections: (nodeId: string) => ConnectionSuggestion[];
  /**
   * Suggère des patterns architecturaux applicables.
   * @returns Suggestions de patterns
   */
  suggestPatterns: () => PatternSuggestion[];
  /**
   * Suggère des refactorings.
   * @returns Suggestions de refactoring
   */
  suggestRefactorings: () => Suggestion[];
  /**
   * Suggère des améliorations de nommage.
   * @returns Suggestions de nommage
   */
  suggestNamingImprovements: () => Suggestion[];
  /**
   * Auto-complétion basée sur le contexte.
   * @param partial - Texte partiel
   * @param nodeId - ID du noeud en cours d'édition
   * @returns Suggestions d'auto-complétion
   */
  autocomplete: (partial: string, nodeId?: string) => string[];
  /**
   * Applique une suggestion.
   * @param suggestionId - ID de la suggestion
   */
  applySuggestion: (suggestionId: string) => void;
  /**
   * Rejette une suggestion.
   * @param suggestionId - ID de la suggestion
   */
  dismissSuggestion: (suggestionId: string) => void;
  /**
   * Efface toutes les suggestions.
   */
  clearSuggestions: () => void;
}

/**
 * Patterns architecturaux prédéfinis.
 */
const ARCHITECTURAL_PATTERNS: PatternSuggestion[] = [
  {
    name: 'Layered Architecture',
    description: 'Architecture en 3 couches (Business, Application, Technology)',
    elementsToCreate: [
      { type: ArchimateType.BUSINESS_PROCESS, name: 'Business Process' },
      { type: ArchimateType.APPLICATION_COMPONENT, name: 'Application Component' },
      { type: ArchimateType.TECHNOLOGY_NODE, name: 'Technology Node' },
    ],
    relationsToCreate: [
      { sourceIndex: 0, targetIndex: 1, relationType: RelationType.Serving },
      { sourceIndex: 1, targetIndex: 2, relationType: RelationType.Serving },
    ],
  },
  {
    name: 'Service Pattern',
    description: 'Service exposé par un composant',
    elementsToCreate: [
      { type: ArchimateType.APPLICATION_COMPONENT, name: 'Service Provider' },
      { type: ArchimateType.APPLICATION_SERVICE, name: 'Service' },
      { type: ArchimateType.APPLICATION_INTERFACE, name: 'Service Interface' },
    ],
    relationsToCreate: [
      { sourceIndex: 0, targetIndex: 1, relationType: RelationType.Realization },
      { sourceIndex: 1, targetIndex: 2, relationType: RelationType.Assignment },
    ],
  },
  {
    name: 'Motivation to Strategy',
    description: 'Lien entre motivation et stratégie',
    elementsToCreate: [
      { type: ArchimateType.DRIVER, name: 'Driver' },
      { type: ArchimateType.GOAL, name: 'Goal' },
      { type: ArchimateType.REQUIREMENT, name: 'Requirement' },
    ],
    relationsToCreate: [
      { sourceIndex: 0, targetIndex: 1, relationType: RelationType.Influence },
      { sourceIndex: 1, targetIndex: 2, relationType: RelationType.Realization },
    ],
  },
];

/**
 * Matrice de compatibilité des connexions.
 * Indique les types de relations possibles entre types d'éléments.
 */
const CONNECTION_COMPATIBILITY: Record<
  ArchimateType,
  Array<{ targetType: ArchimateType; relationType: RelationType; confidence: number }>
> = {
  [ArchimateType.BUSINESS_ACTOR]: [
    { targetType: ArchimateType.BUSINESS_ROLE, relationType: RelationType.Assignment, confidence: 0.9 },
    { targetType: ArchimateType.BUSINESS_PROCESS, relationType: RelationType.Assignment, confidence: 0.7 },
  ],
  [ArchimateType.BUSINESS_PROCESS]: [
    { targetType: ArchimateType.BUSINESS_SERVICE, relationType: RelationType.Realization, confidence: 0.9 },
    { targetType: ArchimateType.BUSINESS_OBJECT, relationType: RelationType.Access, confidence: 0.8 },
    { targetType: ArchimateType.BUSINESS_PROCESS, relationType: RelationType.Triggering, confidence: 0.7 },
  ],
  [ArchimateType.APPLICATION_COMPONENT]: [
    { targetType: ArchimateType.APPLICATION_SERVICE, relationType: RelationType.Realization, confidence: 0.9 },
    { targetType: ArchimateType.DATA_OBJECT, relationType: RelationType.Access, confidence: 0.8 },
    { targetType: ArchimateType.APPLICATION_INTERFACE, relationType: RelationType.Composition, confidence: 0.7 },
  ],
  [ArchimateType.TECHNOLOGY_NODE]: [
    { targetType: ArchimateType.TECHNOLOGY_SERVICE, relationType: RelationType.Realization, confidence: 0.9 },
    { targetType: ArchimateType.TECHNOLOGY_DEVICE, relationType: RelationType.Composition, confidence: 0.8 },
  ],
  // Autres types avec compatibilités par défaut
  [ArchimateType.DRIVER]: [
    { targetType: ArchimateType.GOAL, relationType: RelationType.Influence, confidence: 0.9 },
  ],
  [ArchimateType.GOAL]: [
    { targetType: ArchimateType.REQUIREMENT, relationType: RelationType.Realization, confidence: 0.9 },
  ],
  // Initialisation des autres types (réduit pour la concision)
} as Record<ArchimateType, Array<{ targetType: ArchimateType; relationType: RelationType; confidence: number }>>;

/**
 * Trait permettant de générer des suggestions intelligentes basées sur heuristiques.
 *
 * Fournit des suggestions contextuelles pour :
 * - **Connexions** : Relations suggérées entre éléments basées sur leurs types
 * - **Patterns** : Patterns architecturaux courants (Layered, Service, Motivation)
 * - **Refactoring** : Améliorations structurelles (décomposition, regroupement)
 * - **Nommage** : Conventions de nommage Archimate
 * - **Complétion** : Auto-complétion basée sur l'historique
 * - **Optimisation** : Suggestions de performance et qualité
 *
 * @returns État réactif et handlers pour les suggestions
 *
 * @example
 * ```typescript
 * const { generateSuggestions, suggestConnections, applySuggestion } = useSuggestable();
 *
 * // Générer toutes les suggestions
 * const suggestions = generateSuggestions();
 * console.log(`${suggestions.length} suggestions disponibles`);
 *
 * // Suggestions de connexions pour un noeud
 * const connections = suggestConnections('node-123');
 * connections.forEach(c => console.log(`${c.relationType}: ${c.reason}`));
 *
 * // Appliquer une suggestion
 * if (suggestions.length > 0) {
 *   applySuggestion(suggestions[0].id);
 * }
 * ```
 */
// État global partagé.
const activeSuggestions = ref<Suggestion[]>([]);
const dismissedSuggestions = ref<Set<string>>(new Set());
const isGenerating = ref(false);

const suggestionCounts = computed(() => {
  const counts: Record<SuggestionType, number> = {
    connection: 0,
    pattern: 0,
    refactoring: 0,
    naming: 0,
    completion: 0,
    optimization: 0,
  };
  for (const suggestion of activeSuggestions.value) {
    counts[suggestion.type]++;
  }
  return counts;
});

export function useSuggestable(): SuggestableState & SuggestableHandlers {
  const graphStore = useGraphStore();

  /**
   * Génère un ID unique pour une suggestion.
   */
  function generateSuggestionId(): string {
    return `suggestion-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Suggère des connexions pour un noeud.
   */
  function suggestConnections(nodeId: string): ConnectionSuggestion[] {
    const suggestions: ConnectionSuggestion[] = [];
    const sourceNode = graphStore.nodes[nodeId];
    if (!sourceNode) return suggestions;

    const sourceType = sourceNode.data?.archimateType as ArchimateType;
    if (!sourceType) return suggestions;

    // Trouver les compatibilités pour ce type
    const compatibilities = CONNECTION_COMPATIBILITY[sourceType] || [];

    // Chercher des noeuds candidats
    for (const node of Object.values(graphStore.nodes)) {
      if (node.id === nodeId) continue;

      const targetType = node.data?.archimateType as ArchimateType;
      if (!targetType) continue;

      // Vérifier si une compatibilité existe
      const match = compatibilities.find((c) => c.targetType === targetType);
      if (match) {
        // Vérifier qu'une relation n'existe pas déjà
        const existingRelation = Object.values(graphStore.edges).find(
          (e) =>
            e.sourceId === nodeId &&
            e.targetId === node.id &&
            e.data?.relationType === match.relationType
        );

        if (!existingRelation) {
          suggestions.push({
            sourceId: nodeId,
            targetId: node.id,
            relationType: match.relationType,
            reason: `${sourceType} utilise généralement ${match.relationType} vers ${targetType}`,
            confidence: match.confidence,
          });
        }
      }
    }

    // Trier par confiance décroissante
    suggestions.sort((a, b) => b.confidence - a.confidence);

    return suggestions.slice(0, 5); // Top 5 suggestions
  }

  /**
   * Suggère des patterns architecturaux.
   */
  function suggestPatterns(): PatternSuggestion[] {
    const suggestions: PatternSuggestion[] = [];
    const nodes = Object.values(graphStore.nodes);

    // Vérifier si le graphe est vide ou minimal
    if (nodes.length < 3) {
      return ARCHITECTURAL_PATTERNS; // Suggérer tous les patterns
    }

    // Analyser les types présents
    const typeCounts = new Map<ArchimateType, number>();
    for (const node of nodes) {
      const type = node.data?.archimateType as ArchimateType;
      if (type) {
        typeCounts.set(type, (typeCounts.get(type) || 0) + 1);
      }
    }

    // Suggérer Layered Architecture si manque de couches
    const hasBusinessLayer = Array.from(typeCounts.keys()).some((t) =>
      t.startsWith('business-')
    );
    const hasApplicationLayer = Array.from(typeCounts.keys()).some((t) =>
      t.startsWith('application-')
    );
    const hasTechnologyLayer = Array.from(typeCounts.keys()).some((t) =>
      t.startsWith('technology-')
    );

    if (!hasBusinessLayer || !hasApplicationLayer || !hasTechnologyLayer) {
      suggestions.push(ARCHITECTURAL_PATTERNS[0]); // Layered Architecture
    }

    // Suggérer Service Pattern si beaucoup de composants sans services
    const componentCount =
      typeCounts.get(ArchimateType.APPLICATION_COMPONENT) || 0;
    const serviceCount = typeCounts.get(ArchimateType.APPLICATION_SERVICE) || 0;

    if (componentCount > serviceCount * 2) {
      suggestions.push(ARCHITECTURAL_PATTERNS[1]); // Service Pattern
    }

    // Suggérer Motivation si aucun driver/goal
    const hasMotivation = Array.from(typeCounts.keys()).some(
      (t) => t === ArchimateType.DRIVER || t === ArchimateType.GOAL
    );

    if (!hasMotivation && nodes.length > 5) {
      suggestions.push(ARCHITECTURAL_PATTERNS[2]); // Motivation to Strategy
    }

    return suggestions;
  }

  /**
   * Suggère des refactorings.
   */
  function suggestRefactorings(): Suggestion[] {
    const suggestions: Suggestion[] = [];

    // Suggestion 1 : Décomposer les God Objects
    const relationCounts = new Map<string, number>();
    for (const edge of Object.values(graphStore.edges)) {
      relationCounts.set(edge.sourceId, (relationCounts.get(edge.sourceId) || 0) + 1);
      relationCounts.set(edge.targetId, (relationCounts.get(edge.targetId) || 0) + 1);
    }

    for (const [nodeId, count] of relationCounts) {
      if (count > 10) {
        const node = graphStore.nodes[nodeId];
        suggestions.push({
          id: generateSuggestionId(),
          type: 'refactoring',
          priority: 'high',
          description: `Décomposer "${node.data?.name || nodeId}" (${count} relations)`,
          reasoning: 'Ce composant a trop de responsabilités (God Object anti-pattern)',
          confidence: 0.8,
          nodeIds: [nodeId],
          apply: () => {
            // Logique de décomposition (simplifié)
            console.log(`Décomposer ${nodeId}`);
          },
          dismiss: () => {
            dismissSuggestion(suggestions[suggestions.length - 1].id);
          },
          timestamp: Date.now(),
        });
      }
    }

    // Suggestion 2 : Regrouper les éléments similaires
    const nameGroups = new Map<string, string[]>();
    for (const node of Object.values(graphStore.nodes)) {
      const name = node.data?.name as string;
      if (!name) continue;

      const prefix = name.split(' ')[0]; // Premier mot
      if (!nameGroups.has(prefix)) {
        nameGroups.set(prefix, []);
      }
      nameGroups.get(prefix)!.push(node.id);
    }

    for (const [prefix, nodeIds] of nameGroups) {
      if (nodeIds.length >= 3) {
        suggestions.push({
          id: generateSuggestionId(),
          type: 'refactoring',
          priority: 'medium',
          description: `Regrouper ${nodeIds.length} éléments "${prefix}"`,
          reasoning: 'Ces éléments semblent liés et pourraient être regroupés',
          confidence: 0.6,
          nodeIds,
          apply: () => {
            console.log(`Regrouper ${nodeIds.length} noeuds`);
          },
          dismiss: () => {
            dismissSuggestion(suggestions[suggestions.length - 1].id);
          },
          timestamp: Date.now(),
        });
      }
    }

    return suggestions.slice(0, 10);
  }

  /**
   * Suggère des améliorations de nommage.
   */
  function suggestNamingImprovements(): Suggestion[] {
    const suggestions: Suggestion[] = [];

    for (const node of Object.values(graphStore.nodes)) {
      const name = node.data?.name as string;

      // Nom manquant
      if (!name || name.trim().length === 0) {
        suggestions.push({
          id: generateSuggestionId(),
          type: 'naming',
          priority: 'high',
          description: `Ajouter un nom à cet élément`,
          reasoning: 'Les éléments sans nom sont difficiles à comprendre',
          confidence: 1.0,
          nodeIds: [node.id],
          apply: () => {
            const type = node.data?.archimateType as ArchimateType;
            graphStore.updateNode(node.id, {
              data: { ...node.data, name: `New ${type || 'Element'}` },
            });
          },
          dismiss: () => {
            dismissSuggestion(suggestions[suggestions.length - 1].id);
          },
          timestamp: Date.now(),
        });
      }
      // Nom trop court
      else if (name.length < 3) {
        suggestions.push({
          id: generateSuggestionId(),
          type: 'naming',
          priority: 'low',
          description: `Nom trop court: "${name}"`,
          reasoning: 'Les noms courts sont moins descriptifs',
          confidence: 0.7,
          nodeIds: [node.id],
          apply: () => {
            // Aucune action automatique
          },
          dismiss: () => {
            dismissSuggestion(suggestions[suggestions.length - 1].id);
          },
          timestamp: Date.now(),
        });
      }
    }

    return suggestions.slice(0, 5);
  }

  /**
   * Auto-complétion basée sur l'historique.
   */
  function autocomplete(partial: string, nodeId?: string): string[] {
    if (!partial || partial.length < 2) return [];

    const suggestions = new Set<string>();
    const lowerPartial = partial.toLowerCase();

    // Chercher dans les noms existants
    for (const node of Object.values(graphStore.nodes)) {
      const name = node.data?.name as string;
      if (name && name.toLowerCase().startsWith(lowerPartial)) {
        suggestions.add(name);
      }
    }

    // Ajouter des suggestions basées sur le type
    if (nodeId) {
      const node = graphStore.nodes[nodeId];
      const type = node?.data?.archimateType as ArchimateType;

      if (type) {
        // Suggestions spécifiques au type
        const typePrefix = type.replace(/-/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
        suggestions.add(`${partial} ${typePrefix}`);
      }
    }

    return Array.from(suggestions).slice(0, 10);
  }

  /**
   * Génère toutes les suggestions.
   */
  function generateSuggestions(context?: SuggestionContext): Suggestion[] {
    isGenerating.value = true;
    const allSuggestions: Suggestion[] = [];

    // Suggestions de connexion si un noeud est sélectionné
    if (context?.selectedNodeId) {
      const connections = suggestConnections(context.selectedNodeId);
      for (const conn of connections) {
        allSuggestions.push({
          id: generateSuggestionId(),
          type: 'connection',
          priority: conn.confidence > 0.8 ? 'high' : 'medium',
          // conn.relationType est déjà la valeur string de l'enum ; le lookup
          // inversé RelationType[...] n'existe pas pour les enums string et
          // affichait « undefined ».
          description: `Connecter avec ${conn.relationType}`,
          reasoning: conn.reason,
          confidence: conn.confidence,
          nodeIds: [conn.sourceId, conn.targetId],
          apply: async () => {
            // createEdge prend (sourceId, targetId, routing) : l'ancien appel
            // avec un objet ne créait jamais rien (et donc « Appliquer »
            // était sans effet).
            const edge = await graphStore.createEdge(conn.sourceId, conn.targetId);
            if (edge) {
              await graphStore.updateEdge(edge.id, {
                data: { ...(edge.data ?? {}), relationType: conn.relationType },
              });
            }
          },
          dismiss: () => {
            dismissSuggestion(allSuggestions[allSuggestions.length - 1].id);
          },
          timestamp: Date.now(),
        });
      }
    }

    // Suggestions de patterns
    const patterns = suggestPatterns();
    for (const pattern of patterns) {
      allSuggestions.push({
        id: generateSuggestionId(),
        type: 'pattern',
        priority: 'medium',
        description: `Appliquer pattern: ${pattern.name}`,
        reasoning: pattern.description,
        confidence: 0.7,
        apply: () => {
          console.log(`Appliquer pattern: ${pattern.name}`);
          // Logique d'application du pattern
        },
        dismiss: () => {
          dismissSuggestion(allSuggestions[allSuggestions.length - 1].id);
        },
        timestamp: Date.now(),
      });
    }

    // Suggestions de refactoring
    allSuggestions.push(...suggestRefactorings());

    // Suggestions de nommage
    allSuggestions.push(...suggestNamingImprovements());

    // Filtrer les suggestions déjà rejetées
    const filtered = allSuggestions.filter(
      (s) => !dismissedSuggestions.value.has(s.id)
    );

    activeSuggestions.value = filtered;
    isGenerating.value = false;

    return filtered;
  }

  /**
   * Applique une suggestion.
   */
  function applySuggestion(suggestionId: string): void {
    const suggestion = activeSuggestions.value.find((s) => s.id === suggestionId);
    if (suggestion) {
      suggestion.apply();
      // Retirer de la liste
      activeSuggestions.value = activeSuggestions.value.filter(
        (s) => s.id !== suggestionId
      );
    }
  }

  /**
   * Rejette une suggestion.
   */
  function dismissSuggestion(suggestionId: string): void {
    dismissedSuggestions.value.add(suggestionId);
    activeSuggestions.value = activeSuggestions.value.filter(
      (s) => s.id !== suggestionId
    );
  }

  /**
   * Efface toutes les suggestions.
   */
  function clearSuggestions(): void {
    activeSuggestions.value = [];
  }

  return {
    activeSuggestions,
    dismissedSuggestions,
    isGenerating,
    suggestionCounts,
    generateSuggestions,
    suggestConnections,
    suggestPatterns,
    suggestRefactorings,
    suggestNamingImprovements,
    autocomplete,
    applySuggestion,
    dismissSuggestion,
    clearSuggestions,
  };
}
