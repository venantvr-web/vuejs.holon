// src/composables/traits/useFilterable.ts
import { ref, computed, type Ref } from 'vue';
import { useGraphStore } from '../../stores/graph';
import type { Node } from '../../types';

/**
 * Critère de filtrage pour les noeuds.
 */
export interface FilterCriteria {
  /**
   * Identifiant unique du critère.
   */
  id: string;
  /**
   * Nom affiché du critère.
   */
  name: string;
  /**
   * Type de filtrage à appliquer.
   */
  type: 'type' | 'tag' | 'property' | 'layer' | 'custom';
  /**
   * Valeur du filtre (string, array ou fonction personnalisée).
   */
  value: string | string[] | ((node: Node) => boolean);
  /**
   * Opérateur de comparaison (défaut: 'equals').
   */
  operator?: 'equals' | 'contains' | 'startsWith' | 'endsWith' | 'regex';
}

/**
 * Filtre sauvegardé pour réutilisation.
 */
export interface SavedFilter {
  /**
   * Identifiant unique du filtre sauvegardé.
   */
  id: string;
  /**
   * Nom du filtre.
   */
  name: string;
  /**
   * Critères composant le filtre.
   */
  criteria: FilterCriteria[];
  /**
   * Mode de combinaison des critères (ET ou OU).
   */
  mode: 'and' | 'or';
  /**
   * Timestamp de création.
   */
  createdAt: number;
}

/**
 * Mode d'affichage des noeuds filtrés.
 */
export type FilterDisplayMode = 'highlight' | 'hide' | 'dim';

/**
 * État réactif exposé par le trait Filterable.
 */
export interface FilterableState {
  /**
   * Liste des critères de filtrage actifs.
   */
  activeFilters: Ref<FilterCriteria[]>;
  /**
   * Mode de combinaison des filtres (ET ou OU).
   */
  filterMode: Ref<'and' | 'or'>;
  /**
   * Mode d'affichage des noeuds filtrés.
   */
  displayMode: Ref<FilterDisplayMode>;
  /**
   * Set des IDs de noeuds correspondant aux filtres.
   */
  filteredNodeIds: Ref<Set<string>>;
  /**
   * Set des IDs de noeuds cachés (inverse des filtrés en mode hide).
   */
  hiddenNodeIds: Ref<Set<string>>;
  /**
   * Liste des filtres sauvegardés.
   */
  savedFilters: Ref<SavedFilter[]>;
}

/**
 * Handlers (actions) exposés par le trait Filterable.
 */
export interface FilterableHandlers {
  /**
   * Ajoute un critère de filtrage.
   * @param criteria - Critère à ajouter
   */
  addFilter: (criteria: FilterCriteria) => void;
  /**
   * Retire un critère de filtrage.
   * @param criteriaId - ID du critère à retirer
   */
  removeFilter: (criteriaId: string) => void;
  /**
   * Vide tous les filtres actifs.
   */
  clearFilters: () => void;
  /**
   * Change le mode de combinaison des filtres.
   * @param mode - 'and' ou 'or'
   */
  setFilterMode: (mode: 'and' | 'or') => void;
  /**
   * Change le mode d'affichage des noeuds filtrés.
   * @param mode - Mode d'affichage
   */
  setDisplayMode: (mode: FilterDisplayMode) => void;
  /**
   * Sauvegarde la configuration de filtrage actuelle.
   * @param name - Nom du filtre sauvegardé
   * @returns Filtre sauvegardé
   */
  saveFilter: (name: string) => SavedFilter;
  /**
   * Charge un filtre sauvegardé.
   * @param filterId - ID du filtre à charger
   */
  loadFilter: (filterId: string) => void;
  /**
   * Supprime un filtre sauvegardé.
   * @param filterId - ID du filtre à supprimer
   */
  deleteFilter: (filterId: string) => void;
  /**
   * Vérifie si un noeud est visible selon les filtres actifs.
   * @param nodeId - ID du noeud
   * @returns true si visible
   */
  isNodeVisible: (nodeId: string) => boolean;
  /**
   * Vérifie si un noeud est mis en évidence par les filtres.
   * @param nodeId - ID du noeud
   * @returns true si mis en évidence
   */
  isNodeHighlighted: (nodeId: string) => boolean;
  /**
   * Calcule l'opacité d'un noeud selon les filtres et le mode d'affichage.
   * @param nodeId - ID du noeud
   * @returns Valeur d'opacité (0-1)
   */
  getNodeOpacity: (nodeId: string) => number;
}

// État global des filtres
const activeFilters = ref<FilterCriteria[]>([]);
const filterMode = ref<'and' | 'or'>('and');
const displayMode = ref<FilterDisplayMode>('highlight');
const savedFilters = ref<SavedFilter[]>([]);

/**
 * Trait permettant de filtrer les noeuds selon des critères multiples.
 *
 * Supporte différents types de filtres (type, tags, propriétés, layer) avec
 * plusieurs modes d'affichage (highlight, hide, dim) et sauvegarde des configurations.
 *
 * @returns État réactif et handlers pour le filtrage
 *
 * @example
 * ```typescript
 * const { addFilter, setDisplayMode, filteredNodeIds } = useFilterable();
 * addFilter(PRESET_FILTERS.byLayer('business'));
 * setDisplayMode('highlight');
 * ```
 */
export function useFilterable(): FilterableState & FilterableHandlers {
  const graphStore = useGraphStore();

  // Évalue si un noeud correspond à un critère
  function matchesCriteria(node: Node, criteria: FilterCriteria): boolean {
    if (typeof criteria.value === 'function') {
      return criteria.value(node);
    }

    let targetValue: string | undefined;

    switch (criteria.type) {
      case 'type':
        targetValue = node.data?.archimateType ?? node.type;
        break;
      case 'tag':
        const tags = node.data?.tags as string[] | undefined;
        if (Array.isArray(criteria.value)) {
          return criteria.value.some(v => tags?.includes(v));
        }
        return tags?.includes(criteria.value as string) ?? false;
      case 'layer':
        targetValue = node.data?.layer;
        break;
      case 'property':
        // Cherche dans data
        const [key, val] = (criteria.value as string).split('=');
        if (val !== undefined) {
          return node.data?.[key] === val;
        }
        return node.data?.[key] !== undefined;
      case 'custom':
        // Pour les filtres personnalisés
        targetValue = JSON.stringify(node);
        break;
    }

    if (!targetValue) return false;

    const compareValue = Array.isArray(criteria.value) ? criteria.value[0] : criteria.value;

    switch (criteria.operator ?? 'equals') {
      case 'equals':
        return targetValue === compareValue;
      case 'contains':
        return targetValue.includes(compareValue);
      case 'startsWith':
        return targetValue.startsWith(compareValue);
      case 'endsWith':
        return targetValue.endsWith(compareValue);
      case 'regex':
        try {
          return new RegExp(compareValue).test(targetValue);
        } catch {
          return false;
        }
    }
  }

  // Calcule les noeuds filtrés
  const filteredNodeIds = computed(() => {
    if (activeFilters.value.length === 0) {
      return new Set(Object.keys(graphStore.nodes));
    }

    const result = new Set<string>();

    for (const [id, node] of Object.entries(graphStore.nodes)) {
      const matches = activeFilters.value.map(c => matchesCriteria(node, c));

      const passes =
        filterMode.value === 'and'
          ? matches.every(Boolean)
          : matches.some(Boolean);

      if (passes) {
        result.add(id);
      }
    }

    return result;
  });

  // Noeuds cachés (inverse des filtrés en mode hide)
  const hiddenNodeIds = computed(() => {
    if (displayMode.value !== 'hide') {
      return new Set<string>();
    }

    const hidden = new Set<string>();
    for (const id of Object.keys(graphStore.nodes)) {
      if (!filteredNodeIds.value.has(id)) {
        hidden.add(id);
      }
    }
    return hidden;
  });

  function addFilter(criteria: FilterCriteria) {
    // Éviter les doublons
    const existing = activeFilters.value.findIndex(f => f.id === criteria.id);
    if (existing !== -1) {
      activeFilters.value[existing] = criteria;
    } else {
      activeFilters.value.push(criteria);
    }
  }

  function removeFilter(criteriaId: string) {
    activeFilters.value = activeFilters.value.filter(f => f.id !== criteriaId);
  }

  function clearFilters() {
    activeFilters.value = [];
  }

  function setFilterMode(mode: 'and' | 'or') {
    filterMode.value = mode;
  }

  function setDisplayMode(mode: FilterDisplayMode) {
    displayMode.value = mode;
  }

  function saveFilter(name: string): SavedFilter {
    const filter: SavedFilter = {
      id: `filter-${Date.now()}`,
      name,
      criteria: [...activeFilters.value],
      mode: filterMode.value,
      createdAt: Date.now(),
    };
    savedFilters.value.push(filter);
    return filter;
  }

  function loadFilter(filterId: string) {
    const filter = savedFilters.value.find(f => f.id === filterId);
    if (filter) {
      activeFilters.value = [...filter.criteria];
      filterMode.value = filter.mode;
    }
  }

  function deleteFilter(filterId: string) {
    savedFilters.value = savedFilters.value.filter(f => f.id !== filterId);
  }

  function isNodeVisible(nodeId: string): boolean {
    if (activeFilters.value.length === 0) return true;
    if (displayMode.value !== 'hide') return true;
    return filteredNodeIds.value.has(nodeId);
  }

  function isNodeHighlighted(nodeId: string): boolean {
    if (activeFilters.value.length === 0) return false;
    if (displayMode.value !== 'highlight') return false;
    return filteredNodeIds.value.has(nodeId);
  }

  function getNodeOpacity(nodeId: string): number {
    if (activeFilters.value.length === 0) return 1;

    const isFiltered = filteredNodeIds.value.has(nodeId);

    switch (displayMode.value) {
      case 'hide':
        return isFiltered ? 1 : 0;
      case 'dim':
        return isFiltered ? 1 : 0.3;
      case 'highlight':
        return 1; // L'opacité reste 1, le highlight est géré autrement
      default:
        return 1;
    }
  }

  return {
    activeFilters,
    filterMode,
    displayMode,
    filteredNodeIds,
    hiddenNodeIds,
    savedFilters,
    addFilter,
    removeFilter,
    clearFilters,
    setFilterMode,
    setDisplayMode,
    saveFilter,
    loadFilter,
    deleteFilter,
    isNodeVisible,
    isNodeHighlighted,
    getNodeOpacity,
  };
}

// Filtres prédéfinis helpers
export const PRESET_FILTERS = {
  byLayer: (layer: string): FilterCriteria => ({
    id: `layer-${layer}`,
    name: `Layer: ${layer}`,
    type: 'layer',
    value: layer,
  }),

  byType: (type: string): FilterCriteria => ({
    id: `type-${type}`,
    name: `Type: ${type}`,
    type: 'type',
    value: type,
  }),

  byTag: (tag: string): FilterCriteria => ({
    id: `tag-${tag}`,
    name: `Tag: ${tag}`,
    type: 'tag',
    value: tag,
  }),

  containers: (): FilterCriteria => ({
    id: 'containers',
    name: 'Containers only',
    type: 'custom',
    value: (node: Node) => node.type === 'container',
  }),

  withComments: (): FilterCriteria => ({
    id: 'with-comments',
    name: 'With comments',
    type: 'custom',
    value: (node: Node) => !!node.data?.comment,
  }),

  search: (query: string): FilterCriteria => ({
    id: `search-${query}`,
    name: `Search: ${query}`,
    type: 'custom',
    value: (node: Node) => {
      const searchIn = [
        node.data?.label,
        node.data?.comment,
        node.data?.archimateType,
        ...(node.data?.tags ?? []),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return searchIn.includes(query.toLowerCase());
    },
  }),
};
