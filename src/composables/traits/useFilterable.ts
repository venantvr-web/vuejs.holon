// src/composables/traits/useFilterable.ts
import { ref, computed, watch, type Ref, type ComputedRef } from 'vue'
import { useGraphStore } from '../../stores/graph'
import type { Node, Edge } from '../../types'
import { parseFilterQuery } from './utils/filter-dsl'

/**
 * Filtre sauvegardé pour réutilisation.
 */
export interface SavedFilter {
  /**
   * Identifiant unique du filtre sauvegardé.
   */
  id: string
  /**
   * Nom du filtre.
   */
  name: string
  /**
   * Requête DSL du filtre (voir utils/filter-dsl.ts pour la grammaire).
   */
  query: string
  /**
   * Si vrai, les éléments correspondants sont masqués au lieu d'être conservés.
   */
  invert: boolean
  /**
   * Mode d'affichage appliqué aux éléments écartés.
   */
  displayMode: FilterDisplayMode
  /**
   * Timestamp de création.
   */
  createdAt: number
}

/**
 * Mode d'affichage des noeuds écartés par le filtre.
 * - hide : retirés du rendu
 * - dim  : estompés (opacité réduite)
 */
export type FilterDisplayMode = 'hide' | 'dim'

const STORAGE_KEY = 'holon-saved-filters'

// --- État global du filtre (partagé entre tous les composants) ---

/** Requête DSL courante (chaîne vide = aucun filtre). */
const query = ref('')
/** Si vrai, la requête désigne les éléments à masquer plutôt qu'à conserver. */
const invertQuery = ref(false)
/** Mode d'affichage des éléments écartés. */
const displayMode = ref<FilterDisplayMode>('dim')
/** Filtres sauvegardés (persistés en localStorage). */
const savedFilters = ref<SavedFilter[]>(loadSavedFilters())

function loadSavedFilters(): SavedFilter[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

watch(
  savedFilters,
  (filters) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(filters))
    } catch {
      // Stockage indisponible (mode privé, quota) : non bloquant.
    }
  },
  { deep: true }
)

/**
 * État réactif exposé par le trait Filterable.
 */
export interface FilterableState {
  /** Requête DSL courante. */
  query: Ref<string>
  /** Erreur de syntaxe de la requête courante, ou null. */
  queryError: ComputedRef<string | null>
  /** Si vrai, la requête désigne les éléments à masquer. */
  invertQuery: Ref<boolean>
  /** Mode d'affichage des éléments écartés. */
  displayMode: Ref<FilterDisplayMode>
  /** Vrai si un filtre est actif et syntaxiquement valide. */
  isFilterActive: ComputedRef<boolean>
  /** IDs des noeuds correspondant directement à la requête. */
  matchedNodeIds: ComputedRef<Set<string>>
  /** IDs des noeuds écartés (fermeture hiérarchique incluse). */
  excludedNodeIds: ComputedRef<Set<string>>
  /** Nombre de noeuds écartés par le filtre. */
  excludedCount: ComputedRef<number>
  /** Filtres sauvegardés. */
  savedFilters: Ref<SavedFilter[]>
}

/**
 * Handlers (actions) exposés par le trait Filterable.
 */
export interface FilterableHandlers {
  /** Applique une requête DSL. */
  setQuery: (value: string) => void
  /** Réinitialise complètement le filtre. */
  clearFilter: () => void
  /** Change le mode d'affichage des éléments écartés. */
  setDisplayMode: (mode: FilterDisplayMode) => void
  /** Sauvegarde la configuration de filtrage actuelle sous un nom. */
  saveFilter: (name: string) => SavedFilter | null
  /** Charge un filtre sauvegardé. */
  loadFilter: (filterId: string) => void
  /** Supprime un filtre sauvegardé. */
  deleteFilter: (filterId: string) => void
  /** Vrai si le noeud doit être retiré du rendu (mode hide). */
  isNodeHidden: (nodeId: string) => boolean
  /** Vrai si le noeud doit être estompé (mode dim). */
  isNodeDimmed: (nodeId: string) => boolean
  /** Vrai si l'arête doit être retirée du rendu (mode hide). */
  isEdgeHidden: (edge: Edge) => boolean
  /** Vrai si l'arête doit être estompée (mode dim). */
  isEdgeDimmed: (edge: Edge) => boolean
}

/**
 * Trait de filtrage des noeuds par requête DSL.
 *
 * La requête sélectionne un ensemble de noeuds ; selon `invertQuery`, ces
 * noeuds sont conservés (les autres sont écartés) ou masqués. La hiérarchie
 * est respectée : les ancêtres d'un noeud conservé restent visibles pour
 * préserver le contexte, et les descendants d'un noeud masqué sont masqués.
 *
 * Voir `utils/filter-dsl.ts` pour la grammaire complète du DSL.
 *
 * @example
 * ```typescript
 * const { setQuery, invertQuery, isNodeHidden } = useFilterable();
 * invertQuery.value = true;          // « masquer les correspondants »
 * setQuery('couche:technology');     // cache l'infrastructure
 * ```
 */
export function useFilterable(): FilterableState & FilterableHandlers {
  const graphStore = useGraphStore()

  // Résultat d'analyse de la requête, recalculé à chaque frappe.
  const parsed = computed(() => parseFilterQuery(query.value))

  const queryError = computed(() => (parsed.value.ok ? null : parsed.value.error))

  const isFilterActive = computed(() => query.value.trim().length > 0 && parsed.value.ok)

  /** Noeuds correspondant directement à la requête (sans fermeture hiérarchique). */
  const matchedNodeIds = computed(() => {
    const result = new Set<string>()
    const parseResult = parsed.value
    if (!isFilterActive.value || !parseResult.ok) return result
    for (const [id, node] of Object.entries(graphStore.nodes)) {
      if (parseResult.matches(node)) result.add(id)
    }
    return result
  })

  /**
   * Noeuds écartés par le filtre, avec fermeture hiérarchique :
   * - mode « conserver » : tout noeud hors de (correspondants ∪ leurs ancêtres)
   * - mode « masquer »   : correspondants ∪ leurs descendants
   */
  const excludedNodeIds = computed(() => {
    const excluded = new Set<string>()
    if (!isFilterActive.value) return excluded

    const matched = matchedNodeIds.value
    const nodes = graphStore.nodes

    if (invertQuery.value) {
      // Masquer les correspondants et leurs descendants.
      for (const id of matched) excluded.add(id)
      // Un noeud dont un ancêtre est masqué est masqué.
      for (const [id, node] of Object.entries(nodes)) {
        if (excluded.has(id)) continue
        let current: Node | undefined = node
        while (current?.parentId) {
          if (excluded.has(current.parentId)) {
            excluded.add(id)
            break
          }
          current = nodes[current.parentId]
        }
      }
    } else {
      // Conserver les correspondants et leurs ancêtres (contexte).
      const kept = new Set<string>(matched)
      for (const id of matched) {
        let current = nodes[id]
        while (current?.parentId) {
          kept.add(current.parentId)
          current = nodes[current.parentId]
        }
      }
      for (const id of Object.keys(nodes)) {
        if (!kept.has(id)) excluded.add(id)
      }
    }

    return excluded
  })

  const excludedCount = computed(() => excludedNodeIds.value.size)

  function setQuery(value: string) {
    query.value = value
  }

  function clearFilter() {
    query.value = ''
    invertQuery.value = false
  }

  function setDisplayMode(mode: FilterDisplayMode) {
    displayMode.value = mode
  }

  function saveFilter(name: string): SavedFilter | null {
    if (!query.value.trim()) return null
    const filter: SavedFilter = {
      id: `filter-${Date.now()}`,
      name,
      query: query.value,
      invert: invertQuery.value,
      displayMode: displayMode.value,
      createdAt: Date.now(),
    }
    savedFilters.value.push(filter)
    return filter
  }

  function loadFilter(filterId: string) {
    const filter = savedFilters.value.find((f) => f.id === filterId)
    if (filter) {
      query.value = filter.query
      invertQuery.value = filter.invert
      displayMode.value = filter.displayMode
    }
  }

  function deleteFilter(filterId: string) {
    savedFilters.value = savedFilters.value.filter((f) => f.id !== filterId)
  }

  function isNodeHidden(nodeId: string): boolean {
    if (displayMode.value !== 'hide') return false
    return excludedNodeIds.value.has(nodeId)
  }

  function isNodeDimmed(nodeId: string): boolean {
    if (displayMode.value !== 'dim') return false
    return excludedNodeIds.value.has(nodeId)
  }

  function isEdgeHidden(edge: Edge): boolean {
    if (displayMode.value !== 'hide') return false
    const excluded = excludedNodeIds.value
    return excluded.has(edge.sourceId) || excluded.has(edge.targetId)
  }

  function isEdgeDimmed(edge: Edge): boolean {
    if (displayMode.value !== 'dim') return false
    const excluded = excludedNodeIds.value
    return excluded.has(edge.sourceId) || excluded.has(edge.targetId)
  }

  return {
    query,
    queryError,
    invertQuery,
    displayMode,
    isFilterActive,
    matchedNodeIds,
    excludedNodeIds,
    excludedCount,
    savedFilters,
    setQuery,
    clearFilter,
    setDisplayMode,
    saveFilter,
    loadFilter,
    deleteFilter,
    isNodeHidden,
    isNodeDimmed,
    isEdgeHidden,
    isEdgeDimmed,
  }
}

/**
 * Requêtes prédéfinies, prêtes à appliquer via `setQuery`.
 * Pensées pour les vues « exécutives » : isoler une couche, masquer la technique.
 */
export const PRESET_QUERIES: { label: string; query: string; invert?: boolean }[] = [
  { label: 'Couche métier', query: 'couche:business' },
  { label: 'Couche applicative', query: 'couche:application' },
  { label: 'Infrastructure', query: 'couche:technology' },
  { label: 'Masquer l’infra', query: 'couche:technology', invert: true },
  { label: 'Conteneurs seuls', query: 'type:container' },
]
