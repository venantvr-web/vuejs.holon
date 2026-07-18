// src/composables/traits/__tests__/useFilterable.spec.ts
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'

// Stub Dexie : toutes les opérations DB résolvent sans effet réel. Les tests
// se concentrent sur la cohérence de l'état réactif du store.
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
import { useFilterable } from '../useFilterable'
import type { Node, Edge } from '../../../types'

function makeNode(id: string, parentId: string | null, data: Record<string, unknown>): Node {
  return {
    id,
    parentId,
    type: 'container',
    geometry: { x: 0, y: 0, w: 100, h: 60 },
    styling: { fill: '#fff', stroke: '#333', strokeWidth: 1, opacity: 1 },
    data,
  }
}

describe('useFilterable', () => {
  let store: ReturnType<typeof useGraphStore>
  let filterable: ReturnType<typeof useFilterable>

  beforeEach(async () => {
    setActivePinia(createPinia())
    store = useGraphStore()
    filterable = useFilterable()
    filterable.clearFilter()
    filterable.setDisplayMode('hide')

    // Hiérarchie : domaine (business) > appli (application) > serveur (technology)
    await store.importNode(
      makeNode('domaine', null, { name: 'Domaine Ventes', archimateType: 'business-function' })
    )
    await store.importNode(
      makeNode('appli', 'domaine', { name: 'CRM', archimateType: 'application-component' })
    )
    await store.importNode(
      makeNode('serveur', 'appli', { name: 'Serveur CRM', archimateType: 'technology-node' })
    )
    await store.importNode(
      makeNode('autre', null, { name: 'Référentiel RH', archimateType: 'application-component' })
    )
  })

  it('sans requête, aucun noeud n’est écarté', () => {
    expect(filterable.isFilterActive.value).toBe(false)
    expect(filterable.excludedCount.value).toBe(0)
    expect(filterable.isNodeHidden('domaine')).toBe(false)
  })

  it('mode « conserver » : garde les correspondants et leurs ancêtres', () => {
    filterable.setQuery('couche:application')
    expect(filterable.isFilterActive.value).toBe(true)
    // CRM et Référentiel RH correspondent ; domaine est conservé comme ancêtre du CRM.
    expect(filterable.isNodeHidden('appli')).toBe(false)
    expect(filterable.isNodeHidden('autre')).toBe(false)
    expect(filterable.isNodeHidden('domaine')).toBe(false)
    // Le serveur (technology) est écarté.
    expect(filterable.isNodeHidden('serveur')).toBe(true)
    expect(filterable.excludedCount.value).toBe(1)
  })

  it('mode « masquer » : masque les correspondants et leurs descendants', () => {
    filterable.invertQuery.value = true
    filterable.setQuery('nom:crm et type:container et couche:application')
    // L'appli est masquée, son descendant serveur aussi ; le reste est visible.
    expect(filterable.isNodeHidden('appli')).toBe(true)
    expect(filterable.isNodeHidden('serveur')).toBe(true)
    expect(filterable.isNodeHidden('domaine')).toBe(false)
    expect(filterable.isNodeHidden('autre')).toBe(false)
  })

  it('mode estompé : les écartés sont dimmés mais pas cachés', () => {
    filterable.setDisplayMode('dim')
    filterable.setQuery('couche:business')
    expect(filterable.isNodeHidden('autre')).toBe(false)
    expect(filterable.isNodeDimmed('autre')).toBe(true)
    expect(filterable.isNodeDimmed('domaine')).toBe(false)
  })

  it('cache les arêtes dont une extrémité est masquée', () => {
    const edge: Edge = { id: 'e1', sourceId: 'appli', targetId: 'autre', routing: 'straight' }
    filterable.invertQuery.value = true
    filterable.setQuery('nom=crm')
    expect(filterable.isEdgeHidden(edge)).toBe(true)
    filterable.clearFilter()
    expect(filterable.isEdgeHidden(edge)).toBe(false)
  })

  it('expose une erreur de syntaxe sans rien écarter', () => {
    filterable.setQuery('champ_inconnu:x')
    expect(filterable.queryError.value).toBeTruthy()
    expect(filterable.isFilterActive.value).toBe(false)
    expect(filterable.excludedCount.value).toBe(0)
  })

  it('sauvegarde, recharge et supprime un filtre nommé', () => {
    filterable.invertQuery.value = true
    filterable.setQuery('couche:infra')
    const saved = filterable.saveFilter('Sans infra')
    expect(saved).not.toBeNull()

    filterable.clearFilter()
    expect(filterable.query.value).toBe('')
    expect(filterable.invertQuery.value).toBe(false)

    filterable.loadFilter(saved!.id)
    expect(filterable.query.value).toBe('couche:infra')
    expect(filterable.invertQuery.value).toBe(true)

    filterable.deleteFilter(saved!.id)
    expect(filterable.savedFilters.value.find((f) => f.id === saved!.id)).toBeUndefined()
  })

  it('refuse de sauvegarder un filtre vide', () => {
    filterable.clearFilter()
    expect(filterable.saveFilter('vide')).toBeNull()
  })
})
