// src/composables/traits/useCollapsible.ts
import { ref, computed, type Ref } from 'vue';
import { useGraphStore } from '../../stores/graph';

export interface CollapsibleOptions {
  nodeId: Ref<string>;
}

export interface CollapsibleState {
  isCollapsed: Ref<boolean>;
  canCollapse: Ref<boolean>;
  childCount: Ref<number>;
}

export interface CollapsibleHandlers {
  collapse: () => void;
  expand: () => void;
  toggle: () => void;
  collapseAll: () => void;
  expandAll: () => void;
}

export function useCollapsible(options: CollapsibleOptions): CollapsibleState & CollapsibleHandlers {
  const graphStore = useGraphStore();

  const isCollapsed = computed({
    get: () => {
      const node = graphStore.nodes[options.nodeId.value];
      return node?.data?.collapsed === true;
    },
    set: (value: boolean) => {
      const node = graphStore.nodes[options.nodeId.value];
      if (node) {
        graphStore.updateNode(options.nodeId.value, {
          data: {
            ...node.data,
            collapsed: value,
          },
        });
      }
    },
  });

  const canCollapse = computed(() => {
    const node = graphStore.nodes[options.nodeId.value];
    if (node?.type !== 'container') return false;
    return Object.values(graphStore.nodes).some(n => n.parentId === options.nodeId.value);
  });

  const childCount = computed(() => {
    return Object.values(graphStore.nodes).filter(n => n.parentId === options.nodeId.value).length;
  });

  function collapse() {
    if (canCollapse.value) {
      isCollapsed.value = true;
    }
  }

  function expand() {
    isCollapsed.value = false;
  }

  function toggle() {
    if (isCollapsed.value) {
      expand();
    } else {
      collapse();
    }
  }

  // Collapse récursif - ferme tous les containers enfants
  function collapseAll() {
    const collectDescendants = (parentId: string): string[] => {
      const children = Object.values(graphStore.nodes).filter(n => n.parentId === parentId);
      let descendants: string[] = [];
      for (const child of children) {
        if (child.type === 'container') {
          descendants.push(child.id);
          descendants = descendants.concat(collectDescendants(child.id));
        }
      }
      return descendants;
    };

    // Collapse le noeud actuel et tous ses descendants containers
    collapse();
    const descendants = collectDescendants(options.nodeId.value);
    for (const id of descendants) {
      const node = graphStore.nodes[id];
      if (node) {
        graphStore.updateNode(id, {
          data: {
            ...node.data,
            collapsed: true,
          },
        });
      }
    }
  }

  // Expand récursif - ouvre tous les containers enfants
  function expandAll() {
    const collectDescendants = (parentId: string): string[] => {
      const children = Object.values(graphStore.nodes).filter(n => n.parentId === parentId);
      let descendants: string[] = [];
      for (const child of children) {
        if (child.type === 'container') {
          descendants.push(child.id);
          descendants = descendants.concat(collectDescendants(child.id));
        }
      }
      return descendants;
    };

    // Expand le noeud actuel et tous ses descendants containers
    expand();
    const descendants = collectDescendants(options.nodeId.value);
    for (const id of descendants) {
      const node = graphStore.nodes[id];
      if (node) {
        graphStore.updateNode(id, {
          data: {
            ...node.data,
            collapsed: false,
          },
        });
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
  };
}
