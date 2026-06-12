// src/composables/__tests__/useGeometry.spec.ts
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'

vi.mock('../../db', () => {
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

import { useGraphStore } from '../../stores/graph'
import { useGeometry } from '../useGeometry'
import type { Node } from '../../types'

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

describe('useGeometry', () => {
  let store: ReturnType<typeof useGraphStore>
  let geom: ReturnType<typeof useGeometry>

  beforeEach(async () => {
    setActivePinia(createPinia())
    store = useGraphStore()
    geom = useGeometry()
    // Hiérarchie : root (10,20,300x200) > child (50,30,80x60) > leaf (5,5,20x20)
    await store.importNode(makeNode('root', null, 10, 20, 300, 200))
    await store.importNode(makeNode('child', 'root', 50, 30, 80, 60))
    await store.importNode(makeNode('leaf', 'child', 5, 5, 20, 20))
  })

  it('getNodeAbsolutePosition somme les positions de la chaîne parente', () => {
    expect(geom.getNodeAbsolutePosition('root')).toEqual({ x: 10, y: 20 })
    expect(geom.getNodeAbsolutePosition('child')).toEqual({ x: 60, y: 50 })
    expect(geom.getNodeAbsolutePosition('leaf')).toEqual({ x: 65, y: 55 })
  })

  it('renvoie {0,0} pour un noeud inexistant (legacy contract)', () => {
    expect(geom.getNodeAbsolutePosition('inconnu')).toEqual({ x: 0, y: 0 })
  })

  it('isPointInsideNode utilise la position absolue, pas la locale', () => {
    // child est à (60,50) avec taille (80,60) => emprise [60..140] × [50..110]
    expect(geom.isPointInsideNode('child', 100, 80)).toBe(true)
    expect(geom.isPointInsideNode('child', 55, 80)).toBe(false)
    expect(geom.isPointInsideNode('child', 100, 120)).toBe(false)
  })

  it('isDescendantOf détecte la chaîne parent → grand-parent', () => {
    expect(geom.isDescendantOf('leaf', 'root')).toBe(true)
    expect(geom.isDescendantOf('leaf', 'child')).toBe(true)
    expect(geom.isDescendantOf('child', 'root')).toBe(true)
    expect(geom.isDescendantOf('root', 'leaf')).toBe(false)
  })

  it('getNodeDepth = nombre d’ancêtres', () => {
    expect(geom.getNodeDepth('root')).toBe(0)
    expect(geom.getNodeDepth('child')).toBe(1)
    expect(geom.getNodeDepth('leaf')).toBe(2)
  })

  it('findContainerAtPoint renvoie le plus profond sous le point', () => {
    // Boîtes absolues : root [10..310]×[20..220], child [60..140]×[50..110],
    // leaf [65..85]×[55..75]. Point (70, 60) est dans root, child ET leaf →
    // leaf est le plus profond donc gagne.
    expect(geom.findContainerAtPoint(70, 60)).toBe('leaf')

    // Point (100, 80) : dans root et child, pas dans leaf (x > 85).
    expect(geom.findContainerAtPoint(100, 80)).toBe('child')

    // Point hors de tout : null.
    expect(geom.findContainerAtPoint(9999, 9999)).toBe(null)
  })

  it('findContainerAtPoint exclut le noeud passé et ses descendants', () => {
    // En cherchant un drop pour `child`, ne pas tomber dans leaf (descendant)
    // ni dans child lui-même → seul root reste candidat.
    expect(geom.findContainerAtPoint(70, 60, 'child')).toBe('root')
  })

  it('convertCoordinates transpose une position absolue dans le repère d’un nouveau parent', () => {
    // leaf est absolu (65,55). Si on le reparente sous root, sa coord locale
    // devient (65-10, 55-20) = (55, 35).
    expect(geom.convertCoordinates('leaf', 'child', 'root')).toEqual({ x: 55, y: 35 })

    // Si on le sort à la racine (parent null), sa nouvelle coord = sa position absolue.
    expect(geom.convertCoordinates('leaf', 'child', null)).toEqual({ x: 65, y: 55 })
  })
})
