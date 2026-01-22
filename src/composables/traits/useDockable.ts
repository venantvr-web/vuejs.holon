// src/composables/traits/useDockable.ts
import { ref, computed, type Ref } from 'vue';
import { useGraphStore } from '../../stores/graph';
import { useGeometry } from '../useGeometry';

export interface DockableOptions {
  nodeId: Ref<string>;
  isDragging: Ref<boolean>;
}

export interface DockableState {
  potentialParent: Ref<string | null>;
  isDropTarget: Ref<boolean>;
}

export interface DockableHandlers {
  updatePotentialParent: () => void;
  commitDocking: () => void;
  undockFromParent: () => void;
}

export function useDockable(options: DockableOptions): DockableState & DockableHandlers {
  const graphStore = useGraphStore();
  const { getNodeAbsolutePosition, findContainerAtPoint, convertCoordinates } = useGeometry();

  const potentialParent = ref<string | null>(null);

  // Ce noeud est-il une cible de drop potentielle pour un autre noeud ?
  const isDropTarget = computed(() => {
    const node = graphStore.nodes[options.nodeId.value];
    return node?.type === 'container' && potentialParent.value === options.nodeId.value;
  });

  // Met à jour le parent potentiel basé sur la position actuelle du noeud
  function updatePotentialParent() {
    if (!options.isDragging.value) {
      potentialParent.value = null;
      return;
    }

    const node = graphStore.nodes[options.nodeId.value];
    if (!node) return;

    const absPos = getNodeAbsolutePosition(options.nodeId.value);
    const centerX = absPos.x + node.geometry.w / 2;
    const centerY = absPos.y + node.geometry.h / 2;

    potentialParent.value = findContainerAtPoint(centerX, centerY, options.nodeId.value);
  }

  // Valide le docking à la fin du drag
  function commitDocking() {
    if (potentialParent.value === null) {
      potentialParent.value = null;
      return;
    }

    const node = graphStore.nodes[options.nodeId.value];
    if (!node) return;

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

  return {
    potentialParent,
    isDropTarget,
    updatePotentialParent,
    commitDocking,
    undockFromParent,
  };
}
