// src/composables/traits/__tests__/useUndoable.spec.ts
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import type { Node, Edge } from '../../../types'

vi.mock('../../../db', () => {
  const table = () => ({
    put: vi.fn().mockResolvedValue(undefined),
    delete: vi.fn().mockResolvedValue(undefined),
    clear: vi.fn().mockResolvedValue(undefined),
    bulkPut: vi.fn().mockResolvedValue(undefined),
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
import { useUndoable } from '../useUndoable'

function node(id: string, parentId: string | null = null): Node {
  return {
    id,
    parentId,
    type: 'shape',
    geometry: { x: 0, y: 0, w: 100, h: 60 },
    styling: { fill: '#fff', stroke: '#333', strokeWidth: 1, opacity: 1 },
    data: {},
  }
}

function edge(id: string, sourceId: string, targetId: string): Edge {
  return { id, sourceId, targetId, routing: 'straight' }
}

// Utilitaire pour attendre les microtasks + setTimeout(0) du restoreSnapshot.
function nextTick(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 10))
}

describe('useUndoable', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    const { clearHistory } = useUndoable()
    clearHistory()
  })

  describe('snapshot + undo', () => {
    it("annule la dernière modification en restaurant l'état précédent", async () => {
      const store = useGraphStore()
      const { snapshot, undo, canUndo } = useUndoable()

      await store.importNode(node('a'))
      snapshot()

      await store.importNode(node('b'))
      snapshot()

      expect(Object.keys(store.nodes)).toHaveLength(2)
      expect(canUndo.value).toBe(true)

      undo()
      await nextTick()

      expect(Object.keys(store.nodes)).toEqual(['a'])
    })

    it('préserve les IDs à la restauration (cruciale pour les références)', async () => {
      const store = useGraphStore()
      const { snapshot, undo } = useUndoable()

      await store.importNode(node('alpha'))
      await store.importNode(node('beta', 'alpha'))
      await store.importEdge(edge('arrow', 'alpha', 'beta'))
      snapshot()

      await store.deleteNode('alpha')
      snapshot()
      expect(Object.keys(store.nodes)).toHaveLength(0)

      undo()
      await nextTick()

      expect(store.nodes['alpha']).toBeDefined()
      expect(store.nodes['beta']).toBeDefined()
      expect(store.nodes['beta'].parentId).toBe('alpha')
      expect(store.edges['arrow']).toBeDefined()
      expect(store.edges['arrow'].sourceId).toBe('alpha')
      expect(store.edges['arrow'].targetId).toBe('beta')
    })
  })

  describe('redo', () => {
    it('rétablit une modification annulée', async () => {
      const store = useGraphStore()
      const { snapshot, undo, redo, canRedo } = useUndoable()

      await store.importNode(node('x'))
      snapshot()
      await store.importNode(node('y'))
      snapshot()

      undo()
      await nextTick()
      expect(Object.keys(store.nodes)).toEqual(['x'])
      expect(canRedo.value).toBe(true)

      redo()
      await nextTick()
      expect(Object.keys(store.nodes).sort()).toEqual(['x', 'y'])
    })
  })

  describe('bornes', () => {
    it('canUndo = false sur historique vide ou à la baseline', () => {
      const { canUndo, clearHistory } = useUndoable()
      clearHistory()
      expect(canUndo.value).toBe(false)
    })

    it("canRedo = false quand on est au bout de l'historique", async () => {
      const store = useGraphStore()
      const { snapshot, canRedo } = useUndoable()

      await store.importNode(node('one'))
      snapshot()

      expect(canRedo.value).toBe(false)
    })

    it('tronque les états futurs quand on modifie après un undo', async () => {
      const store = useGraphStore()
      const { snapshot, undo, canRedo } = useUndoable()

      await store.importNode(node('a'))
      snapshot()
      await store.importNode(node('b'))
      snapshot()

      undo()
      await nextTick()

      // Nouvelle action : détruit la branche future
      await store.importNode(node('c'))
      snapshot()

      expect(canRedo.value).toBe(false)
      expect(store.nodes['c']).toBeDefined()
      expect(store.nodes['b']).toBeUndefined()
    })
  })
})
