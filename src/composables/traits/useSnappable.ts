// src/composables/traits/useSnappable.ts
import { ref, computed, type Ref } from 'vue';
import { useGraphStore } from '../../stores/graph';

export interface SnapConfig {
  gridSize: number;
  snapToGrid: boolean;
  snapToNodes: boolean;
  snapToGuides: boolean;
  snapDistance: number; // Distance en pixels pour le snap
}

export interface SnapGuide {
  type: 'horizontal' | 'vertical';
  position: number;
  sourceNodeId?: string;
}

export interface SnappableOptions {
  nodeId: Ref<string>;
  config?: Partial<SnapConfig>;
}

export interface SnappableState {
  isSnapping: Ref<boolean>;
  activeGuides: Ref<SnapGuide[]>;
  config: Ref<SnapConfig>;
}

export interface SnappableHandlers {
  snapPosition: (x: number, y: number) => { x: number; y: number; guides: SnapGuide[] };
  snapSize: (w: number, h: number) => { w: number; h: number };
  setConfig: (config: Partial<SnapConfig>) => void;
  toggleGridSnap: () => void;
  toggleNodeSnap: () => void;
}

// Configuration globale du snap
const globalConfig = ref<SnapConfig>({
  gridSize: 20,
  snapToGrid: true,
  snapToNodes: true,
  snapToGuides: false,
  snapDistance: 10,
});

// Guides personnalisés (globaux)
const customGuides = ref<SnapGuide[]>([]);

export function useSnappable(options: SnappableOptions): SnappableState & SnappableHandlers {
  const graphStore = useGraphStore();

  const isSnapping = ref(false);
  const activeGuides = ref<SnapGuide[]>([]);

  // Merge la config locale avec la globale
  if (options.config) {
    Object.assign(globalConfig.value, options.config);
  }

  function snapToGrid(value: number, gridSize: number): number {
    return Math.round(value / gridSize) * gridSize;
  }

  function snapPosition(x: number, y: number): { x: number; y: number; guides: SnapGuide[] } {
    const config = globalConfig.value;
    let snappedX = x;
    let snappedY = y;
    const guides: SnapGuide[] = [];
    const node = graphStore.nodes[options.nodeId.value];

    if (!node) return { x, y, guides: [] };

    const nodeW = node.geometry.w;
    const nodeH = node.geometry.h;

    // Snap to grid
    if (config.snapToGrid) {
      snappedX = snapToGrid(x, config.gridSize);
      snappedY = snapToGrid(y, config.gridSize);
    }

    // Snap to other nodes
    if (config.snapToNodes) {
      const siblings = Object.values(graphStore.nodes).filter(
        n => n.id !== options.nodeId.value && n.parentId === node.parentId
      );

      for (const sibling of siblings) {
        const sx = sibling.geometry.x;
        const sy = sibling.geometry.y;
        const sw = sibling.geometry.w;
        const sh = sibling.geometry.h;

        // Points de référence du noeud courant
        const nodeLeft = x;
        const nodeRight = x + nodeW;
        const nodeCenterX = x + nodeW / 2;
        const nodeTop = y;
        const nodeBottom = y + nodeH;
        const nodeCenterY = y + nodeH / 2;

        // Points de référence du sibling
        const sibLeft = sx;
        const sibRight = sx + sw;
        const sibCenterX = sx + sw / 2;
        const sibTop = sy;
        const sibBottom = sy + sh;
        const sibCenterY = sy + sh / 2;

        // Snap horizontal (alignement vertical)
        // Left to left
        if (Math.abs(nodeLeft - sibLeft) < config.snapDistance) {
          snappedX = sibLeft;
          guides.push({ type: 'vertical', position: sibLeft, sourceNodeId: sibling.id });
        }
        // Right to right
        else if (Math.abs(nodeRight - sibRight) < config.snapDistance) {
          snappedX = sibRight - nodeW;
          guides.push({ type: 'vertical', position: sibRight, sourceNodeId: sibling.id });
        }
        // Left to right
        else if (Math.abs(nodeLeft - sibRight) < config.snapDistance) {
          snappedX = sibRight;
          guides.push({ type: 'vertical', position: sibRight, sourceNodeId: sibling.id });
        }
        // Right to left
        else if (Math.abs(nodeRight - sibLeft) < config.snapDistance) {
          snappedX = sibLeft - nodeW;
          guides.push({ type: 'vertical', position: sibLeft, sourceNodeId: sibling.id });
        }
        // Center to center
        else if (Math.abs(nodeCenterX - sibCenterX) < config.snapDistance) {
          snappedX = sibCenterX - nodeW / 2;
          guides.push({ type: 'vertical', position: sibCenterX, sourceNodeId: sibling.id });
        }

        // Snap vertical (alignement horizontal)
        // Top to top
        if (Math.abs(nodeTop - sibTop) < config.snapDistance) {
          snappedY = sibTop;
          guides.push({ type: 'horizontal', position: sibTop, sourceNodeId: sibling.id });
        }
        // Bottom to bottom
        else if (Math.abs(nodeBottom - sibBottom) < config.snapDistance) {
          snappedY = sibBottom - nodeH;
          guides.push({ type: 'horizontal', position: sibBottom, sourceNodeId: sibling.id });
        }
        // Top to bottom
        else if (Math.abs(nodeTop - sibBottom) < config.snapDistance) {
          snappedY = sibBottom;
          guides.push({ type: 'horizontal', position: sibBottom, sourceNodeId: sibling.id });
        }
        // Bottom to top
        else if (Math.abs(nodeBottom - sibTop) < config.snapDistance) {
          snappedY = sibTop - nodeH;
          guides.push({ type: 'horizontal', position: sibTop, sourceNodeId: sibling.id });
        }
        // Center to center
        else if (Math.abs(nodeCenterY - sibCenterY) < config.snapDistance) {
          snappedY = sibCenterY - nodeH / 2;
          guides.push({ type: 'horizontal', position: sibCenterY, sourceNodeId: sibling.id });
        }
      }
    }

    // Snap to custom guides
    if (config.snapToGuides) {
      for (const guide of customGuides.value) {
        if (guide.type === 'vertical') {
          if (Math.abs(x - guide.position) < config.snapDistance) {
            snappedX = guide.position;
            guides.push(guide);
          } else if (Math.abs(x + nodeW - guide.position) < config.snapDistance) {
            snappedX = guide.position - nodeW;
            guides.push(guide);
          }
        } else {
          if (Math.abs(y - guide.position) < config.snapDistance) {
            snappedY = guide.position;
            guides.push(guide);
          } else if (Math.abs(y + nodeH - guide.position) < config.snapDistance) {
            snappedY = guide.position - nodeH;
            guides.push(guide);
          }
        }
      }
    }

    activeGuides.value = guides;
    isSnapping.value = guides.length > 0;

    return { x: snappedX, y: snappedY, guides };
  }

  function snapSize(w: number, h: number): { w: number; h: number } {
    const config = globalConfig.value;

    if (!config.snapToGrid) {
      return { w, h };
    }

    return {
      w: snapToGrid(w, config.gridSize),
      h: snapToGrid(h, config.gridSize),
    };
  }

  function setConfig(config: Partial<SnapConfig>) {
    Object.assign(globalConfig.value, config);
  }

  function toggleGridSnap() {
    globalConfig.value.snapToGrid = !globalConfig.value.snapToGrid;
  }

  function toggleNodeSnap() {
    globalConfig.value.snapToNodes = !globalConfig.value.snapToNodes;
  }

  return {
    isSnapping,
    activeGuides,
    config: globalConfig,
    snapPosition,
    snapSize,
    setConfig,
    toggleGridSnap,
    toggleNodeSnap,
  };
}

// État global pour le canvas
export function useSnapState() {
  return {
    config: globalConfig,
    customGuides,
    addGuide: (guide: SnapGuide) => {
      customGuides.value.push(guide);
    },
    removeGuide: (index: number) => {
      customGuides.value.splice(index, 1);
    },
    clearGuides: () => {
      customGuides.value = [];
    },
  };
}
