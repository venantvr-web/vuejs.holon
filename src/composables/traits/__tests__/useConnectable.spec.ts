// src/composables/traits/__tests__/useConnectable.spec.ts
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ref } from 'vue'
import { setActivePinia, createPinia } from 'pinia'

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
import { useConnectable, useConnectionState } from '../useConnectable'
import type { Node } from '../../../types'

function makeNode(id: string): Node {
  return {
    id,
    parentId: null,
    type: 'shape',
    geometry: { x: 0, y: 0, w: 80, h: 60 },
    styling: { fill: '#fff', stroke: '#000', strokeWidth: 1, opacity: 1 },
    data: {},
  }
}

describe('useConnectable', () => {
  let store: ReturnType<typeof useGraphStore>

  beforeEach(async () => {
    setActivePinia(createPinia())
    store = useGraphStore()
    useConnectionState().cancelConnection()
    await store.importNode(makeNode('a'))
    await store.importNode(makeNode('b'))
  })

  it('startConnection active le mode et mémorise la source', () => {
    const conn = useConnectable({ nodeId: ref('a') })
    conn.startConnection()

    expect(conn.connectionMode.value).toBe(true)
    expect(conn.connectionSource.value).toBe('a')
    expect(conn.isConnectionSource.value).toBe(true)
  })

  it('finishConnection crée une arête source → cible et sort du mode connexion', async () => {
    const conn = useConnectable({ nodeId: ref('a') })
    conn.startConnection()
    conn.finishConnection('b')

    const edges = Object.values(store.edges)
    expect(edges).toHaveLength(1)
    expect(edges[0].sourceId).toBe('a')
    expect(edges[0].targetId).toBe('b')
    expect(conn.connectionMode.value).toBe(false)
  })

  it('refuse de créer une boucle source = cible', () => {
    const conn = useConnectable({ nodeId: ref('a') })
    conn.startConnection()
    conn.finishConnection('a')

    expect(Object.values(store.edges)).toHaveLength(0)
  })

  it('cancelConnection nettoie sans créer d’arête', () => {
    const conn = useConnectable({ nodeId: ref('a') })
    conn.startConnection()
    conn.cancelConnection()

    expect(conn.connectionMode.value).toBe(false)
    expect(conn.connectionSource.value).toBe(null)
    expect(Object.values(store.edges)).toHaveLength(0)
  })

  it('refuse de dupliquer une arête déjà existante dans le même sens', async () => {
    const conn = useConnectable({ nodeId: ref('a') })

    conn.startConnection()
    conn.finishConnection('b')
    expect(Object.values(store.edges)).toHaveLength(1)

    conn.startConnection()
    conn.finishConnection('b')
    expect(Object.values(store.edges)).toHaveLength(1)
  })
})
