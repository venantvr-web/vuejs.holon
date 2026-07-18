// src/stores/__tests__/graph.spec.ts
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import type { Node, Edge } from '../../types'

// Stub Dexie : toutes les opérations DB résolvent sans effet réel. Les tests
// se concentrent sur la cohérence de l'état réactif du store.
vi.mock('../../db', () => {
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

import { useGraphStore } from '../graph'

function makeNode(id: string, parentId: string | null = null): Node {
  return {
    id,
    parentId,
    type: 'shape',
    geometry: { x: 0, y: 0, w: 100, h: 60 },
    styling: { fill: '#fff', stroke: '#333', strokeWidth: 1, opacity: 1 },
    data: {},
  }
}

function makeEdge(id: string, sourceId: string, targetId: string): Edge {
  return {
    id,
    sourceId,
    targetId,
    routing: 'straight',
  }
}

describe('graphStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  describe('importNode', () => {
    it("préserve l'ID du noeud (critère clé pour undo/paste)", async () => {
      const store = useGraphStore()
      const node = makeNode('node-abc-123')

      await store.importNode(node)

      expect(store.nodes['node-abc-123']).toBeDefined()
      expect(store.nodes['node-abc-123'].id).toBe('node-abc-123')
    })

    it('préserve parentId pour les enfants', async () => {
      const store = useGraphStore()
      const parent = makeNode('parent', null)
      const child = makeNode('child', 'parent')

      await store.importNode(parent)
      await store.importNode(child)

      expect(store.nodes['child'].parentId).toBe('parent')
    })

    it('peut être appelé plusieurs fois avec le même ID (dernière écrit gagne)', async () => {
      const store = useGraphStore()
      const v1 = makeNode('same-id')
      v1.data = { name: 'first' }
      const v2 = makeNode('same-id')
      v2.data = { name: 'second' }

      await store.importNode(v1)
      await store.importNode(v2)

      expect(store.nodes['same-id'].data.name).toBe('second')
      expect(Object.keys(store.nodes)).toHaveLength(1)
    })
  })

  describe('importEdge', () => {
    it('préserve les sourceId/targetId (cohérence des références)', async () => {
      const store = useGraphStore()
      const edge = makeEdge('e1', 'n1', 'n2')

      await store.importEdge(edge)

      expect(store.edges['e1']).toBeDefined()
      expect(store.edges['e1'].sourceId).toBe('n1')
      expect(store.edges['e1'].targetId).toBe('n2')
    })
  })

  describe('replaceAll', () => {
    it('remplace atomiquement tout le contenu', async () => {
      const store = useGraphStore()

      // État initial via import
      await store.importNode(makeNode('old-a'))
      await store.importNode(makeNode('old-b'))
      expect(Object.keys(store.nodes)).toHaveLength(2)

      // Replace
      const newNodes = {
        'new-x': makeNode('new-x'),
        'new-y': makeNode('new-y'),
        'new-z': makeNode('new-z'),
      }
      const newEdges = {
        'e-1': makeEdge('e-1', 'new-x', 'new-y'),
      }

      await store.replaceAll(newNodes, newEdges)

      expect(Object.keys(store.nodes)).toEqual(['new-x', 'new-y', 'new-z'])
      expect(store.nodes['old-a']).toBeUndefined()
      expect(store.edges['e-1']).toBeDefined()
    })

    it("préserve l'intégrité noeud/arête après restauration", async () => {
      const store = useGraphStore()

      const snapshot = {
        nodes: {
          parent: makeNode('parent'),
          child: makeNode('child', 'parent'),
        },
        edges: {
          'edge-1': makeEdge('edge-1', 'parent', 'child'),
        },
      }

      await store.replaceAll(snapshot.nodes, snapshot.edges)

      expect(store.nodes['child'].parentId).toBe('parent')
      expect(store.edges['edge-1'].sourceId).toBe('parent')
      expect(store.edges['edge-1'].targetId).toBe('child')
    })

    it('vide le store si on passe des collections vides', async () => {
      const store = useGraphStore()
      await store.importNode(makeNode('to-wipe'))
      expect(Object.keys(store.nodes)).toHaveLength(1)

      await store.replaceAll({}, {})

      expect(Object.keys(store.nodes)).toHaveLength(0)
      expect(Object.keys(store.edges)).toHaveLength(0)
    })
  })

  describe('createNode', () => {
    it('génère un ID via nanoid (pas de collision même en batch)', async () => {
      const store = useGraphStore()
      const a = await store.createNode(
        {
          type: 'shape',
          geometry: { x: 0, y: 0, w: 100, h: 60 },
          styling: { fill: '#fff', stroke: '#333', strokeWidth: 1, opacity: 1 },
          data: {},
        },
        null
      )
      const b = await store.createNode(
        {
          type: 'shape',
          geometry: { x: 0, y: 0, w: 100, h: 60 },
          styling: { fill: '#fff', stroke: '#333', strokeWidth: 1, opacity: 1 },
          data: {},
        },
        null
      )

      expect(a.id).not.toBe(b.id)
      expect(store.nodes[a.id]).toBeDefined()
      expect(store.nodes[b.id]).toBeDefined()
    })
  })

  describe('deleteNode', () => {
    it('supprime les enfants récursivement', async () => {
      const store = useGraphStore()
      await store.importNode(makeNode('root'))
      await store.importNode(makeNode('child1', 'root'))
      await store.importNode(makeNode('grandchild', 'child1'))
      await store.importNode(makeNode('independent'))

      await store.deleteNode('root')

      expect(store.nodes['root']).toBeUndefined()
      expect(store.nodes['child1']).toBeUndefined()
      expect(store.nodes['grandchild']).toBeUndefined()
      expect(store.nodes['independent']).toBeDefined()
    })

    it('supprime aussi les arêtes connectées à tout sous-arbre supprimé', async () => {
      const store = useGraphStore()
      await store.importNode(makeNode('a'))
      await store.importNode(makeNode('b', 'a'))
      await store.importNode(makeNode('c'))
      await store.importEdge(makeEdge('e-ab', 'a', 'b'))
      await store.importEdge(makeEdge('e-bc', 'b', 'c'))
      await store.importEdge(makeEdge('e-cc', 'c', 'c'))

      await store.deleteNode('a')

      expect(store.edges['e-ab']).toBeUndefined()
      expect(store.edges['e-bc']).toBeUndefined()
      expect(store.edges['e-cc']).toBeDefined()
    })
  })
})
