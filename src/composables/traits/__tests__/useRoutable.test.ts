// src/composables/traits/__tests__/useRoutable.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useGraphStore } from '../../../stores/graph'
import type { Edge } from '../../../types'
import { calculateEdgeRoute, calculateArrowAngle, RoutingType } from '../useRoutable'

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
}))

describe('useRoutable', () => {
  let graphStore: ReturnType<typeof useGraphStore>

  beforeEach(() => {
    setActivePinia(createPinia())
    graphStore = useGraphStore()
  })

  describe('calculateArrowAngle', () => {
    it("calcule l'angle pour une direction vers la droite", () => {
      const angle = calculateArrowAngle(0, 0, 100, 0)
      expect(angle).toBe(0)
    })

    it("calcule l'angle pour une direction vers le bas", () => {
      const angle = calculateArrowAngle(0, 0, 0, 100)
      expect(angle).toBe(90)
    })

    it("calcule l'angle pour une direction vers la gauche", () => {
      const angle = calculateArrowAngle(0, 0, -100, 0)
      expect(angle).toBe(180)
    })

    it("calcule l'angle pour une direction vers le haut", () => {
      const angle = calculateArrowAngle(0, 0, 0, -100)
      expect(angle).toBe(-90)
    })

    it("calcule l'angle pour une diagonale", () => {
      const angle = calculateArrowAngle(0, 0, 100, 100)
      expect(angle).toBe(45)
    })
  })

  describe('calculateEdgeRoute', () => {
    it('calcule une route droite (Straight)', async () => {
      const source = await graphStore.createNode(
        {
          type: 'shape',
          geometry: { x: 0, y: 0, w: 100, h: 100 },
          styling: { fill: '#fff', stroke: '#333', strokeWidth: 1, opacity: 1 },
          data: { name: 'Source' },
        },
        null
      )
      const target = await graphStore.createNode(
        {
          type: 'shape',
          geometry: { x: 200, y: 0, w: 100, h: 100 },
          styling: { fill: '#fff', stroke: '#333', strokeWidth: 1, opacity: 1 },
          data: { name: 'Target' },
        },
        null
      )
      const edge = await graphStore.createEdge(source.id, target.id)

      const route = calculateEdgeRoute(edge!, graphStore.nodes, RoutingType.Straight)

      expect(route).not.toBeNull()
      expect(route!.path).toContain('M')
      expect(route!.path).toContain('L')
      // Le path doit aller du bord droit de source au bord gauche de target
      expect(route!.sourcePoint.x).toBe(100) // Bord droit de source
      expect(route!.targetPoint.x).toBe(200) // Bord gauche de target
    })

    it('calcule une route orthogonale horizontale', async () => {
      const source = await graphStore.createNode(
        {
          type: 'shape',
          geometry: { x: 0, y: 0, w: 100, h: 100 },
          styling: { fill: '#fff', stroke: '#333', strokeWidth: 1, opacity: 1 },
          data: { name: 'Source' },
        },
        null
      )
      const target = await graphStore.createNode(
        {
          type: 'shape',
          geometry: { x: 300, y: 50, w: 100, h: 100 },
          styling: { fill: '#fff', stroke: '#333', strokeWidth: 1, opacity: 1 },
          data: { name: 'Target' },
        },
        null
      )
      const edge = await graphStore.createEdge(source.id, target.id)

      const route = calculateEdgeRoute(edge!, graphStore.nodes, RoutingType.Orthogonal)

      expect(route).not.toBeNull()
      expect(route!.path).toContain('H') // Horizontal
      expect(route!.path).toContain('V') // Vertical
    })

    it('calcule une route courbe (Curved)', async () => {
      const source = await graphStore.createNode(
        {
          type: 'shape',
          geometry: { x: 0, y: 0, w: 100, h: 100 },
          styling: { fill: '#fff', stroke: '#333', strokeWidth: 1, opacity: 1 },
          data: { name: 'Source' },
        },
        null
      )
      const target = await graphStore.createNode(
        {
          type: 'shape',
          geometry: { x: 200, y: 200, w: 100, h: 100 },
          styling: { fill: '#fff', stroke: '#333', strokeWidth: 1, opacity: 1 },
          data: { name: 'Target' },
        },
        null
      )
      const edge = await graphStore.createEdge(source.id, target.id)

      const route = calculateEdgeRoute(edge!, graphStore.nodes, RoutingType.Curved)

      expect(route).not.toBeNull()
      expect(route!.path).toContain('Q') // Courbe quadratique
    })

    it('calcule une route Bézier', async () => {
      const source = await graphStore.createNode(
        {
          type: 'shape',
          geometry: { x: 0, y: 0, w: 100, h: 100 },
          styling: { fill: '#fff', stroke: '#333', strokeWidth: 1, opacity: 1 },
          data: { name: 'Source' },
        },
        null
      )
      const target = await graphStore.createNode(
        {
          type: 'shape',
          geometry: { x: 200, y: 200, w: 100, h: 100 },
          styling: { fill: '#fff', stroke: '#333', strokeWidth: 1, opacity: 1 },
          data: { name: 'Target' },
        },
        null
      )
      const edge = await graphStore.createEdge(source.id, target.id)

      const route = calculateEdgeRoute(edge!, graphStore.nodes, RoutingType.Bezier)

      expect(route).not.toBeNull()
      expect(route!.path).toContain('C') // Courbe cubique de Bézier
    })

    it("retourne null si le noeud source n'existe pas", async () => {
      const target = await graphStore.createNode(
        {
          type: 'shape',
          geometry: { x: 200, y: 0, w: 100, h: 100 },
          styling: { fill: '#fff', stroke: '#333', strokeWidth: 1, opacity: 1 },
          data: { name: 'Target' },
        },
        null
      )

      const fakeEdge: Edge = {
        id: 'fake',
        sourceId: 'nonexistent',
        targetId: target.id,
        routing: 'straight',
      }
      const route = calculateEdgeRoute(fakeEdge, graphStore.nodes, RoutingType.Straight)

      expect(route).toBeNull()
    })

    it("retourne null si le noeud target n'existe pas", async () => {
      const source = await graphStore.createNode(
        {
          type: 'shape',
          geometry: { x: 0, y: 0, w: 100, h: 100 },
          styling: { fill: '#fff', stroke: '#333', strokeWidth: 1, opacity: 1 },
          data: { name: 'Source' },
        },
        null
      )

      const fakeEdge: Edge = {
        id: 'fake',
        sourceId: source.id,
        targetId: 'nonexistent',
        routing: 'straight',
      }
      const route = calculateEdgeRoute(fakeEdge, graphStore.nodes, RoutingType.Straight)

      expect(route).toBeNull()
    })
  })

  describe('route avec noeuds imbriqués', () => {
    it('calcule correctement les intersections pour des noeuds enfants', async () => {
      const parent1 = await graphStore.createNode(
        {
          type: 'container',
          geometry: { x: 0, y: 0, w: 200, h: 200 },
          styling: { fill: '#fff', stroke: '#333', strokeWidth: 1, opacity: 1 },
          data: { name: 'Parent1' },
        },
        null
      )
      const child1 = await graphStore.createNode(
        {
          type: 'shape',
          geometry: { x: 50, y: 50, w: 50, h: 50 },
          styling: { fill: '#fff', stroke: '#333', strokeWidth: 1, opacity: 1 },
          data: { name: 'Child1' },
        },
        parent1.id
      )

      const parent2 = await graphStore.createNode(
        {
          type: 'container',
          geometry: { x: 400, y: 0, w: 200, h: 200 },
          styling: { fill: '#fff', stroke: '#333', strokeWidth: 1, opacity: 1 },
          data: { name: 'Parent2' },
        },
        null
      )
      const child2 = await graphStore.createNode(
        {
          type: 'shape',
          geometry: { x: 50, y: 50, w: 50, h: 50 },
          styling: { fill: '#fff', stroke: '#333', strokeWidth: 1, opacity: 1 },
          data: { name: 'Child2' },
        },
        parent2.id
      )

      const edge = await graphStore.createEdge(child1.id, child2.id)
      const route = calculateEdgeRoute(edge!, graphStore.nodes, RoutingType.Straight)

      expect(route).not.toBeNull()

      // Child1 position absolue: (0+50, 0+50) avec taille (50, 50)
      // Centre: (75, 75), bord droit: x=100
      expect(route!.sourcePoint.x).toBe(100)

      // Child2 position absolue: (400+50, 0+50) avec taille (50, 50)
      // Centre: (475, 75), bord gauche: x=450
      expect(route!.targetPoint.x).toBe(450)
    })
  })
})
