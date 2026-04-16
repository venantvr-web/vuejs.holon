// src/composables/traits/useSearchable.ts
import { ref, computed, type Ref } from 'vue';
import { useGraphStore } from '../../stores/graph';
import Fuse from 'fuse.js';

/**
 * Portée de recherche.
 */
export type SearchScope = 'nodes' | 'edges' | 'all';

/**
 * Options de configuration pour la recherche.
 */
export interface SearchOptions {
  /**
   * Requête de recherche.
   */
  query: string;
  /**
   * Portée de la recherche.
   * @default 'all'
   */
  scope?: SearchScope;
  /**
   * Champs à rechercher.
   * @default ['data.name', 'data.description', 'id']
   */
  fields?: string[];
  /**
   * Recherche floue (fuzzy).
   * @default true
   */
  fuzzy?: boolean;
  /**
   * Seuil de correspondance (0-1, plus petit = plus strict).
   * @default 0.3
   */
  threshold?: number;
}

/**
 * Résultat de recherche.
 */
export interface SearchResult {
  /**
   * ID du noeud trouvé (si recherche de noeuds).
   */
  nodeId?: string;
  /**
   * ID de l'arête trouvée (si recherche d'arêtes).
   */
  edgeId?: string;
  /**
   * Type de l'élément.
   */
  type: 'node' | 'edge';
  /**
   * Correspondances trouvées.
   */
  matches: Array<{
    field: string;
    value: string;
    indices?: Array<[number, number]>;
  }>;
  /**
   * Score de pertinence (0-1, plus petit = meilleure correspondance).
   */
  score: number;
}

/**
 * État réactif exposé par le trait Searchable.
 */
export interface SearchableState {
  /**
   * Résultats de la dernière recherche.
   */
  searchResults: Ref<SearchResult[]>;
  /**
   * Requête actuelle.
   */
  currentQuery: Ref<string>;
  /**
   * Indique si une recherche est en cours.
   */
  isSearching: Ref<boolean>;
}

/**
 * Handlers (actions) exposés par le trait Searchable.
 */
export interface SearchableHandlers {
  /**
   * Effectue une recherche dans le graphe.
   * @param options - Options de recherche
   * @returns Résultats de recherche
   */
  search: (options: SearchOptions) => SearchResult[];
  /**
   * Efface les résultats de recherche.
   */
  clearSearch: () => void;
  /**
   * Navigue vers un résultat de recherche.
   * @param result - Résultat à mettre en focus
   */
  focusResult: (result: SearchResult) => void;
  /**
   * Recherche suivante dans les résultats.
   */
  nextResult: () => void;
  /**
   * Recherche précédente dans les résultats.
   */
  previousResult: () => void;
}

/**
 * Trait permettant de rechercher dans le graphe avec recherche floue.
 *
 * Utilise Fuse.js pour une recherche performante et flexible sur les noeuds et arêtes.
 * Supporte la recherche fuzzy, le highlighting et la navigation dans les résultats.
 *
 * @returns État réactif et handlers pour la recherche
 *
 * @example
 * ```typescript
 * const { search, searchResults, focusResult } = useSearchable();
 *
 * // Rechercher "business"
 * const results = search({
 *   query: 'business',
 *   scope: 'nodes',
 *   fuzzy: true
 * });
 *
 * // Mettre le premier résultat en focus
 * if (results.length > 0) {
 *   focusResult(results[0]);
 * }
 * ```
 */
export function useSearchable(): SearchableState & SearchableHandlers {
  const graphStore = useGraphStore();

  const searchResults = ref<SearchResult[]>([]);
  const currentQuery = ref('');
  const isSearching = ref(false);
  const currentResultIndex = ref(-1);

  /**
   * Configure Fuse pour les noeuds.
   */
  const nodeFuse = computed(() => {
    const nodes = Object.values(graphStore.nodes);

    return new Fuse(nodes, {
      keys: [
        { name: 'id', weight: 0.3 },
        { name: 'data.name', weight: 1.0 },
        { name: 'data.description', weight: 0.7 },
        { name: 'data.archimateType', weight: 0.5 },
        { name: 'type', weight: 0.2 },
      ],
      includeScore: true,
      includeMatches: true,
      threshold: 0.3,
      minMatchCharLength: 1,
    });
  });

  /**
   * Configure Fuse pour les arêtes.
   */
  const edgeFuse = computed(() => {
    const edges = Object.values(graphStore.edges);

    return new Fuse(edges, {
      keys: [
        { name: 'id', weight: 0.3 },
        { name: 'data.name', weight: 1.0 },
        { name: 'data.relationType', weight: 0.7 },
      ],
      includeScore: true,
      includeMatches: true,
      threshold: 0.3,
      minMatchCharLength: 1,
    });
  });

  /**
   * Effectue la recherche.
   */
  function search(options: SearchOptions): SearchResult[] {
    const {
      query,
      scope = 'all',
      fuzzy = true,
      threshold = 0.3,
    } = options;

    if (!query || query.trim().length === 0) {
      clearSearch();
      return [];
    }

    isSearching.value = true;
    currentQuery.value = query;

    const results: SearchResult[] = [];

    // Rechercher dans les noeuds
    if (scope === 'nodes' || scope === 'all') {
      const nodeResults = nodeFuse.value.search(query, {
        limit: fuzzy ? 50 : 20,
      });

      for (const result of nodeResults) {
        if (result.score !== undefined && result.score <= threshold) {
          results.push({
            nodeId: result.item.id,
            type: 'node',
            matches: result.matches?.map((m) => ({
              field: m.key || '',
              value: m.value || '',
              indices: m.indices,
            })) || [],
            score: result.score,
          });
        }
      }
    }

    // Rechercher dans les arêtes
    if (scope === 'edges' || scope === 'all') {
      const edgeResults = edgeFuse.value.search(query, {
        limit: fuzzy ? 50 : 20,
      });

      for (const result of edgeResults) {
        if (result.score !== undefined && result.score <= threshold) {
          results.push({
            edgeId: result.item.id,
            type: 'edge',
            matches: result.matches?.map((m) => ({
              field: m.key || '',
              value: m.value || '',
              indices: m.indices,
            })) || [],
            score: result.score,
          });
        }
      }
    }

    // Trier par score (meilleurs résultats en premier)
    results.sort((a, b) => a.score - b.score);

    searchResults.value = results;
    currentResultIndex.value = results.length > 0 ? 0 : -1;
    isSearching.value = false;

    return results;
  }

  /**
   * Efface les résultats.
   */
  function clearSearch(): void {
    searchResults.value = [];
    currentQuery.value = '';
    currentResultIndex.value = -1;
  }

  /**
   * Met un résultat en focus.
   */
  function focusResult(result: SearchResult): void {
    const event = new CustomEvent('focus-search-result', {
      detail: { result },
    });
    window.dispatchEvent(event);
  }

  /**
   * Résultat suivant.
   */
  function nextResult(): void {
    if (searchResults.value.length === 0) return;

    currentResultIndex.value =
      (currentResultIndex.value + 1) % searchResults.value.length;
    focusResult(searchResults.value[currentResultIndex.value]);
  }

  /**
   * Résultat précédent.
   */
  function previousResult(): void {
    if (searchResults.value.length === 0) return;

    currentResultIndex.value =
      currentResultIndex.value - 1 < 0
        ? searchResults.value.length - 1
        : currentResultIndex.value - 1;
    focusResult(searchResults.value[currentResultIndex.value]);
  }

  return {
    searchResults,
    currentQuery,
    isSearching,
    search,
    clearSearch,
    focusResult,
    nextResult,
    previousResult,
  };
}
