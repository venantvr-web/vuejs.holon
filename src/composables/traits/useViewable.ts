// src/composables/traits/useViewable.ts
import { ref, watch, type Ref } from 'vue'
import { nanoid } from 'nanoid'

const STORAGE_KEY = 'holon.savedViews'

function loadFromStorage(): SavedView[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function saveToStorage(views: SavedView[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(views))
  } catch {
    // localStorage indisponible ou quota dépassé — ignorer silencieusement
  }
}

/**
 * Vue sauvegardée avec état complet de visualisation.
 */
export interface SavedView {
  /**
   * Identifiant unique de la vue.
   */
  id: string
  /**
   * Nom descriptif de la vue.
   */
  name: string
  /**
   * Niveau de zoom (1 = 100%).
   */
  zoom: number
  /**
   * Position du pan (translation du viewport).
   */
  pan: {
    x: number
    y: number
  }
  /**
   * Filtres actifs dans cette vue.
   */
  filters?: string[]
  /**
   * IDs des noeuds sélectionnés.
   */
  selection?: string[]
  /**
   * IDs des noeuds repliés.
   */
  collapsed?: string[]
  /**
   * Timestamp de création.
   */
  timestamp: number
  /**
   * Description optionnelle.
   */
  description?: string
}

/**
 * État réactif exposé par le trait Viewable.
 */
export interface ViewableState {
  /**
   * Liste de toutes les vues sauvegardées.
   */
  savedViews: Ref<SavedView[]>
  /**
   * Vue actuellement active (null si aucune).
   */
  activeView: Ref<SavedView | null>
}

/**
 * Handlers (actions) exposés par le trait Viewable.
 */
export interface ViewableHandlers {
  /**
   * Sauvegarde la vue actuelle avec un nom.
   * @param name - Nom de la vue à sauvegarder
   * @param currentState - État actuel à sauvegarder
   * @returns ID de la vue créée
   */
  saveView: (
    name: string,
    currentState: {
      zoom: number
      pan: { x: number; y: number }
      filters?: string[]
      selection?: string[]
      collapsed?: string[]
    }
  ) => string
  /**
   * Restaure une vue sauvegardée par son ID.
   * @param viewId - ID de la vue à restaurer
   * @param animate - Animer la transition (défaut: false)
   * @returns Vue restaurée ou null si introuvable
   */
  restoreView: (viewId: string, animate?: boolean) => SavedView | null
  /**
   * Supprime une vue sauvegardée.
   * @param viewId - ID de la vue à supprimer
   * @returns true si supprimé avec succès
   */
  deleteView: (viewId: string) => boolean
  /**
   * Met à jour une vue existante.
   * @param viewId - ID de la vue à mettre à jour
   * @param updates - Propriétés à mettre à jour
   */
  updateView: (viewId: string, updates: Partial<SavedView>) => void
  /**
   * Exporte toutes les vues en JSON.
   * @returns String JSON des vues
   */
  exportViews: () => string
  /**
   * Importe des vues depuis JSON.
   * @param json - String JSON à importer
   * @returns Nombre de vues importées
   */
  importViews: (json: string) => number
}

/**
 * Trait permettant de sauvegarder et restaurer différentes vues du graphe.
 *
 * Une vue capture l'état complet de visualisation : zoom, pan, filtres, sélection.
 * Utile pour créer des bookmarks de zones d'intérêt ou des perspectives différentes.
 *
 * @returns État réactif et handlers pour la gestion des vues
 *
 * @example
 * ```typescript
 * const { savedViews, saveView, restoreView } = useViewable();
 *
 * // Sauvegarder vue actuelle
 * const viewId = saveView('Vue d\'ensemble', {
 *   zoom: 1.5,
 *   pan: { x: 0, y: 0 },
 *   selection: ['node-1', 'node-2']
 * });
 *
 * // Restaurer plus tard
 * restoreView(viewId, true); // avec animation
 * ```
 */
// État global des vues sauvegardées (partagé entre toutes les instances).
const savedViews = ref<SavedView[]>(loadFromStorage())
const activeView = ref<SavedView | null>(null)

// Persiste automatiquement les vues en localStorage à chaque modification.
watch(savedViews, (views) => saveToStorage(views), { deep: true })

export function useViewable(): ViewableState & ViewableHandlers {
  /**
   * Sauvegarde la vue actuelle.
   */
  function saveView(
    name: string,
    currentState: {
      zoom: number
      pan: { x: number; y: number }
      filters?: string[]
      selection?: string[]
      collapsed?: string[]
    }
  ): string {
    const id = nanoid()

    const newView: SavedView = {
      id,
      name,
      zoom: currentState.zoom,
      pan: { ...currentState.pan },
      filters: currentState.filters ? [...currentState.filters] : undefined,
      selection: currentState.selection ? [...currentState.selection] : undefined,
      collapsed: currentState.collapsed ? [...currentState.collapsed] : undefined,
      timestamp: Date.now(),
    }

    savedViews.value.push(newView)
    activeView.value = newView

    return id
  }

  /**
   * Restaure une vue sauvegardée.
   */
  function restoreView(viewId: string, animate: boolean = false): SavedView | null {
    const view = savedViews.value.find((v) => v.id === viewId)

    if (!view) {
      console.warn(`Vue ${viewId} non trouvée`)
      return null
    }

    activeView.value = view

    // Émettre un événement personnalisé pour notifier le composant de canvas
    const event = new CustomEvent('restore-view', {
      detail: {
        view,
        animate,
      },
    })
    window.dispatchEvent(event)

    return view
  }

  /**
   * Supprime une vue.
   */
  function deleteView(viewId: string): boolean {
    const index = savedViews.value.findIndex((v) => v.id === viewId)

    if (index === -1) {
      return false
    }

    savedViews.value.splice(index, 1)

    // Si c'était la vue active, la réinitialiser
    if (activeView.value?.id === viewId) {
      activeView.value = null
    }

    return true
  }

  /**
   * Met à jour une vue existante.
   */
  function updateView(viewId: string, updates: Partial<SavedView>): void {
    const view = savedViews.value.find((v) => v.id === viewId)

    if (!view) {
      console.warn(`Vue ${viewId} non trouvée`)
      return
    }

    Object.assign(view, updates)

    // Mettre à jour activeView si c'est la vue active
    if (activeView.value?.id === viewId) {
      activeView.value = { ...view }
    }
  }

  /**
   * Exporte toutes les vues en JSON.
   */
  function exportViews(): string {
    return JSON.stringify(
      {
        version: '1.0',
        exportedAt: new Date().toISOString(),
        views: savedViews.value,
      },
      null,
      2
    )
  }

  /**
   * Importe des vues depuis JSON.
   */
  function importViews(json: string): number {
    try {
      const data = JSON.parse(json)

      if (!data.views || !Array.isArray(data.views)) {
        throw new Error('Format JSON invalide : propriété "views" manquante')
      }

      let imported = 0

      for (const view of data.views) {
        // Vérifier que l'ID n'existe pas déjà
        const exists = savedViews.value.some((v) => v.id === view.id)

        if (!exists) {
          savedViews.value.push(view)
          imported++
        }
      }

      return imported
    } catch (error) {
      console.error("Erreur lors de l'import des vues:", error)
      return 0
    }
  }

  return {
    savedViews,
    activeView,
    saveView,
    restoreView,
    deleteView,
    updateView,
    exportViews,
    importViews,
  }
}
