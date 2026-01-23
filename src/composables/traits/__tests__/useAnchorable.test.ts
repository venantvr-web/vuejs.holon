// src/composables/traits/__tests__/useAnchorable.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { ref } from 'vue';
import { useGraphStore } from '../../../stores/graph';
import {
  useAnchorable,
  calculateEdgeIntersection,
  getNodeCenter,
  AnchorPosition,
} from '../useAnchorable';

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

describe('useAnchorable', () => {
  let graphStore: ReturnType<typeof useGraphStore>;

  beforeEach(() => {
    setActivePinia(createPinia());
    graphStore = useGraphStore();
  });

  describe('getNodeCenter', () => {
    it('calcule le centre d\'un noeud simple', async () => {
      const node = await graphStore.createNode(
        { label: 'Node', type: 'box', geometry: { x: 100, y: 50, w: 80, h: 60 }, data: {} },
        null
      );

      const center = getNodeCenter(node.id, graphStore.nodes);

      expect(center.x).toBe(140); // 100 + 80/2
      expect(center.y).toBe(80);  // 50 + 60/2
    });

    it('calcule le centre absolu d\'un noeud enfant', async () => {
      const parent = await graphStore.createNode(
        { label: 'Parent', type: 'container', geometry: { x: 100, y: 100, w: 200, h: 200 }, data: {} },
        null
      );

      const child = await graphStore.createNode(
        { label: 'Child', type: 'box', geometry: { x: 20, y: 30, w: 40, h: 40 }, data: {} },
        parent.id
      );

      const center = getNodeCenter(child.id, graphStore.nodes);

      // Position absolue: parent.x + child.x + child.w/2
      expect(center.x).toBe(100 + 20 + 20); // 140
      expect(center.y).toBe(100 + 30 + 20); // 150
    });

    it('calcule le centre pour une hiérarchie profonde', async () => {
      const grandParent = await graphStore.createNode(
        { label: 'GrandParent', type: 'container', geometry: { x: 50, y: 50, w: 300, h: 300 }, data: {} },
        null
      );

      const parent = await graphStore.createNode(
        { label: 'Parent', type: 'container', geometry: { x: 30, y: 30, w: 200, h: 200 }, data: {} },
        grandParent.id
      );

      const child = await graphStore.createNode(
        { label: 'Child', type: 'box', geometry: { x: 10, y: 10, w: 20, h: 20 }, data: {} },
        parent.id
      );

      const center = getNodeCenter(child.id, graphStore.nodes);

      // Position absolue: grandParent + parent + child + child.size/2
      expect(center.x).toBe(50 + 30 + 10 + 10); // 100
      expect(center.y).toBe(50 + 30 + 10 + 10); // 100
    });
  });

  describe('calculateEdgeIntersection', () => {
    it('calcule l\'intersection sur le bord droit', async () => {
      const node = await graphStore.createNode(
        { label: 'Node', type: 'box', geometry: { x: 0, y: 0, w: 100, h: 100 }, data: {} },
        null
      );

      // Cible à droite du noeud
      const intersection = calculateEdgeIntersection(node.id, 200, 50, graphStore.nodes);

      expect(intersection.x).toBe(100); // Bord droit
      expect(intersection.y).toBe(50);  // Centre vertical
    });

    it('calcule l\'intersection sur le bord gauche', async () => {
      const node = await graphStore.createNode(
        { label: 'Node', type: 'box', geometry: { x: 100, y: 0, w: 100, h: 100 }, data: {} },
        null
      );

      // Cible à gauche du noeud
      const intersection = calculateEdgeIntersection(node.id, 0, 50, graphStore.nodes);

      expect(intersection.x).toBe(100); // Bord gauche
      expect(intersection.y).toBe(50);  // Centre vertical
    });

    it('calcule l\'intersection sur le bord haut', async () => {
      const node = await graphStore.createNode(
        { label: 'Node', type: 'box', geometry: { x: 0, y: 100, w: 100, h: 100 }, data: {} },
        null
      );

      // Cible au-dessus du noeud
      const intersection = calculateEdgeIntersection(node.id, 50, 0, graphStore.nodes);

      expect(intersection.x).toBe(50);  // Centre horizontal
      expect(intersection.y).toBe(100); // Bord haut
    });

    it('calcule l\'intersection sur le bord bas', async () => {
      const node = await graphStore.createNode(
        { label: 'Node', type: 'box', geometry: { x: 0, y: 0, w: 100, h: 100 }, data: {} },
        null
      );

      // Cible en dessous du noeud
      const intersection = calculateEdgeIntersection(node.id, 50, 200, graphStore.nodes);

      expect(intersection.x).toBe(50);  // Centre horizontal
      expect(intersection.y).toBe(100); // Bord bas
    });

    it('calcule l\'intersection en diagonale (coin)', async () => {
      const node = await graphStore.createNode(
        { label: 'Node', type: 'box', geometry: { x: 0, y: 0, w: 100, h: 100 }, data: {} },
        null
      );

      // Cible en diagonale bas-droite (à 45°)
      const intersection = calculateEdgeIntersection(node.id, 200, 200, graphStore.nodes);

      // Devrait toucher le coin bas-droit
      expect(intersection.x).toBe(100);
      expect(intersection.y).toBe(100);
    });

    it('retourne le centre si la cible est au centre', async () => {
      const node = await graphStore.createNode(
        { label: 'Node', type: 'box', geometry: { x: 0, y: 0, w: 100, h: 100 }, data: {} },
        null
      );

      // Cible au centre du noeud
      const intersection = calculateEdgeIntersection(node.id, 50, 50, graphStore.nodes);

      expect(intersection.x).toBe(50);
      expect(intersection.y).toBe(50);
    });
  });

  describe('useAnchorable composable', () => {
    it('retourne tous les points d\'ancrage', async () => {
      const node = await graphStore.createNode(
        { label: 'Node', type: 'box', geometry: { x: 0, y: 0, w: 100, h: 100 }, data: {} },
        null
      );

      const nodeId = ref(node.id);
      const { anchors } = useAnchorable({ nodeId });

      expect(anchors.value.length).toBe(9); // 8 points + centre

      // Vérifier quelques points
      const north = anchors.value.find(a => a.position === AnchorPosition.North);
      expect(north).toBeDefined();
      expect(north!.x).toBe(50);  // Centre horizontal
      expect(north!.y).toBe(0);   // Bord haut

      const south = anchors.value.find(a => a.position === AnchorPosition.South);
      expect(south).toBeDefined();
      expect(south!.x).toBe(50);
      expect(south!.y).toBe(100);

      const east = anchors.value.find(a => a.position === AnchorPosition.East);
      expect(east).toBeDefined();
      expect(east!.x).toBe(100);
      expect(east!.y).toBe(50);
    });

    it('trouve l\'ancre la plus proche', async () => {
      const node = await graphStore.createNode(
        { label: 'Node', type: 'box', geometry: { x: 0, y: 0, w: 100, h: 100 }, data: {} },
        null
      );

      const nodeId = ref(node.id);
      const { getNearestAnchor } = useAnchorable({ nodeId });

      // Point proche du bord droit
      const nearEast = getNearestAnchor(150, 50);
      expect(nearEast.position).toBe(AnchorPosition.East);

      // Point proche du bord haut
      const nearNorth = getNearestAnchor(50, -20);
      expect(nearNorth.position).toBe(AnchorPosition.North);
    });

    it('getAnchorPoint retourne le bon point', async () => {
      const node = await graphStore.createNode(
        { label: 'Node', type: 'box', geometry: { x: 100, y: 100, w: 80, h: 60 }, data: {} },
        null
      );

      const nodeId = ref(node.id);
      const { getAnchorPoint } = useAnchorable({ nodeId });

      const northEast = getAnchorPoint(AnchorPosition.NorthEast);
      expect(northEast.x).toBe(180); // 100 + 80
      expect(northEast.y).toBe(100); // 100

      const southWest = getAnchorPoint(AnchorPosition.SouthWest);
      expect(southWest.x).toBe(100); // 100
      expect(southWest.y).toBe(160); // 100 + 60
    });
  });
});
