// src/composables/traits/__tests__/useImportable.spec.ts
import { describe, it, expect, beforeEach, vi } from 'vitest'
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
import { useImportable } from '../useImportable'

/** Payload JSON valide (format d'export v1.0). */
function validJson(opts?: { nodes?: unknown[]; edges?: unknown[] }): string {
  return JSON.stringify({
    version: '1.0',
    exportedAt: new Date().toISOString(),
    nodes: opts?.nodes ?? [
      {
        id: 'imported-a',
        parentId: null,
        type: 'shape',
        geometry: { x: 0, y: 0, w: 100, h: 60 },
        styling: { fill: '#fff', stroke: '#333', strokeWidth: 1, opacity: 1 },
        data: { name: 'Alpha' },
      },
    ],
    edges: opts?.edges ?? [],
  })
}

describe('useImportable', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  describe('importFromJSON — happy path', () => {
    it('importe un noeud simple en préservant son ID', async () => {
      const store = useGraphStore()
      const { importFromJSON } = useImportable()

      const result = await importFromJSON(validJson())

      expect(result.success).toBe(true)
      expect(result.nodesImported).toBe(1)
      expect(store.nodes['imported-a']).toBeDefined()
      expect(store.nodes['imported-a'].data.name).toBe('Alpha')
    })

    it('importe une hiérarchie parent/enfant cohérente', async () => {
      const store = useGraphStore()
      const { importFromJSON } = useImportable()

      const json = validJson({
        nodes: [
          {
            id: 'p',
            parentId: null,
            type: 'container',
            geometry: { x: 0, y: 0, w: 300, h: 200 },
            styling: { fill: '#fff', stroke: '#333', strokeWidth: 1, opacity: 1 },
            data: {},
          },
          {
            id: 'c',
            parentId: 'p',
            type: 'shape',
            geometry: { x: 10, y: 10, w: 80, h: 40 },
            styling: { fill: '#fff', stroke: '#333', strokeWidth: 1, opacity: 1 },
            data: {},
          },
        ],
      })

      const result = await importFromJSON(json)

      expect(result.success).toBe(true)
      expect(store.nodes['p']).toBeDefined()
      expect(store.nodes['c']).toBeDefined()
      expect(store.nodes['c'].parentId).toBe('p')
    })

    it('importe les arêtes avec sourceId/targetId corrects', async () => {
      const store = useGraphStore()
      const { importFromJSON } = useImportable()

      const json = validJson({
        nodes: [
          {
            id: 'n1',
            parentId: null,
            type: 'shape',
            geometry: { x: 0, y: 0, w: 50, h: 50 },
            styling: { fill: '#fff', stroke: '#333', strokeWidth: 1, opacity: 1 },
            data: {},
          },
          {
            id: 'n2',
            parentId: null,
            type: 'shape',
            geometry: { x: 100, y: 0, w: 50, h: 50 },
            styling: { fill: '#fff', stroke: '#333', strokeWidth: 1, opacity: 1 },
            data: {},
          },
        ],
        edges: [{ id: 'e1', sourceId: 'n1', targetId: 'n2', routing: 'straight' }],
      })

      const result = await importFromJSON(json)

      expect(result.success).toBe(true)
      expect(result.edgesImported).toBe(1)
      expect(store.edges['e1']).toBeDefined()
      expect(store.edges['e1'].sourceId).toBe('n1')
      expect(store.edges['e1'].targetId).toBe('n2')
    })
  })

  describe('normalisation par les valeurs par défaut du schéma', () => {
    it("applique routing='straight' à une arête importée sans routing", async () => {
      const store = useGraphStore()
      const { importFromJSON } = useImportable()

      const json = JSON.stringify({
        version: '1.0',
        nodes: [
          {
            id: 'n1',
            parentId: null,
            type: 'shape',
            geometry: { x: 0, y: 0, w: 50, h: 50 },
            styling: { fill: '#fff', stroke: '#333', strokeWidth: 1, opacity: 1 },
            data: {},
          },
          {
            id: 'n2',
            parentId: null,
            type: 'shape',
            geometry: { x: 100, y: 0, w: 50, h: 50 },
            styling: { fill: '#fff', stroke: '#333', strokeWidth: 1, opacity: 1 },
            data: {},
          },
        ],
        // routing volontairement absent
        edges: [{ id: 'e1', sourceId: 'n1', targetId: 'n2' }],
      })

      const result = await importFromJSON(json)

      expect(result.success).toBe(true)
      expect(store.edges['e1'].routing).toBe('straight')
    })

    it('conserve les marqueurs de flèche valides et rejette les invalides', async () => {
      const { validateImport } = useImportable()

      const base = {
        version: '1.0',
        nodes: [],
      }
      const ok = validateImport({
        ...base,
        edges: [
          {
            id: 'e1',
            sourceId: 'a',
            targetId: 'b',
            startArrow: 'dot',
            endArrow: 'filled-arrow',
            arrowSize: 12,
          },
        ],
      })
      expect(ok.valid).toBe(true)
      expect(ok.data?.edges[0].endArrow).toBe('filled-arrow')

      const ko = validateImport({
        ...base,
        edges: [{ id: 'e1', sourceId: 'a', targetId: 'b', endArrow: 'licorne' }],
      })
      expect(ko.valid).toBe(false)
    })
  })

  describe("erreurs d'entrée", () => {
    it("rejette un JSON malformé avec un message d'erreur", async () => {
      const { importFromJSON } = useImportable()
      const result = await importFromJSON('{ pas du tout du json')

      expect(result.success).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
    })

    it('rejette un JSON valide mais sans la structure attendue', async () => {
      const { importFromJSON } = useImportable()
      const result = await importFromJSON('{"foo": "bar"}')

      expect(result.success).toBe(false)
    })
  })

  describe("gestion des conflits d'ID (rename strategy)", () => {
    it('renomme les noeuds en conflit et remappe les arêtes', async () => {
      const store = useGraphStore()
      const { importFromJSON } = useImportable()

      // Import initial
      await importFromJSON(
        validJson({
          nodes: [
            {
              id: 'dupe',
              parentId: null,
              type: 'shape',
              geometry: { x: 0, y: 0, w: 50, h: 50 },
              styling: { fill: '#fff', stroke: '#333', strokeWidth: 1, opacity: 1 },
              data: { name: 'original' },
            },
          ],
        })
      )

      // Import d'un noeud avec même ID + stratégie rename
      const result = await importFromJSON(
        validJson({
          nodes: [
            {
              id: 'dupe',
              parentId: null,
              type: 'shape',
              geometry: { x: 50, y: 50, w: 50, h: 50 },
              styling: { fill: '#fff', stroke: '#333', strokeWidth: 1, opacity: 1 },
              data: { name: 'dupliqué' },
            },
          ],
        }),
        { onConflict: 'rename' }
      )

      expect(result.success).toBe(true)
      expect(result.warnings.length).toBeGreaterThan(0)
      // Le noeud original est préservé
      expect(store.nodes['dupe'].data.name).toBe('original')
      // Un noeud renommé a été ajouté (2 noeuds au total)
      const all = Object.values(store.nodes)
      expect(all.length).toBe(2)
      expect(all.find((n) => n.data.name === 'dupliqué')).toBeDefined()
    })

    it('ignore (skip) les noeuds en conflit quand demandé', async () => {
      const store = useGraphStore()
      const { importFromJSON } = useImportable()

      await importFromJSON(
        validJson({
          nodes: [
            {
              id: 'x',
              parentId: null,
              type: 'shape',
              geometry: { x: 0, y: 0, w: 50, h: 50 },
              styling: { fill: '#fff', stroke: '#333', strokeWidth: 1, opacity: 1 },
              data: { version: 'first' },
            },
          ],
        })
      )

      const result = await importFromJSON(
        validJson({
          nodes: [
            {
              id: 'x',
              parentId: null,
              type: 'shape',
              geometry: { x: 0, y: 0, w: 50, h: 50 },
              styling: { fill: '#fff', stroke: '#333', strokeWidth: 1, opacity: 1 },
              data: { version: 'second' },
            },
          ],
        }),
        { onConflict: 'skip' }
      )

      expect(result.success).toBe(true)
      expect(store.nodes['x'].data.version).toBe('first')
      expect(Object.keys(store.nodes)).toHaveLength(1)
    })
  })

  describe('stratégie de fusion', () => {
    it('mergeStrategy "replace" efface le graphe avant import', async () => {
      const store = useGraphStore()
      const { importFromJSON } = useImportable()

      await importFromJSON(
        validJson({
          nodes: [
            {
              id: 'keep',
              parentId: null,
              type: 'shape',
              geometry: { x: 0, y: 0, w: 50, h: 50 },
              styling: { fill: '#fff', stroke: '#333', strokeWidth: 1, opacity: 1 },
              data: {},
            },
          ],
        })
      )

      await importFromJSON(
        validJson({
          nodes: [
            {
              id: 'new',
              parentId: null,
              type: 'shape',
              geometry: { x: 0, y: 0, w: 50, h: 50 },
              styling: { fill: '#fff', stroke: '#333', strokeWidth: 1, opacity: 1 },
              data: {},
            },
          ],
        }),
        { mergeStrategy: 'replace' }
      )

      expect(store.nodes['keep']).toBeUndefined()
      expect(store.nodes['new']).toBeDefined()
    })

    it('mergeStrategy "merge" fusionne champ à champ les données des noeuds existants', async () => {
      const store = useGraphStore()
      const { importFromJSON } = useImportable()

      await importFromJSON(
        validJson({
          nodes: [
            {
              id: 'm',
              parentId: null,
              type: 'shape',
              geometry: { x: 0, y: 0, w: 50, h: 50 },
              styling: { fill: '#fff', stroke: '#333', strokeWidth: 1, opacity: 1 },
              data: { name: 'Origine', keep: 'moi' },
            },
          ],
        })
      )

      const result = await importFromJSON(
        validJson({
          nodes: [
            {
              id: 'm',
              parentId: null,
              type: 'shape',
              geometry: { x: 99, y: 99, w: 50, h: 50 },
              styling: { fill: '#000', stroke: '#333', strokeWidth: 1, opacity: 1 },
              data: { name: 'Fusionné', ajout: 'nouveau' },
            },
          ],
        }),
        { mergeStrategy: 'merge' }
      )

      expect(result.success).toBe(true)
      // Un seul noeud (pas de renommage)
      expect(Object.keys(store.nodes)).toHaveLength(1)
      // La géométrie/le style entrants priment
      expect(store.nodes['m'].geometry.x).toBe(99)
      expect(store.nodes['m'].styling.fill).toBe('#000')
      // data fusionnée : clé écrasée + clé conservée + clé ajoutée
      expect(store.nodes['m'].data.name).toBe('Fusionné')
      expect(store.nodes['m'].data.keep).toBe('moi')
      expect(store.nodes['m'].data.ajout).toBe('nouveau')
    })

    it('mergeStrategy "merge" ajoute les noeuds inconnus', async () => {
      const store = useGraphStore()
      const { importFromJSON } = useImportable()

      await importFromJSON(
        validJson({
          nodes: [
            {
              id: 'existant',
              parentId: null,
              type: 'shape',
              geometry: { x: 0, y: 0, w: 50, h: 50 },
              styling: { fill: '#fff', stroke: '#333', strokeWidth: 1, opacity: 1 },
              data: {},
            },
          ],
        })
      )

      await importFromJSON(
        validJson({
          nodes: [
            {
              id: 'nouveau',
              parentId: null,
              type: 'shape',
              geometry: { x: 0, y: 0, w: 50, h: 50 },
              styling: { fill: '#fff', stroke: '#333', strokeWidth: 1, opacity: 1 },
              data: {},
            },
          ],
        }),
        { mergeStrategy: 'merge' }
      )

      expect(Object.keys(store.nodes).sort()).toEqual(['existant', 'nouveau'])
    })

    it('mergeStrategy "append" (défaut) conserve l\'existant', async () => {
      const store = useGraphStore()
      const { importFromJSON } = useImportable()

      await importFromJSON(
        validJson({
          nodes: [
            {
              id: 'a',
              parentId: null,
              type: 'shape',
              geometry: { x: 0, y: 0, w: 50, h: 50 },
              styling: { fill: '#fff', stroke: '#333', strokeWidth: 1, opacity: 1 },
              data: {},
            },
          ],
        })
      )
      await importFromJSON(
        validJson({
          nodes: [
            {
              id: 'b',
              parentId: null,
              type: 'shape',
              geometry: { x: 0, y: 0, w: 50, h: 50 },
              styling: { fill: '#fff', stroke: '#333', strokeWidth: 1, opacity: 1 },
              data: {},
            },
          ],
        })
      )

      expect(Object.keys(store.nodes).sort()).toEqual(['a', 'b'])
    })
  })

  describe('validateImport', () => {
    it('accepte un payload complet', () => {
      const { validateImport } = useImportable()
      const data = JSON.parse(validJson())
      const result = validateImport(data)
      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('rejette un payload sans nodes/edges', () => {
      const { validateImport } = useImportable()
      const result = validateImport({ version: '1.0' })
      expect(result.valid).toBe(false)
    })
  })
})
