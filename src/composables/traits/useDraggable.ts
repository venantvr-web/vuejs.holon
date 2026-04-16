// src/composables/traits/useDraggable.ts
import { ref, type Ref } from 'vue';
import { useGraphStore } from '../../stores/graph';

/**
 * Options de configuration pour le trait Draggable.
 */
export interface DraggableOptions {
  /**
   * Référence réactive vers l'ID du noeud concerné.
   */
  nodeId: Ref<string>;
  /**
   * Niveau de zoom actuel pour ajuster les déplacements.
   */
  zoomLevel?: Ref<number>;
  /**
   * Callback appelé au début du glissement.
   */
  onDragStart?: () => void;
  /**
   * Callback appelé pendant le glissement.
   * @param dx - Déplacement horizontal
   * @param dy - Déplacement vertical
   */
  onDragMove?: (dx: number, dy: number) => void;
  /**
   * Callback appelé à la fin du glissement.
   */
  onDragEnd?: () => void;
  /**
   * Si true, notifie le parent pour qu'il recalcule son autosize.
   */
  notifyParentOnMove?: boolean;
}

/**
 * État réactif exposé par le trait Draggable.
 */
export interface DraggableState {
  /**
   * Indique si le noeud est actuellement en cours de glissement.
   */
  isDragging: Ref<boolean>;
  /**
   * Delta de déplacement depuis le début du glissement.
   */
  dragDelta: Ref<{ x: number; y: number }>;
}

/**
 * Handlers (actions) exposés par le trait Draggable.
 */
export interface DraggableHandlers {
  /**
   * Démarre le glissement du noeud.
   * @param event - Événement de souris déclencheur
   */
  handleDragStart: (event: MouseEvent) => void;
}

/**
 * Trait permettant de rendre un noeud déplaçable par glisser-déposer.
 *
 * Gère automatiquement le zoom, les callbacks, et la notification du parent
 * pour les recalculs d'autosize des containers.
 *
 * @param options - Configuration du trait
 * @returns État réactif et handlers pour le glissement
 *
 * @example
 * ```typescript
 * const { isDragging, handleDragStart } = useDraggable({
 *   nodeId: ref('node-123'),
 *   zoomLevel: ref(1.5)
 * });
 * ```
 */
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
