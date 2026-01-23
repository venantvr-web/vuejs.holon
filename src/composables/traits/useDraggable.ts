// src/composables/traits/useDraggable.ts
import { ref, type Ref } from 'vue';
import { useGraphStore } from '../../stores/graph';

export interface DraggableOptions {
  nodeId: Ref<string>;
  zoomLevel?: Ref<number>;
  onDragStart?: () => void;
  onDragMove?: (dx: number, dy: number) => void;
  onDragEnd?: () => void;
  /** Si true, notifie le parent pour qu'il recalcule son autosize */
  notifyParentOnMove?: boolean;
}

export interface DraggableState {
  isDragging: Ref<boolean>;
  dragDelta: Ref<{ x: number; y: number }>;
}

export interface DraggableHandlers {
  handleDragStart: (event: MouseEvent) => void;
}

export function useDraggable(options: DraggableOptions): DraggableState & DraggableHandlers {
  const graphStore = useGraphStore();

  const isDragging = ref(false);
  const dragStart = ref({ x: 0, y: 0 });
  const initialPos = ref({ x: 0, y: 0 });
  const dragDelta = ref({ x: 0, y: 0 });

  function handleDragStart(event: MouseEvent) {
    if (event.button !== 0) return;

    const node = graphStore.nodes[options.nodeId.value];
    if (!node) return;

    event.stopPropagation();
    isDragging.value = true;
    dragStart.value = { x: event.clientX, y: event.clientY };
    initialPos.value = { x: node.geometry.x, y: node.geometry.y };
    dragDelta.value = { x: 0, y: 0 };

    options.onDragStart?.();

    window.addEventListener('mousemove', handleDragMove);
    window.addEventListener('mouseup', handleDragEnd);
  }

  function handleDragMove(event: MouseEvent) {
    if (!isDragging.value) return;

    const zoom = options.zoomLevel?.value ?? 1;
    const dx = (event.clientX - dragStart.value.x) / zoom;
    const dy = (event.clientY - dragStart.value.y) / zoom;

    dragDelta.value = { x: dx, y: dy };

    const node = graphStore.nodes[options.nodeId.value];
    if (!node) return;

    graphStore.updateNode(options.nodeId.value, {
      geometry: {
        ...node.geometry,
        x: initialPos.value.x + dx,
        y: initialPos.value.y + dy,
      },
    });

    options.onDragMove?.(dx, dy);
  }

  function handleDragEnd() {
    isDragging.value = false;

    // Notifier le parent pour recalculer l'autosize
    if (options.notifyParentOnMove !== false) {
      notifyParentAutosize();
    }

    options.onDragEnd?.();

    window.removeEventListener('mousemove', handleDragMove);
    window.removeEventListener('mouseup', handleDragEnd);
  }

  /** Notifie le parent que cet enfant a bougé, pour déclencher l'autosize */
  function notifyParentAutosize() {
    const node = graphStore.nodes[options.nodeId.value];
    if (!node?.parentId) return;

    // Émettre un événement custom que le parent peut écouter
    // On utilise un CustomEvent sur window pour découpler les composants
    window.dispatchEvent(new CustomEvent('child-moved', {
      detail: {
        childId: options.nodeId.value,
        parentId: node.parentId,
      }
    }));
  }

  return {
    isDragging,
    dragDelta,
    handleDragStart,
  };
}
