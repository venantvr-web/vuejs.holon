// src/composables/traits/useZIndexable.ts
import { ref, computed, type Ref } from 'vue';
import { useGraphStore } from '../../stores/graph';

export interface ZIndexableOptions {
  nodeId: Ref<string>;
}

export interface ZIndexableState {
  zIndex: Ref<number>;
}

export interface ZIndexableHandlers {
  bringToFront: () => void;
  sendToBack: () => void;
  bringForward: () => void;
  sendBackward: () => void;
  setZIndex: (z: number) => void;
}

// État global pour le z-index max
const globalMaxZIndex = ref(0);

export function useZIndexable(options: ZIndexableOptions): ZIndexableState & ZIndexableHandlers {
  const graphStore = useGraphStore();

  const zIndex = computed(() => {
    const node = graphStore.nodes[options.nodeId.value];
    return node?.data?.zIndex ?? 0;
  });

  function setZIndex(z: number) {
    const node = graphStore.nodes[options.nodeId.value];
    if (!node) return;

    graphStore.updateNode(options.nodeId.value, {
      data: {
        ...node.data,
        zIndex: z,
      },
    });

    // Mettre à jour le max global
    if (z > globalMaxZIndex.value) {
      globalMaxZIndex.value = z;
    }
  }

  function bringToFront() {
    // Récupérer tous les noeuds au même niveau (même parent)
    const node = graphStore.nodes[options.nodeId.value];
    if (!node) return;

    const siblings = Object.values(graphStore.nodes).filter(n => n.parentId === node.parentId);
    const maxZ = Math.max(...siblings.map(n => n.data?.zIndex ?? 0));
    setZIndex(maxZ + 1);
  }

  function sendToBack() {
    const node = graphStore.nodes[options.nodeId.value];
    if (!node) return;

    const siblings = Object.values(graphStore.nodes).filter(n => n.parentId === node.parentId);
    const minZ = Math.min(...siblings.map(n => n.data?.zIndex ?? 0));
    setZIndex(minZ - 1);
  }

  function bringForward() {
    const node = graphStore.nodes[options.nodeId.value];
    if (!node) return;

    const currentZ = node.data?.zIndex ?? 0;
    const siblings = Object.values(graphStore.nodes).filter(n => n.parentId === node.parentId);

    // Trouver le noeud juste au-dessus
    const above = siblings
      .filter(n => (n.data?.zIndex ?? 0) > currentZ)
      .sort((a, b) => (a.data?.zIndex ?? 0) - (b.data?.zIndex ?? 0))[0];

    if (above) {
      const aboveZ = above.data?.zIndex ?? 0;
      // Échanger les z-index
      setZIndex(aboveZ);
      graphStore.updateNode(above.id, {
        data: {
          ...above.data,
          zIndex: currentZ,
        },
      });
    }
  }

  function sendBackward() {
    const node = graphStore.nodes[options.nodeId.value];
    if (!node) return;

    const currentZ = node.data?.zIndex ?? 0;
    const siblings = Object.values(graphStore.nodes).filter(n => n.parentId === node.parentId);

    // Trouver le noeud juste en-dessous
    const below = siblings
      .filter(n => (n.data?.zIndex ?? 0) < currentZ)
      .sort((a, b) => (b.data?.zIndex ?? 0) - (a.data?.zIndex ?? 0))[0];

    if (below) {
      const belowZ = below.data?.zIndex ?? 0;
      // Échanger les z-index
      setZIndex(belowZ);
      graphStore.updateNode(below.id, {
        data: {
          ...below.data,
          zIndex: currentZ,
        },
      });
    }
  }

  return {
    zIndex,
    bringToFront,
    sendToBack,
    bringForward,
    sendBackward,
    setZIndex,
  };
}

// Export pour le tri des noeuds dans le canvas
export function useZIndexState() {
  return {
    globalMaxZIndex,
    sortByZIndex: <T extends { data?: { zIndex?: number } }>(nodes: T[]): T[] => {
      return [...nodes].sort((a, b) => (a.data?.zIndex ?? 0) - (b.data?.zIndex ?? 0));
    },
  };
}
