// src/composables/traits/__tests__/useClipboardable.spec.ts
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import type { Node } from '../../../types'

vi.mock('../../../db', () => {
  const table = () => ({
    put: vi.fn().mockResolvedValue(undefined),
    delete: vi.fn().mockResolvedValue(undefined),
    clear: vi.fn().mockResolvedValue(undefined),
    bulkPut: vi.fn().mockResolvedValue(undefined),
    bulkDelete: vi.fn().mockResolvedValue(undefined),
    toArray: vi.fn().mockResolvedValue([]),
    update: vi.fn().mockResolvedValue(undefined),
  })
  return {
    db: {
      nodes: table(),
      edges: table(),
      library: table(),
      transaction: vi.fn(async (_mode, _t1, _t2, fn) => fn()),
    },
  }
})

import { useGraphStore } from '../../../stores/graph'
import { useClipboardable } from '../useClipboardable'
import { useSelectionState } from '../useSelectable'

function makeNode(id: string, parentId: string | null = null, overrides: Partial<Node> = {}): Node {
  return {
    id,
    parentId,
    type: 'shape',
    geometry: { x: 10, y: 10, w: 100, h: 60 },
    styling: { fill: '#fff', stroke: '#333', strokeWidth: 1, opacity: 1 },
    data: {},
    ...overrides,
  }
}

describe('useClipboardable', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    // Reset module-level clipboard + selection entre tests.
    const { selectedNodeIds, clearSelection } = useSelectionState()
    clearSelection()
    selectedNodeIds.value = new Set()
    useClipboardable().clearClipboard()
  })

  describe('copy + paste', () => {
    it('copie un noeud simple et en colle une copie avec un NOUVEL ID', async () => {
      const store = useGraphStore()
      await store.importNode(makeNode('source'))

      const clipboard = useClipboardable()
      clipboard.copy(['source'])
      const newIds = await clipboard.paste()

      expect(newIds).toHaveLength(1)
      expect(newIds[0]).not.toBe('source')
      expect(store.nodes['source']).toBeDefined()
      expect(store.nodes[newIds[0]]).toBeDefined()
    })

    it('décale la position du collage (offset par défaut 20,20)', async () => {
      const store = useGraphStore()
      await store.importNode(makeNode('n', null, { geometry: { x: 100, y: 100, w: 50, h: 50 } }))

      const clipboard = useClipboardable()
      clipboard.copy(['n'])
      const [newId] = await clipboard.paste()

      expect(store.nodes[newId].geometry.x).toBe(120)
      expect(store.nodes[newId].geometry.y).toBe(120)
    })

    it('préserve la hiérarchie parent/enfant après collage', async () => {
      const store = useGraphStore()
      await store.importNode(makeNode('parent'))
      await store.importNode(makeNode('child', 'parent'))
      await store.importNode(makeNode('grandchild', 'child'))

      const clipboard = useClipboardable()
      clipboard.copy(['parent'])
      const newIds = await clipboard.paste()

      // 3 noeuds collés (parent + 2 descendants)
      expect(newIds).toHaveLength(3)
      const pastedParent = store.nodes[newIds[0]]
      const pastedChild = Object.values(store.nodes).find(
        (n) => n.parentId === pastedParent.id && n.id !== 'child'
      )
      expect(pastedChild).toBeDefined()
      expect(pastedChild!.parentId).toBe(pastedParent.id)
    })

    it('ne décale PAS les enfants (relatif à leur parent), seulement les racines', async () => {
      const store = useGraphStore()
      await store.importNode(
        makeNode('parent', null, { geometry: { x: 100, y: 100, w: 200, h: 200 } })
      )
      await store.importNode(
        makeNode('child', 'parent', { geometry: { x: 50, y: 50, w: 40, h: 40 } })
      )

      const clipboard = useClipboardable()
      clipboard.copy(['parent'])
      const newIds = await clipboard.paste()

      const pastedParent = store.nodes[newIds[0]]
      const pastedChild = Object.values(store.nodes).find((n) => n.parentId === pastedParent.id)
      expect(pastedParent.geometry.x).toBe(120) // décalé
      expect(pastedChild!.geometry.x).toBe(50) // inchangé (relatif au parent)
    })

    it('remappe les arêtes internes au sous-graphe copié', async () => {
      const store = useGraphStore()
      await store.importNode(makeNode('a'))
      await store.importNode(makeNode('b'))
      await store.importEdge({ id: 'e1', sourceId: 'a', targetId: 'b', routing: 'straight' })

      const clipboard = useClipboardable()
      clipboard.copy(['a', 'b'])
      const newIds = await clipboard.paste()

      const pastedEdges = Object.values(store.edges)
      // Les arêtes originales + 1 nouvelle
      expect(pastedEdges.length).toBeGreaterThanOrEqual(2)
      const newEdge = pastedEdges.find((e) => e.id !== 'e1')
      expect(newEdge).toBeDefined()
      expect(newIds).toContain(newEdge!.sourceId)
      expect(newIds).toContain(newEdge!.targetId)
    })

    it("canPaste() retourne false tant que rien n'a été copié", () => {
      const clipboard = useClipboardable()
      expect(clipboard.canPaste()).toBe(false)
    })
  })

  describe('cut', () => {
    it('copie puis supprime les noeuds source', async () => {
      const store = useGraphStore()
      await store.importNode(makeNode('to-cut'))

      const clipboard = useClipboardable()
      clipboard.cut(['to-cut'])

      expect(store.nodes['to-cut']).toBeUndefined()
      expect(clipboard.canPaste()).toBe(true)
    })
  })

  describe('duplicate', () => {
    it('duplique sans toucher au presse-papier existant', async () => {
      const store = useGraphStore()
      await store.importNode(makeNode('original'))
      await store.importNode(makeNode('in-clipboard'))

      const clipboard = useClipboardable()
      clipboard.copy(['in-clipboard'])

      const newIds = await clipboard.duplicate(['original'])

      // duplicate a créé un clone
      expect(newIds).toHaveLength(1)
      expect(store.nodes[newIds[0]]).toBeDefined()
      // Le presse-papier contient toujours 'in-clipboard'
      expect(clipboard.canPaste()).toBe(true)
    })
  })
})
