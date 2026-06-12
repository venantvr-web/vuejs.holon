// src/composables/traits/__tests__/useResizable.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { ref } from 'vue'
import { useGraphStore } from '../../../stores/graph'
import { useResizable, DEFAULT_AUTOSIZE_CONFIG } from '../useResizable'

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

describe('useResizable - Autosize', () => {
  let graphStore: ReturnType<typeof useGraphStore>

  beforeEach(() => {
    setActivePinia(createPinia())
    graphStore = useGraphStore()
  })

  describe('calculateChildrenBounds', () => {
    it("retourne null si le parent n'a pas d'enfants", async () => {
      const parent = await graphStore.createNode(
        {
          type: 'container',
          geometry: { x: 0, y: 0, w: 200, h: 200 },
          styling: { fill: '#fff', stroke: '#333', strokeWidth: 1, opacity: 1 },
          data: { name: 'Parent' },
        },
        null
      )

      const nodeId = ref(parent.id)
      const { calculateChildrenBounds } = useResizable({ nodeId })

      const bounds = calculateChildrenBounds()
      expect(bounds).toBeNull()
    })

    it('calcule les bounds corrects pour un seul enfant', async () => {
      const parent = await graphStore.createNode(
        {
          type: 'container',
          geometry: { x: 0, y: 0, w: 200, h: 200 },
          styling: { fill: '#fff', stroke: '#333', strokeWidth: 1, opacity: 1 },
          data: { name: 'Parent' },
        },
        null
      )
      await graphStore.createNode(
        {
          type: 'shape',
          geometry: { x: 30, y: 40, w: 50, h: 60 },
          styling: { fill: '#fff', stroke: '#333', strokeWidth: 1, opacity: 1 },
          data: { name: 'Child' },
        },
        parent.id
      )

      const nodeId = ref(parent.id)
      const { calculateChildrenBounds } = useResizable({ nodeId })

      const bounds = calculateChildrenBounds()
      expect(bounds).not.toBeNull()
      expect(bounds!.minX).toBe(30)
      expect(bounds!.minY).toBe(40)
      expect(bounds!.maxX).toBe(80) // 30 + 50
      expect(bounds!.maxY).toBe(100) // 40 + 60
      expect(bounds!.width).toBe(50)
      expect(bounds!.height).toBe(60)
      expect(bounds!.childCount).toBe(1)
    })

    it('calcule les bounds corrects pour plusieurs enfants', async () => {
      const parent = await graphStore.createNode(
        {
          type: 'container',
          geometry: { x: 0, y: 0, w: 300, h: 300 },
          styling: { fill: '#fff', stroke: '#333', strokeWidth: 1, opacity: 1 },
          data: { name: 'Parent' },
        },
        null
      )

      // Enfant 1: en haut à gauche
      await graphStore.createNode(
        {
          type: 'shape',
          geometry: { x: 10, y: 10, w: 40, h: 30 },
          styling: { fill: '#fff', stroke: '#333', strokeWidth: 1, opacity: 1 },
          data: { name: 'Child1' },
        },
        parent.id
      )

      // Enfant 2: en bas à droite
      await graphStore.createNode(
        {
          type: 'shape',
          geometry: { x: 100, y: 150, w: 60, h: 40 },
          styling: { fill: '#fff', stroke: '#333', strokeWidth: 1, opacity: 1 },
          data: { name: 'Child2' },
        },
        parent.id
      )

      // Enfant 3: au milieu
      await graphStore.createNode(
        {
          type: 'shape',
          geometry: { x: 50, y: 80, w: 30, h: 30 },
          styling: { fill: '#fff', stroke: '#333', strokeWidth: 1, opacity: 1 },
          data: { name: 'Child3' },
        },
        parent.id
      )

      const nodeId = ref(parent.id)
      const { calculateChildrenBounds } = useResizable({ nodeId })

      const bounds = calculateChildrenBounds()
      expect(bounds).not.toBeNull()
      expect(bounds!.minX).toBe(10) // Child1.x
      expect(bounds!.minY).toBe(10) // Child1.y
      expect(bounds!.maxX).toBe(160) // Child2.x + Child2.w = 100 + 60
      expect(bounds!.maxY).toBe(190) // Child2.y + Child2.h = 150 + 40
      expect(bounds!.width).toBe(150) // 160 - 10
      expect(bounds!.height).toBe(180) // 190 - 10
      expect(bounds!.childCount).toBe(3)
    })

    it('gère les enfants avec des coordonnées négatives', async () => {
      const parent = await graphStore.createNode(
        {
          type: 'container',
          geometry: { x: 0, y: 0, w: 200, h: 200 },
          styling: { fill: '#fff', stroke: '#333', strokeWidth: 1, opacity: 1 },
          data: { name: 'Parent' },
        },
        null
      )

      await graphStore.createNode(
        {
          type: 'shape',
          geometry: { x: -20, y: -10, w: 40, h: 30 },
          styling: { fill: '#fff', stroke: '#333', strokeWidth: 1, opacity: 1 },
          data: { name: 'Child1' },
        },
        parent.id
      )

      await graphStore.createNode(
        {
          type: 'shape',
          geometry: { x: 50, y: 60, w: 40, h: 30 },
          styling: { fill: '#fff', stroke: '#333', strokeWidth: 1, opacity: 1 },
          data: { name: 'Child2' },
        },
        parent.id
      )

      const nodeId = ref(parent.id)
      const { calculateChildrenBounds } = useResizable({ nodeId })

      const bounds = calculateChildrenBounds()
      expect(bounds).not.toBeNull()
      expect(bounds!.minX).toBe(-20)
      expect(bounds!.minY).toBe(-10)
      expect(bounds!.maxX).toBe(90) // 50 + 40
      expect(bounds!.maxY).toBe(90) // 60 + 30
    })
  })

  describe('applyAutosize', () => {
    it('redimensionne le parent pour englober les enfants avec padding', async () => {
      const parent = await graphStore.createNode(
        {
          type: 'container',
          geometry: { x: 0, y: 0, w: 100, h: 100 },
          styling: { fill: '#fff', stroke: '#333', strokeWidth: 1, opacity: 1 },
          data: { name: 'Parent', autosize: true },
        },
        null
      )

      await graphStore.createNode(
        {
          type: 'shape',
          geometry: { x: 20, y: 20, w: 50, h: 40 },
          styling: { fill: '#fff', stroke: '#333', strokeWidth: 1, opacity: 1 },
          data: { name: 'Child' },
        },
        parent.id
      )

      const nodeId = ref(parent.id)
      const { applyAutosize, effectivePadding } = useResizable({ nodeId })

      applyAutosize()

      const padding = effectivePadding.value
      const paddingTop = DEFAULT_AUTOSIZE_CONFIG.paddingTop
      const updatedParent = graphStore.nodes[parent.id]

      // Largeur = bounds.width + 2*padding = 50 + 2*20 = 90
      // Hauteur = bounds.height + paddingTop + padding = 40 + 35 + 20 = 95
      expect(updatedParent.geometry.w).toBe(50 + padding * 2)
      expect(updatedParent.geometry.h).toBe(40 + paddingTop + padding)
    })

    it('décale les enfants pour respecter le padding gauche/haut', async () => {
      const parent = await graphStore.createNode(
        {
          type: 'container',
          geometry: { x: 0, y: 0, w: 200, h: 200 },
          styling: { fill: '#fff', stroke: '#333', strokeWidth: 1, opacity: 1 },
          data: { name: 'Parent', autosize: true },
        },
        null
      )

      // Enfant positionné à (5, 5) - trop proche du bord
      const child = await graphStore.createNode(
        {
          type: 'shape',
          geometry: { x: 5, y: 5, w: 50, h: 40 },
          styling: { fill: '#fff', stroke: '#333', strokeWidth: 1, opacity: 1 },
          data: { name: 'Child' },
        },
        parent.id
      )

      const nodeId = ref(parent.id)
      const { applyAutosize, effectivePadding } = useResizable({ nodeId })

      applyAutosize()

      const padding = effectivePadding.value
      const paddingTop = DEFAULT_AUTOSIZE_CONFIG.paddingTop
      const updatedChild = graphStore.nodes[child.id]

      // L'enfant doit être décalé pour être à (padding, paddingTop)
      expect(updatedChild.geometry.x).toBe(padding)
      expect(updatedChild.geometry.y).toBe(paddingTop)
    })

    it('décale tous les enfants ensemble pour préserver leurs positions relatives', async () => {
      const parent = await graphStore.createNode(
        {
          type: 'container',
          geometry: { x: 0, y: 0, w: 200, h: 200 },
          styling: { fill: '#fff', stroke: '#333', strokeWidth: 1, opacity: 1 },
          data: { name: 'Parent', autosize: true },
        },
        null
      )

      const child1 = await graphStore.createNode(
        {
          type: 'shape',
          geometry: { x: 5, y: 10, w: 30, h: 20 },
          styling: { fill: '#fff', stroke: '#333', strokeWidth: 1, opacity: 1 },
          data: { name: 'Child1' },
        },
        parent.id
      )

      const child2 = await graphStore.createNode(
        {
          type: 'shape',
          geometry: { x: 55, y: 60, w: 30, h: 20 },
          styling: { fill: '#fff', stroke: '#333', strokeWidth: 1, opacity: 1 },
          data: { name: 'Child2' },
        },
        parent.id
      )

      const nodeId = ref(parent.id)
      const { applyAutosize } = useResizable({ nodeId })

      const initialOffset = {
        x: child2.geometry.x - child1.geometry.x,
        y: child2.geometry.y - child1.geometry.y,
      }

      applyAutosize()

      const updatedChild1 = graphStore.nodes[child1.id]
      const updatedChild2 = graphStore.nodes[child2.id]

      // Les positions relatives doivent être préservées
      const finalOffset = {
        x: updatedChild2.geometry.x - updatedChild1.geometry.x,
        y: updatedChild2.geometry.y - updatedChild1.geometry.y,
      }

      expect(finalOffset.x).toBe(initialOffset.x)
      expect(finalOffset.y).toBe(initialOffset.y)
    })

    it('gère les enfants avec coordonnées négatives', async () => {
      const parent = await graphStore.createNode(
        {
          type: 'container',
          geometry: { x: 100, y: 100, w: 200, h: 200 },
          styling: { fill: '#fff', stroke: '#333', strokeWidth: 1, opacity: 1 },
          data: { name: 'Parent', autosize: true },
        },
        null
      )

      // Enfant avec coordonnées négatives
      const child = await graphStore.createNode(
        {
          type: 'shape',
          geometry: { x: -30, y: -20, w: 50, h: 40 },
          styling: { fill: '#fff', stroke: '#333', strokeWidth: 1, opacity: 1 },
          data: { name: 'Child' },
        },
        parent.id
      )

      const nodeId = ref(parent.id)
      const { applyAutosize, effectivePadding } = useResizable({ nodeId })

      applyAutosize()

      const padding = effectivePadding.value
      const paddingTop = DEFAULT_AUTOSIZE_CONFIG.paddingTop
      const updatedChild = graphStore.nodes[child.id]
      const updatedParent = graphStore.nodes[parent.id]

      // L'enfant doit être repositionné à (padding, paddingTop)
      expect(updatedChild.geometry.x).toBe(padding)
      expect(updatedChild.geometry.y).toBe(paddingTop)

      // Le parent doit avoir la bonne taille (largeur: 2*padding, hauteur: paddingTop + padding)
      expect(updatedParent.geometry.w).toBe(50 + padding * 2)
      expect(updatedParent.geometry.h).toBe(40 + paddingTop + padding)
    })

    it('ne fait rien si autosize est désactivé', async () => {
      const parent = await graphStore.createNode(
        {
          type: 'container',
          geometry: { x: 0, y: 0, w: 100, h: 100 },
          styling: { fill: '#fff', stroke: '#333', strokeWidth: 1, opacity: 1 },
          data: { name: 'Parent', autosize: false },
        },
        null
      )

      await graphStore.createNode(
        {
          type: 'shape',
          geometry: { x: 20, y: 20, w: 200, h: 200 },
          styling: { fill: '#fff', stroke: '#333', strokeWidth: 1, opacity: 1 },
          data: { name: 'Child' },
        },
        parent.id
      )

      const nodeId = ref(parent.id)
      const { applyAutosize } = useResizable({ nodeId })

      applyAutosize()

      const updatedParent = graphStore.nodes[parent.id]

      // Le parent ne doit pas avoir changé
      expect(updatedParent.geometry.w).toBe(100)
      expect(updatedParent.geometry.h).toBe(100)
    })
  })

  describe('effectivePadding avec zoom', () => {
    it('ajuste le padding selon le zoom', async () => {
      const parent = await graphStore.createNode(
        {
          type: 'container',
          geometry: { x: 0, y: 0, w: 200, h: 200 },
          styling: { fill: '#fff', stroke: '#333', strokeWidth: 1, opacity: 1 },
          data: { name: 'Parent' },
        },
        null
      )

      const nodeId = ref(parent.id)
      const zoomLevel = ref(1)

      const { effectivePadding } = useResizable({ nodeId, zoomLevel })

      // À zoom 1, padding normal
      const paddingAtZoom1 = effectivePadding.value
      expect(paddingAtZoom1).toBe(DEFAULT_AUTOSIZE_CONFIG.padding)

      // À zoom 4, padding plus grand (sqrt(4) = 2)
      zoomLevel.value = 4
      const paddingAtZoom4 = effectivePadding.value
      expect(paddingAtZoom4).toBeGreaterThan(paddingAtZoom1)
    })
  })

  describe('fitToChildren', () => {
    it("applique l'autosize même si désactivé puis le désactive", async () => {
      const parent = await graphStore.createNode(
        {
          type: 'container',
          geometry: { x: 0, y: 0, w: 50, h: 50 },
          styling: { fill: '#fff', stroke: '#333', strokeWidth: 1, opacity: 1 },
          data: { name: 'Parent', autosize: false },
        },
        null
      )

      await graphStore.createNode(
        {
          type: 'shape',
          geometry: { x: 20, y: 20, w: 100, h: 80 },
          styling: { fill: '#fff', stroke: '#333', strokeWidth: 1, opacity: 1 },
          data: { name: 'Child' },
        },
        parent.id
      )

      const nodeId = ref(parent.id)
      const { fitToChildren, autosize, effectivePadding } = useResizable({ nodeId })

      expect(autosize.value).toBe(false)

      fitToChildren() // l'état autosize persistant doit être préservé

      const padding = effectivePadding.value
      const paddingTop = DEFAULT_AUTOSIZE_CONFIG.paddingTop
      const updatedParent = graphStore.nodes[parent.id]

      // Le parent doit être redimensionné (largeur: 2*padding, hauteur: paddingTop + padding)
      expect(updatedParent.geometry.w).toBe(100 + padding * 2)
      expect(updatedParent.geometry.h).toBe(80 + paddingTop + padding)
    })
  })
})
