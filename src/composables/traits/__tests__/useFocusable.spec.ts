// src/composables/traits/__tests__/useFocusable.spec.ts
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
import { useFocusable, useFocusedNodeState } from '../useFocusable'
import type { Node } from '../../../types'

function makeNode(id: string, x: number, y: number, w = 80, h = 60): Node {
  return {
    id,
    parentId: null,
    type: 'shape',
    geometry: { x, y, w, h },
    styling: { fill: '#fff', stroke: '#000', strokeWidth: 1, opacity: 1 },
    data: {},
  }
}

describe('useFocusable navigation spatiale', () => {
  let store: ReturnType<typeof useGraphStore>

  beforeEach(async () => {
    setActivePinia(createPinia())
    store = useGraphStore()
    // Le focus est module-level dans le trait : on doit le réinitialiser
    // explicitement entre les tests pour éviter les fuites d'état.
    useFocusedNodeState().clearFocus()
    // Disposition en croix autour de centre (200, 200) :
    //          centre @ (200,200,80x60)  → centre absolu (240,230)
    //          north  @ (220,50)         → (260, 80)
    //          south  @ (220,400)        → (260, 430)
    //          east   @ (400,200)        → (440, 230)
    //          west   @ (50,200)         → (90, 230)
    //          off    @ (1000,1500)      → hors-cône cardinal (45° dépassé)
    await store.importNode(makeNode('center', 200, 200))
    await store.importNode(makeNode('north', 220, 50))
    await store.importNode(makeNode('south', 220, 400))
    await store.importNode(makeNode('east', 400, 200))
    await store.importNode(makeNode('west', 50, 200))
    await store.importNode(makeNode('off', 1000, 1500))
  })

  function focusOn(id: string) {
    const trait = useFocusable({ nodeId: ref(id) })
    trait.focus()
  }

  it('flèche bas trouve le voisin direct sous le noeud focalisé', () => {
    focusOn('center')
    const { focusInDirection, focusedNodeId } = useFocusedNodeState()
    focusInDirection('down')
    expect(focusedNodeId.value).toBe('south')
  })

  it('flèche haut trouve le voisin direct au-dessus', () => {
    focusOn('center')
    const { focusInDirection, focusedNodeId } = useFocusedNodeState()
    focusInDirection('up')
    expect(focusedNodeId.value).toBe('north')
  })

  it('flèche droite trouve le voisin à droite', () => {
    focusOn('center')
    const { focusInDirection, focusedNodeId } = useFocusedNodeState()
    focusInDirection('right')
    expect(focusedNodeId.value).toBe('east')
  })

  it('flèche gauche trouve le voisin à gauche', () => {
    focusOn('center')
    const { focusInDirection, focusedNodeId } = useFocusedNodeState()
    focusInDirection('left')
    expect(focusedNodeId.value).toBe('west')
  })

  it('ne change rien si aucun noeud focalisé', () => {
    const { focusInDirection, focusedNodeId } = useFocusedNodeState()
    expect(focusedNodeId.value).toBe(null)
    focusInDirection('right')
    expect(focusedNodeId.value).toBe(null)
  })

  it('ignore les noeuds verrouillés', async () => {
    // On verrouille `east` ; flèche droite depuis `center` doit ignorer ce
    // candidat. Aucun autre noeud n'est dans le cône 'right' → no-op.
    await store.updateNode('east', { data: { locked: true } })
    focusOn('center')
    const { focusInDirection, focusedNodeId } = useFocusedNodeState()
    focusInDirection('right')
    expect(focusedNodeId.value).toBe('center')
  })

  it('respecte le cône directionnel : un noeud trop oblique est ignoré', () => {
    // 'off' (1000, 1000) est à dx=+600, dy=+800 depuis 'east' (centre 440, 230) :
    // il penche plus vers le bas que vers la droite (dx < |dy|) donc le cône
    // 45° de la direction 'right' l'exclut. Aucun autre candidat → focus
    // inchangé.
    focusOn('east')
    const { focusInDirection, focusedNodeId } = useFocusedNodeState()
    focusInDirection('right')
    expect(focusedNodeId.value).toBe('east')
  })

  it('renvoie no-op si aucun noeud dans la direction (bord du graphe)', () => {
    // Depuis 'west' (centre 90, 230), la direction 'left' n'a rien : tous les
    // autres noeuds sont à droite.
    focusOn('west')
    const { focusInDirection, focusedNodeId } = useFocusedNodeState()
    focusInDirection('left')
    expect(focusedNodeId.value).toBe('west')
  })
})
