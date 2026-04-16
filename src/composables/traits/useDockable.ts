// src/composables/traits/useDockable.ts
import { ref, computed, type Ref } from 'vue';
import { useGraphStore } from '../../stores/graph';
import { useGeometry } from '../useGeometry';
import type { Node } from '../../types';

/**
 * Règles de containment par défaut selon les types Archimate et génériques.
 */
export const DEFAULT_CONTAINMENT_RULES: Record<string, ContainmentRule> = {
  // Containers génériques
  'container': {
    canContain: true,
    canBeContained: true,
    maxDepth: 10,
  },
  'node': {
    canContain: false,
    canBeContained: true,
  },
  // Business Layer
  'business-actor': {
    canContain: false,
    canBeContained: true,
    allowedParentTypes: ['container', 'generic-grouping', 'generic-location'],
  },
  'business-process': {
    canContain: true,
    canBeContained: true,
    allowedChildTypes: ['business-function', 'business-event', 'business-interaction'],
  },
  // Application Layer
  'application-component': {
    canContain: true,
    canBeContained: true,
    allowedChildTypes: ['application-function', 'application-process', 'application-data-object'],
  },
  // Technology Layer
  'technology-node': {
    canContain: true,
    canBeContained: true,
    allowedChildTypes: ['technology-device', 'technology-system-software', 'technology-artifact'],
  },
  // Generic
  'generic-grouping': {
    canContain: true,
    canBeContained: true,
    maxChildren: 50,
  },
  'generic-location': {
    canContain: true,
    canBeContained: false,
  },
};

/**
 * Règle de containment définissant les contraintes parent-enfant pour un type de noeud.
 */
export interface ContainmentRule {
  /**
   * Indique si le noeud peut contenir des enfants.
   */
  canContain?: boolean;
  /**
   * Indique si le noeud peut être contenu dans un parent.
   */
  canBeContained?: boolean;
  /**
   * Types de parents autorisés (vide = tous autorisés).
   */
  allowedParentTypes?: string[];
  /**
   * Types d'enfants autorisés (vide = tous autorisés).
   */
  allowedChildTypes?: string[];
  /**
   * Types de parents interdits.
   */
  forbiddenParentTypes?: string[];
  /**
   * Types d'enfants interdits.
   */
  forbiddenChildTypes?: string[];
  /**
   * Nombre maximum d'enfants autorisés.
   */
  maxChildren?: number;
  /**
   * Profondeur maximale de nesting autorisée.
   */
  maxDepth?: number;
}

/**
 * Options de configuration pour le trait Dockable.
 */
export interface DockableOptions {
  /**
   * Référence réactive vers l'ID du noeud concerné.
   */
  nodeId: Ref<string>;
  /**
   * Référence réactive indiquant si le noeud est en cours de glissement.
   */
  isDragging: Ref<boolean>;
  /**
   * Règles de containment personnalisées (optionnel, utilise les défauts si non fourni).
   */
  containmentRules?: ContainmentRule;
}

/**
 * État réactif exposé par le trait Dockable.
 */
export interface DockableState {
  /**
   * ID du parent potentiel détecté pendant le glissement.
   */
  potentialParent: Ref<string | null>;
  /**
   * Indique si ce noeud est une cible de dépôt valide.
   */
  isDropTarget: Ref<boolean>;
  /**
   * Indique si ce noeud peut contenir des enfants.
   */
  canContain: Ref<boolean>;
  /**
   * Indique si ce noeud peut être contenu dans un parent.
   */
  canBeContained: Ref<boolean>;
  /**
   * Profondeur actuelle du noeud dans la hiérarchie.
   */
  currentDepth: Ref<number>;
  /**
   * Nombre d'enfants directs du noeud.
   */
  childCount: Ref<number>;
  /**
   * Message d'erreur si le docking n'est pas autorisé.
   */
  dockingError: Ref<string | null>;
}

/**
 * Handlers (actions) exposés par le trait Dockable.
 */
export interface DockableHandlers {
  /**
   * Met à jour le parent potentiel basé sur la position actuelle du noeud.
   */
  updatePotentialParent: () => void;
  /**
   * Valide et applique le docking vers le parent potentiel.
   */
  commitDocking: () => void;
  /**
   * Extrait le noeud de son parent actuel (vers la racine).
   */
  undockFromParent: () => void;
  /**
   * Vérifie si ce noeud peut être docké dans un parent spécifique.
   * @param parentId - ID du parent potentiel
   * @returns Résultat de la vérification avec raison si refusé
   */
  canDockInto: (parentId: string) => { allowed: boolean; reason?: string };
  /**
   * Vérifie si ce noeud peut accepter un enfant spécifique.
   * @param childId - ID de l'enfant potentiel
   * @returns Résultat de la vérification avec raison si refusé
   */
  canAcceptChild: (childId: string) => { allowed: boolean; reason?: string };
  /**
   * Modifie dynamiquement les règles de containment du noeud.
   * @param rules - Règles partielles à appliquer
   */
  setContainmentRules: (rules: Partial<ContainmentRule>) => void;
}

/**
 * Trait permettant de gérer le docking (insertion hiérarchique) de noeuds dans des containers.
 *
 * Implémente un système complet de règles de containment avec support ArchiMate,
 * détection automatique de parents potentiels, et validation des contraintes.
 *
 * @param options - Configuration du trait
 * @returns État réactif et handlers pour la gestion du docking
 *
 * @example
 * ```typescript
 * const { potentialParent, canDockInto, commitDocking } = useDockable({
 *   nodeId: ref('node-123'),
 *   isDragging: ref(true)
 * });
 * // Pendant le drag, potentialParent est mis à jour automatiquement
 * commitDocking(); // Applique le docking si autorisé
 * ```
 */
export function useDockable(options: DockableOptions): DockableState & DockableHandlers {
  const graphStore = useGraphStore();
  const { getNodeAbsolutePosition, findContainerAtPoint, convertCoordinates } = useGeometry();

  const potentialParent = ref<string | null>(null);
  const dockingError = ref<string | null>(null);
  const localRules = ref<ContainmentRule | null>(options.containmentRules ?? null);

  // Récupère les règles effectives pour ce noeud
  function getEffectiveRules(): ContainmentRule {
    const node = graphStore.nodes[options.nodeId.value];
    if (!node) return { canContain: false, canBeContained: true };

    // Priorité : règles locales > règles par type Archimate > règles par type de noeud > défaut
    if (localRules.value) {
      return localRules.value;
    }

    const archimateType = node.data?.archimateType as string | undefined;
    if (archimateType && DEFAULT_CONTAINMENT_RULES[archimateType]) {
      return DEFAULT_CONTAINMENT_RULES[archimateType];
    }

    if (DEFAULT_CONTAINMENT_RULES[node.type]) {
      return DEFAULT_CONTAINMENT_RULES[node.type];
    }

    // Défaut : les containers peuvent contenir, les autres non
    return {
      canContain: node.type === 'container',
      canBeContained: true,
    };
  }

  // Ce noeud peut-il contenir des enfants ?
  const canContain = computed(() => {
    return getEffectiveRules().canContain ?? false;
  });

  // Ce noeud peut-il être contenu dans un autre ?
  const canBeContained = computed(() => {
    return getEffectiveRules().canBeContained ?? true;
  });

  // Profondeur actuelle dans la hiérarchie
  const currentDepth = computed(() => {
    let depth = 0;
    let currentId = options.nodeId.value;

    while (currentId) {
      const node = graphStore.nodes[currentId];
      if (!node?.parentId) break;
      depth++;
      currentId = node.parentId;
    }

    return depth;
  });

  // Nombre d'enfants directs
  const childCount = computed(() => {
    return Object.values(graphStore.nodes).filter(
      n => n.parentId === options.nodeId.value
    ).length;
  });

  // Ce noeud est-il une cible de drop potentielle pour un autre noeud ?
  const isDropTarget = computed(() => {
    return canContain.value && potentialParent.value === options.nodeId.value;
  });

  // Vérifie si ce noeud peut être docké dans un parent spécifique
  function canDockInto(parentId: string): { allowed: boolean; reason?: string } {
    const rules = getEffectiveRules();
    const node = graphStore.nodes[options.nodeId.value];
    const parent = graphStore.nodes[parentId];

    if (!node || !parent) {
      return { allowed: false, reason: 'Noeud ou parent introuvable' };
    }

    // Vérifier si ce noeud peut être contenu
    if (!rules.canBeContained) {
      return { allowed: false, reason: 'Cet élément ne peut pas être contenu dans un autre' };
    }

    // Vérifier si le parent peut contenir des enfants
    const parentArchimateType = parent.data?.archimateType as string | undefined;
    const parentRules = parentArchimateType
      ? DEFAULT_CONTAINMENT_RULES[parentArchimateType]
      : DEFAULT_CONTAINMENT_RULES[parent.type];

    if (parentRules && !parentRules.canContain) {
      return { allowed: false, reason: 'Le parent ne peut pas contenir d\'éléments' };
    }

    // Vérifier les types de parents autorisés
    if (rules.allowedParentTypes && rules.allowedParentTypes.length > 0) {
      const parentType = parentArchimateType ?? parent.type;
      if (!rules.allowedParentTypes.includes(parentType)) {
        return {
          allowed: false,
          reason: `Type de parent non autorisé. Autorisés: ${rules.allowedParentTypes.join(', ')}`
        };
      }
    }

    // Vérifier les types de parents interdits
    if (rules.forbiddenParentTypes && rules.forbiddenParentTypes.length > 0) {
      const parentType = parentArchimateType ?? parent.type;
      if (rules.forbiddenParentTypes.includes(parentType)) {
        return { allowed: false, reason: 'Type de parent interdit' };
      }
    }

    // Vérifier la profondeur max
    if (rules.maxDepth !== undefined) {
      // Calculer la profondeur du parent
      let parentDepth = 0;
      let currentId: string | null = parentId;
      while (currentId) {
        const currentNode: Node | undefined = graphStore.nodes[currentId];
        if (!currentNode?.parentId) break;
        parentDepth++;
        currentId = currentNode.parentId;
      }

      if (parentDepth + 1 > rules.maxDepth) {
        return { allowed: false, reason: `Profondeur max (${rules.maxDepth}) atteinte` };
      }
    }

    // Vérifier qu'on ne crée pas de cycle
    let checkId: string | null = parentId;
    while (checkId) {
      if (checkId === options.nodeId.value) {
        return { allowed: false, reason: 'Cycle détecté - un élément ne peut pas être son propre ancêtre' };
      }
      const checkNode: Node | undefined = graphStore.nodes[checkId];
      checkId = checkNode?.parentId ?? null;
    }

    return { allowed: true };
  }

  // Vérifie si ce noeud peut accepter un enfant spécifique
  function canAcceptChild(childId: string): { allowed: boolean; reason?: string } {
    const rules = getEffectiveRules();
    const node = graphStore.nodes[options.nodeId.value];
    const child = graphStore.nodes[childId];

    if (!node || !child) {
      return { allowed: false, reason: 'Noeud ou enfant introuvable' };
    }

    // Vérifier si ce noeud peut contenir des enfants
    if (!rules.canContain) {
      return { allowed: false, reason: 'Cet élément ne peut pas contenir d\'enfants' };
    }

    // Vérifier le nombre max d'enfants
    if (rules.maxChildren !== undefined && childCount.value >= rules.maxChildren) {
      return { allowed: false, reason: `Nombre max d'enfants (${rules.maxChildren}) atteint` };
    }

    // Vérifier les types d'enfants autorisés
    const childArchimateType = child.data?.archimateType as string | undefined;
    const childType = childArchimateType ?? child.type;

    if (rules.allowedChildTypes && rules.allowedChildTypes.length > 0) {
      if (!rules.allowedChildTypes.includes(childType)) {
        return {
          allowed: false,
          reason: `Type d'enfant non autorisé. Autorisés: ${rules.allowedChildTypes.join(', ')}`
        };
      }
    }

    // Vérifier les types d'enfants interdits
    if (rules.forbiddenChildTypes && rules.forbiddenChildTypes.length > 0) {
      if (rules.forbiddenChildTypes.includes(childType)) {
        return { allowed: false, reason: 'Type d\'enfant interdit' };
      }
    }

    return { allowed: true };
  }

  // Met à jour le parent potentiel basé sur la position actuelle du noeud
  function updatePotentialParent() {
    dockingError.value = null;

    if (!options.isDragging.value) {
      potentialParent.value = null;
      return;
    }

    // Vérifier si ce noeud peut être contenu
    if (!canBeContained.value) {
      potentialParent.value = null;
      return;
    }

    const node = graphStore.nodes[options.nodeId.value];
    if (!node) return;

    const absPos = getNodeAbsolutePosition(options.nodeId.value);
    const centerX = absPos.x + node.geometry.w / 2;
    const centerY = absPos.y + node.geometry.h / 2;

    const foundParent = findContainerAtPoint(centerX, centerY, options.nodeId.value);

    if (foundParent) {
      // Vérifier si le docking est autorisé
      const check = canDockInto(foundParent);
      if (check.allowed) {
        // Vérifier aussi si le parent accepte cet enfant
        const parentCheck = canAcceptChildForParent(foundParent, options.nodeId.value);
        if (parentCheck.allowed) {
          potentialParent.value = foundParent;
        } else {
          potentialParent.value = null;
          dockingError.value = parentCheck.reason ?? null;
        }
      } else {
        potentialParent.value = null;
        dockingError.value = check.reason ?? null;
      }
    } else {
      potentialParent.value = null;
    }
  }

  // Helper pour vérifier si un parent peut accepter un enfant
  function canAcceptChildForParent(parentId: string, childId: string): { allowed: boolean; reason?: string } {
    const parent = graphStore.nodes[parentId];
    if (!parent) return { allowed: false, reason: 'Parent introuvable' };

    const parentArchimateType = parent.data?.archimateType as string | undefined;
    const parentRules = parentArchimateType
      ? DEFAULT_CONTAINMENT_RULES[parentArchimateType]
      : DEFAULT_CONTAINMENT_RULES[parent.type] ?? { canContain: parent.type === 'container' };

    if (!parentRules.canContain) {
      return { allowed: false, reason: 'Le parent ne peut pas contenir d\'éléments' };
    }

    // Vérifier le nombre max d'enfants du parent
    if (parentRules.maxChildren !== undefined) {
      const parentChildCount = Object.values(graphStore.nodes).filter(
        n => n.parentId === parentId
      ).length;
      if (parentChildCount >= parentRules.maxChildren) {
        return { allowed: false, reason: `Le parent a atteint son max d'enfants (${parentRules.maxChildren})` };
      }
    }

    // Vérifier les types d'enfants autorisés par le parent
    const child = graphStore.nodes[childId];
    if (child && parentRules.allowedChildTypes && parentRules.allowedChildTypes.length > 0) {
      const childType = (child.data?.archimateType as string) ?? child.type;
      if (!parentRules.allowedChildTypes.includes(childType)) {
        return { allowed: false, reason: 'Type d\'enfant non accepté par ce parent' };
      }
    }

    return { allowed: true };
  }

  // Valide le docking à la fin du drag
  function commitDocking() {
    if (potentialParent.value === null) {
      potentialParent.value = null;
      dockingError.value = null;
      return;
    }

    const node = graphStore.nodes[options.nodeId.value];
    if (!node) return;

    // Double vérification des règles
    const check = canDockInto(potentialParent.value);
    if (!check.allowed) {
      dockingError.value = check.reason ?? 'Docking non autorisé';
      potentialParent.value = null;
      return;
    }

    const currentParent = node.parentId;

    if (potentialParent.value !== currentParent) {
      // Calculer les nouvelles coordonnées relatives au nouveau parent
      const newCoords = convertCoordinates(options.nodeId.value, currentParent, potentialParent.value);

      graphStore.updateNode(options.nodeId.value, {
        parentId: potentialParent.value,
        geometry: {
          ...node.geometry,
          x: newCoords.x,
          y: newCoords.y,
        },
      });
    }

    potentialParent.value = null;
    dockingError.value = null;
  }

  // Extrait le noeud de son parent (vers la racine)
  function undockFromParent() {
    const node = graphStore.nodes[options.nodeId.value];
    if (!node || node.parentId === null) return;

    const newCoords = convertCoordinates(options.nodeId.value, node.parentId, null);

    graphStore.updateNode(options.nodeId.value, {
      parentId: null,
      geometry: {
        ...node.geometry,
        x: newCoords.x,
        y: newCoords.y,
      },
    });
  }

  // Permet de modifier les règles dynamiquement
  function setContainmentRules(rules: Partial<ContainmentRule>) {
    localRules.value = {
      ...getEffectiveRules(),
      ...rules,
    };
  }

  return {
    potentialParent,
    isDropTarget,
    canContain,
    canBeContained,
    currentDepth,
    childCount,
    dockingError,
    updatePotentialParent,
    commitDocking,
    undockFromParent,
    canDockInto,
    canAcceptChild,
    setContainmentRules,
  };
}

// Export des règles par défaut pour personnalisation
export function useContainmentRules() {
  return {
    defaults: DEFAULT_CONTAINMENT_RULES,
    setDefaultRule: (type: string, rule: ContainmentRule) => {
      DEFAULT_CONTAINMENT_RULES[type] = rule;
    },
    getRule: (type: string) => DEFAULT_CONTAINMENT_RULES[type],
  };
}
