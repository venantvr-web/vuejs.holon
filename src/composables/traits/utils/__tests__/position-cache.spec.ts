// src/composables/traits/utils/__tests__/position-cache.spec.ts
import { describe, it, expect, beforeEach } from 'vitest'
import {
  clearPositionCache,
  getCachedAbsolutePosition,
  getPositionCacheVersion,
  invalidatePositionCache,
} from '../position-cache'
import type { Node } from '../../../../types'

function makeNode(id: string, parentId: string | null, x: number, y: number): Node {
  return {
    id,
    parentId,
    type: 'container',
    geometry: { x, y, w: 100, h: 80 },
    styling: { fill: '#fff', stroke: '#000', strokeWidth: 1, opacity: 1 },
    data: {},
  }
}

describe('position-cache', () => {
  beforeEach(() => {
    clearPositionCache()
  })

  it('renvoie null pour un noeud absent du dictionnaire', () => {
    expect(getCachedAbsolutePosition('nope', {})).toBe(null)
  })

  it('somme les positions le long de la chaîne parente', () => {
    const nodes: Record<string, Node> = {
      root: makeNode('root', null, 10, 20),
      child: makeNode('child', 'root', 5, 7),
      leaf: makeNode('leaf', 'child', 1, 2),
    }
    expect(getCachedAbsolutePosition('root', nodes)).toEqual({ x: 10, y: 20 })
    expect(getCachedAbsolutePosition('child', nodes)).toEqual({ x: 15, y: 27 })
    expect(getCachedAbsolutePosition('leaf', nodes)).toEqual({ x: 16, y: 29 })
  })

  it('renvoie une valeur stale tant que la version n’est pas bumpée', () => {
    const nodes: Record<string, Node> = {
      root: makeNode('root', null, 10, 20),
    }
    expect(getCachedAbsolutePosition('root', nodes)).toEqual({ x: 10, y: 20 })

    // Mutation directe (simulant un bug client) : tant qu'on n'a pas invalidé,
    // le cache renvoie l'ancienne valeur — c'est le comportement attendu et
    // c'est ce qui force l'appelant à appeler invalidatePositionCache().
    nodes.root.geometry.x = 999
    expect(getCachedAbsolutePosition('root', nodes)).toEqual({ x: 10, y: 20 })
  })

  it('invalidatePositionCache force un recalcul à la prochaine lecture', () => {
    const nodes: Record<string, Node> = {
      root: makeNode('root', null, 10, 20),
    }
    getCachedAbsolutePosition('root', nodes)
    nodes.root.geometry.x = 999

    invalidatePositionCache()
    expect(getCachedAbsolutePosition('root', nodes)).toEqual({ x: 999, y: 20 })
  })

  it('bump à chaque appel invalidate, monotonique', () => {
    const v0 = getPositionCacheVersion()
    invalidatePositionCache()
    invalidatePositionCache()
    expect(getPositionCacheVersion()).toBe(v0 + 2)
  })

  it('clearPositionCache vide la Map ET bump la version', () => {
    const v0 = getPositionCacheVersion()
    const nodes: Record<string, Node> = { root: makeNode('root', null, 10, 20) }
    getCachedAbsolutePosition('root', nodes)
    clearPositionCache()
    expect(getPositionCacheVersion()).toBe(v0 + 1)
    // Lecture suivante : recalcul propre (cache vide).
    expect(getCachedAbsolutePosition('root', nodes)).toEqual({ x: 10, y: 20 })
  })

  it('résiste à un parent manquant en s’arrêtant à l’ancêtre orphelin', () => {
    // child référence un parent qui n'existe pas → on stoppe la remontée.
    const nodes: Record<string, Node> = {
      child: makeNode('child', 'fantome', 50, 60),
    }
    expect(getCachedAbsolutePosition('child', nodes)).toEqual({ x: 50, y: 60 })
  })
})
