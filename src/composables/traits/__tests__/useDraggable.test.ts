// src/composables/traits/__tests__/useDraggable.test.ts
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { ref } from 'vue';
import { useGraphStore } from '../../../stores/graph';
import { useDraggable } from '../useDraggable';
import { useSnapState } from '../useSnappable';

// Mock de la base de données
vi.mock('../../../db', () => ({
  db: {
    nodes: {
      put: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      clear: vi.fn(),
      toArray: vi.fn().mockResolvedValue([]),
    },
    edges: {
      put: vi.fn(),
      delete: vi.fn(),
      clear: vi.fn(),
      toArray: vi.fn().mockResolvedValue([]),
    },
  },
}));

describe('useDraggable', () => {
  let graphStore: ReturnType<typeof useGraphStore>;
  let addEventListenerSpy: ReturnType<typeof vi.spyOn>;
  let removeEventListenerSpy: ReturnType<typeof vi.spyOn>;
  let dispatchEventSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    setActivePinia(createPinia());
    graphStore = useGraphStore();
    addEventListenerSpy = vi.spyOn(window, 'addEventListener');
    removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');
    dispatchEventSpy = vi.spyOn(window, 'dispatchEvent');
    // Désactiver le magnétisme pour que les tests mesurent le drag brut.
    const { config } = useSnapState();
    config.value.snapToGrid = false;
    config.value.snapToNodes = false;
  });

  afterEach(() => {
    addEventListenerSpy.mockRestore();
    removeEventListenerSpy.mockRestore();
    dispatchEventSpy.mockRestore();
  });

  describe('handleDragStart', () => {
    it('initialise le drag avec les bonnes valeurs', async () => {
      const node = await graphStore.createNode(
        { label: 'Node', type: 'box', geometry: { x: 100, y: 100, w: 80, h: 60 }, data: {} },
        null
      );

      const nodeId = ref(node.id);
      const { handleDragStart, isDragging } = useDraggable({ nodeId });

      const event = new MouseEvent('mousedown', {
        clientX: 150,
        clientY: 130,
        button: 0,
      });
      event.stopPropagation = vi.fn();

      handleDragStart(event);

      expect(isDragging.value).toBe(true);
      expect(event.stopPropagation).toHaveBeenCalled();
      expect(addEventListenerSpy).toHaveBeenCalledWith('mousemove', expect.any(Function));
      expect(addEventListenerSpy).toHaveBeenCalledWith('mouseup', expect.any(Function));
    });

    it('ignore les clics non-gauches', async () => {
      const node = await graphStore.createNode(
        { label: 'Node', type: 'box', geometry: { x: 100, y: 100, w: 80, h: 60 }, data: {} },
        null
      );

      const nodeId = ref(node.id);
      const { handleDragStart, isDragging } = useDraggable({ nodeId });

      // Clic droit
      const rightClick = new MouseEvent('mousedown', {
        clientX: 150,
        clientY: 130,
        button: 2,
      });

      handleDragStart(rightClick);

      expect(isDragging.value).toBe(false);
    });

    it('appelle le callback onDragStart', async () => {
      const node = await graphStore.createNode(
        { label: 'Node', type: 'box', geometry: { x: 100, y: 100, w: 80, h: 60 }, data: {} },
        null
      );

      const onDragStart = vi.fn();
      const nodeId = ref(node.id);
      const { handleDragStart } = useDraggable({ nodeId, onDragStart });

      const event = new MouseEvent('mousedown', { clientX: 150, clientY: 130, button: 0 });
      event.stopPropagation = vi.fn();

      handleDragStart(event);

      expect(onDragStart).toHaveBeenCalled();
    });
  });

  describe('notifyParentAutosize', () => {
    it('émet un événement child-moved à la fin du drag pour un noeud enfant', async () => {
      const parent = await graphStore.createNode(
        { label: 'Parent', type: 'container', geometry: { x: 0, y: 0, w: 200, h: 200 }, data: {} },
        null
      );

      const child = await graphStore.createNode(
        { label: 'Child', type: 'box', geometry: { x: 20, y: 20, w: 50, h: 40 }, data: {} },
        parent.id
      );

      const nodeId = ref(child.id);
      const { handleDragStart } = useDraggable({ nodeId });

      // Simuler le drag
      const mousedown = new MouseEvent('mousedown', { clientX: 45, clientY: 40, button: 0 });
      mousedown.stopPropagation = vi.fn();
      handleDragStart(mousedown);

      // Simuler mouseup
      const mouseupHandler = addEventListenerSpy.mock.calls.find(
        call => call[0] === 'mouseup'
      )?.[1] as EventListener;

      mouseupHandler(new MouseEvent('mouseup'));

      // Vérifier que l'événement a été émis
      expect(dispatchEventSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'child-moved',
        })
      );

      const dispatchedEvent = dispatchEventSpy.mock.calls[0][0] as CustomEvent;
      expect(dispatchedEvent.detail.childId).toBe(child.id);
      expect(dispatchedEvent.detail.parentId).toBe(parent.id);
    });

    it('n\'émet pas d\'événement pour un noeud racine', async () => {
      const node = await graphStore.createNode(
        { label: 'Node', type: 'box', geometry: { x: 100, y: 100, w: 80, h: 60 }, data: {} },
        null
      );

      const nodeId = ref(node.id);
      const { handleDragStart } = useDraggable({ nodeId });

      const mousedown = new MouseEvent('mousedown', { clientX: 140, clientY: 130, button: 0 });
      mousedown.stopPropagation = vi.fn();
      handleDragStart(mousedown);

      // Simuler mouseup
      const mouseupHandler = addEventListenerSpy.mock.calls.find(
        call => call[0] === 'mouseup'
      )?.[1] as EventListener;

      mouseupHandler(new MouseEvent('mouseup'));

      // Pas d'événement child-moved pour un noeud racine
      expect(dispatchEventSpy).not.toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'child-moved',
        })
      );
    });

    it('peut être désactivé avec notifyParentOnMove=false', async () => {
      const parent = await graphStore.createNode(
        { label: 'Parent', type: 'container', geometry: { x: 0, y: 0, w: 200, h: 200 }, data: {} },
        null
      );

      const child = await graphStore.createNode(
        { label: 'Child', type: 'box', geometry: { x: 20, y: 20, w: 50, h: 40 }, data: {} },
        parent.id
      );

      const nodeId = ref(child.id);
      const { handleDragStart } = useDraggable({ nodeId, notifyParentOnMove: false });

      const mousedown = new MouseEvent('mousedown', { clientX: 45, clientY: 40, button: 0 });
      mousedown.stopPropagation = vi.fn();
      handleDragStart(mousedown);

      // Simuler mouseup
      const mouseupHandler = addEventListenerSpy.mock.calls.find(
        call => call[0] === 'mouseup'
      )?.[1] as EventListener;

      mouseupHandler(new MouseEvent('mouseup'));

      // Pas d'événement car désactivé
      expect(dispatchEventSpy).not.toHaveBeenCalled();
    });
  });

  describe('zoom level', () => {
    it('ajuste le déplacement selon le niveau de zoom', async () => {
      const node = await graphStore.createNode(
        { label: 'Node', type: 'box', geometry: { x: 100, y: 100, w: 80, h: 60 }, data: {} },
        null
      );

      const nodeId = ref(node.id);
      const zoomLevel = ref(2); // Zoom x2
      const { handleDragStart, dragDelta } = useDraggable({ nodeId, zoomLevel });

      // Démarrer le drag
      const mousedown = new MouseEvent('mousedown', { clientX: 140, clientY: 130, button: 0 });
      mousedown.stopPropagation = vi.fn();
      handleDragStart(mousedown);

      // Simuler mousemove de 100px en écran
      const mousemoveHandler = addEventListenerSpy.mock.calls.find(
        call => call[0] === 'mousemove'
      )?.[1] as EventListener;

      mousemoveHandler(new MouseEvent('mousemove', { clientX: 240, clientY: 230 }));

      // À zoom x2, un déplacement de 100px écran = 50px dans le canvas
      expect(dragDelta.value.x).toBe(50);
      expect(dragDelta.value.y).toBe(50);

      // Vérifier que le noeud a été déplacé de 50px
      const updatedNode = graphStore.nodes[node.id];
      expect(updatedNode.geometry.x).toBe(150); // 100 + 50
      expect(updatedNode.geometry.y).toBe(150); // 100 + 50
    });
  });
});
