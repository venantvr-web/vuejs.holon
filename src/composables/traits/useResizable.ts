// src/composables/traits/useResizable.ts
import { ref, type Ref } from 'vue';
import { useGraphStore } from '../../stores/graph';

export interface ResizableOptions {
  nodeId: Ref<string>;
  zoomLevel?: Ref<number>;
  minSize?: number;
  preserveAspectRatio?: boolean;
  onResizeStart?: () => void;
  onResizeEnd?: () => void;
}

export interface ResizableState {
  isResizing: Ref<boolean>;
}

export interface ResizableHandlers {
  handleResizeStart: (event: MouseEvent) => void;
}

interface GeometrySnapshot {
  x: number;
  y: number;
  w: number;
  h: number;
}

export function useResizable(options: ResizableOptions): ResizableState & ResizableHandlers {
  const graphStore = useGraphStore();
  const minSize = options.minSize ?? 30;

  const isResizing = ref(false);
  const dragStart = ref({ x: 0, y: 0 });
  const initialSize = ref({ w: 0, h: 0 });
  const initialChildrenGeometry = ref<Map<string, GeometrySnapshot>>(new Map());

  // Collecte récursive de la géométrie des enfants
  function collectChildrenGeometry(parentId: string, map: Map<string, GeometrySnapshot>) {
    const children = Object.values(graphStore.nodes).filter(n => n.parentId === parentId);
    for (const child of children) {
      map.set(child.id, { ...child.geometry });
      collectChildrenGeometry(child.id, map);
    }
  }

  function handleResizeStart(event: MouseEvent) {
    event.preventDefault();
    event.stopPropagation();

    const node = graphStore.nodes[options.nodeId.value];
    if (!node) return;

    isResizing.value = true;
    dragStart.value = { x: event.clientX, y: event.clientY };
    initialSize.value = { w: node.geometry.w, h: node.geometry.h };

    // Snapshot de tous les enfants
    initialChildrenGeometry.value.clear();
    collectChildrenGeometry(options.nodeId.value, initialChildrenGeometry.value);

    options.onResizeStart?.();

    window.addEventListener('mousemove', handleResizeMove);
    window.addEventListener('mouseup', handleResizeEnd);
  }

  function handleResizeMove(event: MouseEvent) {
    if (!isResizing.value) return;

    const node = graphStore.nodes[options.nodeId.value];
    if (!node) return;

    const zoom = options.zoomLevel?.value ?? 1;
    const dx = (event.clientX - dragStart.value.x) / zoom;
    const dy = (event.clientY - dragStart.value.y) / zoom;

    let newW: number;
    let newH: number;

    if (options.preserveAspectRatio) {
      // Redimensionnement proportionnel
      const aspectRatio = initialSize.value.w / initialSize.value.h;
      const diagonal = Math.sqrt(dx * dx + dy * dy);
      const direction = (dx + dy) > 0 ? 1 : -1;
      const scale = 1 + (direction * diagonal * 0.005);

      newW = Math.max(minSize, initialSize.value.w * scale);
      newH = Math.max(minSize, initialSize.value.h * scale);

      // Ajuster pour garder le ratio
      if (newW / newH > aspectRatio) {
        newW = newH * aspectRatio;
      } else {
        newH = newW / aspectRatio;
      }
    } else {
      // Redimensionnement libre
      newW = Math.max(minSize, initialSize.value.w + dx);
      newH = Math.max(minSize, initialSize.value.h + dy);
    }

    // Facteurs d'échelle pour les enfants
    const scaleX = newW / initialSize.value.w;
    const scaleY = newH / initialSize.value.h;

    // Mettre à jour le noeud
    graphStore.updateNode(options.nodeId.value, {
      geometry: {
        ...node.geometry,
        w: newW,
        h: newH,
      },
    });

    // Redimensionner les enfants
    resizeChildrenFromSnapshot(options.nodeId.value, scaleX, scaleY);
  }

  function resizeChildrenFromSnapshot(parentId: string, scaleX: number, scaleY: number) {
    const children = Object.values(graphStore.nodes).filter(n => n.parentId === parentId);

    for (const child of children) {
      const initial = initialChildrenGeometry.value.get(child.id);
      if (!initial) continue;

      const childMinSize = 20;
      graphStore.updateNode(child.id, {
        geometry: {
          x: initial.x * scaleX,
          y: initial.y * scaleY,
          w: Math.max(childMinSize, initial.w * scaleX),
          h: Math.max(childMinSize, initial.h * scaleY),
        },
      });

      // Récursion
      resizeChildrenFromSnapshot(child.id, scaleX, scaleY);
    }
  }

  function handleResizeEnd() {
    isResizing.value = false;
    initialChildrenGeometry.value.clear();
    options.onResizeEnd?.();

    window.removeEventListener('mousemove', handleResizeMove);
    window.removeEventListener('mouseup', handleResizeEnd);
  }

  return {
    isResizing,
    handleResizeStart,
  };
}
