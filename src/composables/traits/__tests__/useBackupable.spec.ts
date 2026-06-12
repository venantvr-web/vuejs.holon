// src/composables/traits/__tests__/useBackupable.spec.ts
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'

vi.mock('../../../db', () => {
  // Stub minimal de la table `backups` qui se comporte comme une Map
  // ordonnée. On émule les méthodes utilisées par useBackupable.
  const store = new Map<string, any>()

  function table(name: 'nodes' | 'edges' | 'library' | 'backups') {
    return {
      put: vi.fn(async (entry: { id: string }) => {
        if (name === 'backups') store.set(entry.id, entry)
        return undefined
      }),
      get: vi.fn(async (id: string) => (name === 'backups' ? store.get(id) : undefined)),
      delete: vi.fn(async (id: string) => {
        if (name === 'backups') store.delete(id)
        return undefined
      }),
      clear: vi.fn(async () => {
        if (name === 'backups') store.clear()
        return undefined
      }),
      bulkPut: vi.fn().mockResolvedValue(undefined),
      toArray: vi.fn().mockResolvedValue([]),
      update: vi.fn().mockResolvedValue(undefined),
      orderBy: vi.fn(() => ({
        reverse: () => ({
          toArray: async () => Array.from(store.values()).sort((a, b) => b.createdAt - a.createdAt),
        }),
      })),
    }
  }

  return {
    db: {
      nodes: table('nodes'),
      edges: table('edges'),
      library: table('library'),
      backups: table('backups'),
      transaction: vi.fn(async (_mode: string, ..._args: unknown[]) => {
        const fn = _args[_args.length - 1] as () => Promise<unknown>
        return fn()
      }),
    },
    __resetBackupStore: () => store.clear(),
  }
})

import { useGraphStore } from '../../../stores/graph'
import { useBackupable } from '../useBackupable'
import type { Node } from '../../../types'

function makeNode(id: string): Node {
  return {
    id,
    parentId: null,
    type: 'shape',
    geometry: { x: 0, y: 0, w: 80, h: 60 },
    styling: { fill: '#fff', stroke: '#000', strokeWidth: 1, opacity: 1 },
    data: { name: id },
  }
}

describe('useBackupable', () => {
  beforeEach(async () => {
    setActivePinia(createPinia())
    const mod = (await import('../../../db')) as unknown as {
      __resetBackupStore?: () => void
    }
    mod.__resetBackupStore?.()
    // S'assurer que l'auto-backup éventuel d'un test précédent est arrêté.
    useBackupable().stopAutoBackup()
    await useBackupable().clearBackups()
  })

  it('createBackup capture les noeuds et arêtes courants', async () => {
    const store = useGraphStore()
    await store.importNode(makeNode('a'))
    const trait = useBackupable()

    const entry = await trait.createBackup('test')
    expect(entry.label).toBe('test')
    expect(entry.source).toBe('manual')
    expect(entry.nodes.a).toBeDefined()
    expect(entry.nodes.a.id).toBe('a')
  })

  it('restoreBackup remplace l’état courant par celui du snapshot', async () => {
    const store = useGraphStore()
    await store.importNode(makeNode('a'))
    const trait = useBackupable()
    const entry = await trait.createBackup('avant')

    // On modifie après le snapshot.
    await store.importNode(makeNode('b'))
    expect(Object.keys(store.nodes).sort()).toEqual(['a', 'b'])

    await trait.restoreBackup(entry.id)
    expect(Object.keys(store.nodes)).toEqual(['a'])
  })

  it('respecte maxBackups en purgeant les plus anciens', async () => {
    const trait = useBackupable({ maxBackups: 2 })
    await trait.createBackup('1')
    await new Promise((r) => setTimeout(r, 5))
    await trait.createBackup('2')
    await new Promise((r) => setTimeout(r, 5))
    await trait.createBackup('3')

    expect(trait.backups.value).toHaveLength(2)
    const labels = trait.backups.value.map((b) => b.label).sort()
    expect(labels).toEqual(['2', '3'])
  })

  it('deleteBackup retire une entrée précise', async () => {
    const trait = useBackupable()
    const first = await trait.createBackup('1')
    await trait.createBackup('2')
    expect(trait.backups.value).toHaveLength(2)

    await trait.deleteBackup(first.id)
    expect(trait.backups.value).toHaveLength(1)
    expect(trait.backups.value[0].label).toBe('2')
  })

  it('clearBackups vide totalement la liste', async () => {
    const trait = useBackupable()
    await trait.createBackup('1')
    await trait.createBackup('2')
    await trait.clearBackups()
    expect(trait.backups.value).toHaveLength(0)
  })

  it('startAutoBackup / stopAutoBackup togglent isAutoBackupActive', () => {
    const trait = useBackupable({ intervalMs: 60_000 })
    expect(trait.isAutoBackupActive.value).toBe(false)
    trait.startAutoBackup()
    expect(trait.isAutoBackupActive.value).toBe(true)
    trait.stopAutoBackup()
    expect(trait.isAutoBackupActive.value).toBe(false)
  })
})
