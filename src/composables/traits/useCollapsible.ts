// src/composables/traits/useCollapsible.ts
import { computed, type Ref } from 'vue'
import { useGraphStore } from '../../stores/graph'

/**
 * Options de configuration pour le trait Collapsible.
 */
export interface CollapsibleOptions {
  /**
   * Référence réactive vers l'ID du noeud concerné.
   */
  nodeId: Ref<string>
}

/**
 * État réactif exposé par le trait Collapsible.
 */
export interface CollapsibleState {
  /**
   * Indique si le noeud est actuellement replié.
   */
  isCollapsed: Ref<boolean>
  /**
   * Indique si le noeud peut être replié (doit être un container avec enfants).
   */
  canCollapse: Ref<boolean>
  /**
   * Nombre d'enfants directs du noeud.
   */
  childCount: Ref<number>
}

/**
 * Handlers (actions) exposés par le trait Collapsible.
 */
export interface CollapsibleHandlers {
  /**
   * Replie le noeud pour masquer ses enfants.
   */
  collapse: () => void
  /**
   * Déplie le noeud pour afficher ses enfants.
   */
  expand: () => void
  /**
   * Bascule entre l'état replié et déplié.
   */
  toggle: () => void
  /**
   * Replie récursivement le noeud et tous ses descendants containers.
   */
  collapseAll: () => void
  /**
   * Déplie récursivement le noeud et tous ses descendants containers.
   */
  expandAll: () => void
}

/**
 * Trait permettant de replier/déplier les noeuds containers pour masquer/afficher leurs enfants.
 *
 * @param options - Configuration du trait
 * @returns État réactif et handlers pour le repliage/dépliage
 *
 * @example
 * ```typescript
 * const { isCollapsed, toggle, collapseAll } = useCollapsible({ nodeId: ref('container-123') });
 * toggle(); // Bascule l'état
 * collapseAll(); // Replie tout récursivement
 * ```
 */
export function useCollapsible(
  options: CollapsibleOptions
): CollapsibleState & CollapsibleHandlers {
  const graphStore = useGraphStore()

  const isCollapsed = computed({
    get: () => {
      const node = graphStore.nodes[options.nodeId.value]
      return node?.data?.collapsed === true
    },
    set: (value: boolean) => {
      const node = graphStore.nodes[options.nodeId.value]
      if (node) {
        graphStore.updateNode(options.nodeId.value, {
          data: {
            ...node.data,
            collapsed: value,
          },
        })
      }
    },
  })

  const canCollapse = computed(() => {
    const node = graphStore.nodes[options.nodeId.value]
    if (node?.type !== 'container') return false
    return Object.values(graphStore.nodes).some((n) => n.parentId === options.nodeId.value)
  })

  const childCount = computed(() => {
    return Object.values(graphStore.nodes).filter((n) => n.parentId === options.nodeId.value).length
  })

  function collapse() {
    if (canCollapse.value) {
      isCollapsed.value = true
    }
  }

  function expand() {
    isCollapsed.value = false
  }

  function toggle() {
    if (isCollapsed.value) {
      expand()
    } else {
      collapse()
    }
  }

  // Collapse récursif - ferme tous les containers enfants
  function collapseAll() {
    const collectDescendants = (parentId: string): string[] => {
      const children = Object.values(graphStore.nodes).filter((n) => n.parentId === parentId)
      let descendants: string[] = []
      for (const child of children) {
        if (child.type === 'container') {
          descendants.push(child.id)
          descendants = descendants.concat(collectDescendants(child.id))
        }
      }
      return descendants
    }

    // Collapse le noeud actuel et tous ses descendants containers
    collapse()
    const descendants = collectDescendants(options.nodeId.value)
    for (const id of descendants) {
      const node = graphStore.nodes[id]
      if (node) {
        graphStore.updateNode(id, {
          data: {
            ...node.data,
            collapsed: true,
          },
        })
      }
    }
  }

  // Expand récursif - ouvre tous les containers enfants
  function expandAll() {
    const collectDescendants = (parentId: string): string[] => {
      const children = Object.values(graphStore.nodes).filter((n) => n.parentId === parentId)
      let descendants: string[] = []
      for (const child of children) {
        if (child.type === 'container') {
          descendants.push(child.id)
          descendants = descendants.concat(collectDescendants(child.id))
        }
      }
      return descendants
    }

    // Expand le noeud actuel et tous ses descendants containers
    expand()
    const descendants = collectDescendants(options.nodeId.value)
    for (const id of descendants) {
      const node = graphStore.nodes[id]
      if (node) {
        graphStore.updateNode(id, {
          data: {
            ...node.data,
            collapsed: false,
          },
        })
      }
    }
  }

  return {
    isCollapsed: computed(() => isCollapsed.value),
    canCollapse,
    childCount,
    collapse,
    expand,
    toggle,
    collapseAll,
    expandAll,
  }
}
