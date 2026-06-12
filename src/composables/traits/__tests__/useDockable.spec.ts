// src/composables/traits/__tests__/useDockable.spec.ts
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ref } from 'vue'
import { setActivePinia, createPinia } from 'pinia'

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
import { useDockable } from '../useDockable'
import type { Node } from '../../../types'

function makeNode(
  id: string,
  parentId: string | null,
  x: number,
  y: number,
  w = 100,
  h = 80
): Node {
  return {
    id,
    parentId,
    type: 'container',
    geometry: { x, y, w, h },
    styling: { fill: '#fff', stroke: '#000', strokeWidth: 1, opacity: 1 },
    data: {},
  }
}

describe('useDockable.commitDocking', () => {
  let store: ReturnType<typeof useGraphStore>

  beforeEach(async () => {
    setActivePinia(createPinia())
    store = useGraphStore()
  })

  it('détache automatiquement un enfant dont le centre est sorti du parent', async () => {
    // Parent à (0, 0, 200, 200) ; enfant initialement bien dedans en local (10, 10).
    await store.importNode(makeNode('parent', null, 0, 0, 200, 200))
    await store.importNode(makeNode('child', 'parent', 10, 10, 50, 40))

    // L'utilisateur a glissé l'enfant en local (300, 300) — il est désormais
    // largement hors du parent (centre absolu = (325, 320) vs parent
    // [0..200] × [0..200]).
    await store.updateNode('child', {
      geometry: { x: 300, y: 300, w: 50, h: 40 },
    })

    // Simuler la fin du drag : pas de parent potentiel détecté (le DSL
    // n'envoie pas potentialParent à `commitDocking`, on s'appuie sur la
    // valeur courante qui est null).
    const dock = useDockable({ nodeId: ref('child'), isDragging: ref(false) })
    dock.commitDocking()

    // Conséquence attendue : l'enfant a été dissocié et est désormais à la racine.
    const child = store.nodes['child']
    expect(child.parentId).toBe(null)
  })

  it('conserve le parent quand le centre est encore dans la box', async () => {
    await store.importNode(makeNode('parent', null, 0, 0, 200, 200))
    await store.importNode(makeNode('child', 'parent', 80, 80, 50, 40))

    // L'enfant reste dans la box (centre absolu = (105, 100) → bien dans [0..200]^2).
    const dock = useDockable({ nodeId: ref('child'), isDragging: ref(false) })
    dock.commitDocking()

    expect(store.nodes['child'].parentId).toBe('parent')
  })

  it("ne déclenche pas l'undock pour un noeud déjà à la racine", async () => {
    await store.importNode(makeNode('lone', null, 9999, 9999))
    const dock = useDockable({ nodeId: ref('lone'), isDragging: ref(false) })
    dock.commitDocking()

    expect(store.nodes['lone'].parentId).toBe(null)
  })
})
