// src/composables/traits/useAlignable.ts
import { computed } from 'vue';
import { useGraphStore } from '../../stores/graph';
import { useSelectionState } from './useSelectable';

export type AlignmentType =
  | 'left'
  | 'center-h'
  | 'right'
  | 'top'
  | 'center-v'
  | 'bottom';

export type DistributionType = 'horizontal' | 'vertical';

export interface AlignableHandlers {
  alignNodes: (type: AlignmentType, nodeIds?: string[]) => void;
  distributeNodes: (type: DistributionType, nodeIds?: string[]) => void;
  matchWidth: (nodeIds?: string[]) => void;
  matchHeight: (nodeIds?: string[]) => void;
  matchSize: (nodeIds?: string[]) => void;
}

export function useAlignable(): AlignableHandlers {
  const graphStore = useGraphStore();
  const { selectedNodeIds } = useSelectionState();

  function getTargetNodeIds(nodeIds?: string[]): string[] {
    return nodeIds ?? Array.from(selectedNodeIds.value);
  }

  function alignNodes(type: AlignmentType, nodeIds?: string[]) {
    const ids = getTargetNodeIds(nodeIds);
    if (ids.length < 2) return;

    const nodes = ids.map(id => graphStore.nodes[id]).filter(Boolean);
    if (nodes.length < 2) return;

    // Calculer les bounds
    const bounds = {
      minX: Math.min(...nodes.map(n => n.geometry.x)),
      maxX: Math.max(...nodes.map(n => n.geometry.x + n.geometry.w)),
      minY: Math.min(...nodes.map(n => n.geometry.y)),
      maxY: Math.max(...nodes.map(n => n.geometry.y + n.geometry.h)),
    };

    const centerX = (bounds.minX + bounds.maxX) / 2;
    const centerY = (bounds.minY + bounds.maxY) / 2;

    for (const node of nodes) {
      let newX = node.geometry.x;
      let newY = node.geometry.y;

      switch (type) {
        case 'left':
          newX = bounds.minX;
          break;
        case 'center-h':
          newX = centerX - node.geometry.w / 2;
          break;
        case 'right':
          newX = bounds.maxX - node.geometry.w;
          break;
        case 'top':
          newY = bounds.minY;
          break;
        case 'center-v':
          newY = centerY - node.geometry.h / 2;
          break;
        case 'bottom':
          newY = bounds.maxY - node.geometry.h;
          break;
      }

      graphStore.updateNode(node.id, {
        geometry: {
          ...node.geometry,
          x: newX,
          y: newY,
        },
      });
    }
  }

  function distributeNodes(type: DistributionType, nodeIds?: string[]) {
    const ids = getTargetNodeIds(nodeIds);
    if (ids.length < 3) return;

    const nodes = ids.map(id => graphStore.nodes[id]).filter(Boolean);
    if (nodes.length < 3) return;

    if (type === 'horizontal') {
      // Trier par position X
      const sorted = [...nodes].sort((a, b) => a.geometry.x - b.geometry.x);
      const first = sorted[0];
      const last = sorted[sorted.length - 1];

      // Calculer l'espace total disponible
      const totalWidth = sorted.reduce((sum, n) => sum + n.geometry.w, 0);
      const totalSpace = last.geometry.x + last.geometry.w - first.geometry.x;
      const gap = (totalSpace - totalWidth) / (sorted.length - 1);

      // Repositionner les noeuds intermédiaires
      let currentX = first.geometry.x + first.geometry.w + gap;
      for (let i = 1; i < sorted.length - 1; i++) {
        graphStore.updateNode(sorted[i].id, {
          geometry: {
            ...sorted[i].geometry,
            x: currentX,
          },
        });
        currentX += sorted[i].geometry.w + gap;
      }
    } else {
      // Trier par position Y
      const sorted = [...nodes].sort((a, b) => a.geometry.y - b.geometry.y);
      const first = sorted[0];
      const last = sorted[sorted.length - 1];

      const totalHeight = sorted.reduce((sum, n) => sum + n.geometry.h, 0);
      const totalSpace = last.geometry.y + last.geometry.h - first.geometry.y;
      const gap = (totalSpace - totalHeight) / (sorted.length - 1);

      let currentY = first.geometry.y + first.geometry.h + gap;
      for (let i = 1; i < sorted.length - 1; i++) {
        graphStore.updateNode(sorted[i].id, {
          geometry: {
            ...sorted[i].geometry,
            y: currentY,
          },
        });
        currentY += sorted[i].geometry.h + gap;
      }
    }
  }

  function matchWidth(nodeIds?: string[]) {
    const ids = getTargetNodeIds(nodeIds);
    if (ids.length < 2) return;

    const nodes = ids.map(id => graphStore.nodes[id]).filter(Boolean);
    if (nodes.length < 2) return;

    // Utiliser la largeur max
    const maxWidth = Math.max(...nodes.map(n => n.geometry.w));

    for (const node of nodes) {
      graphStore.updateNode(node.id, {
        geometry: {
          ...node.geometry,
          w: maxWidth,
        },
      });
    }
  }

  function matchHeight(nodeIds?: string[]) {
    const ids = getTargetNodeIds(nodeIds);
    if (ids.length < 2) return;

    const nodes = ids.map(id => graphStore.nodes[id]).filter(Boolean);
    if (nodes.length < 2) return;

    const maxHeight = Math.max(...nodes.map(n => n.geometry.h));

    for (const node of nodes) {
      graphStore.updateNode(node.id, {
        geometry: {
          ...node.geometry,
          h: maxHeight,
        },
      });
    }
  }

  function matchSize(nodeIds?: string[]) {
    const ids = getTargetNodeIds(nodeIds);
    if (ids.length < 2) return;

    const nodes = ids.map(id => graphStore.nodes[id]).filter(Boolean);
    if (nodes.length < 2) return;

    const maxWidth = Math.max(...nodes.map(n => n.geometry.w));
    const maxHeight = Math.max(...nodes.map(n => n.geometry.h));

    for (const node of nodes) {
      graphStore.updateNode(node.id, {
        geometry: {
          ...node.geometry,
          w: maxWidth,
          h: maxHeight,
        },
      });
    }
  }

  return {
    alignNodes,
    distributeNodes,
    matchWidth,
    matchHeight,
    matchSize,
  };
}
