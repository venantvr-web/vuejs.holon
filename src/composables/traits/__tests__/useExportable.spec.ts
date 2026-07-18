// src/composables/traits/__tests__/useExportable.spec.ts
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

// html2canvas et jsPDF nécessitent un vrai canvas ; les tests JSON/Archimate
// n'en ont pas besoin. On stubbe pour éviter les imports lourds au runtime.
vi.mock('html2canvas', () => ({ default: vi.fn() }))
vi.mock('jspdf', () => ({ jsPDF: vi.fn() }))

import { useGraphStore } from '../../../stores/graph'
import { useExportable } from '../useExportable'
import { useImportable } from '../useImportable'
import type { Node, Edge } from '../../../types'

function makeNode(id: string, archimateType?: string): Node {
  return {
    id,
    parentId: null,
    type: 'shape',
    geometry: { x: 0, y: 0, w: 80, h: 60 },
    styling: { fill: '#fff', stroke: '#000', strokeWidth: 1, opacity: 1 },
    data: archimateType ? { name: `nom-${id}`, archimateType } : { name: `nom-${id}` },
  }
}

function makeEdge(id: string, source: string, target: string, relationType?: string): Edge {
  return {
    id,
    sourceId: source,
    targetId: target,
    routing: 'straight',
    data: relationType ? { relationType } : {},
  }
}

describe('useExportable', () => {
  let store: ReturnType<typeof useGraphStore>
  let exporter: ReturnType<typeof useExportable>

  beforeEach(async () => {
    setActivePinia(createPinia())
    store = useGraphStore()
    exporter = useExportable()
    await store.importNode(makeNode('a', 'business-actor'))
    await store.importNode(makeNode('b', 'application-component'))
    await store.importEdge(makeEdge('e1', 'a', 'b', 'Composition'))
  })

  describe('exportAsJSON', () => {
    it('renvoie un JSON parsable contenant noeuds et arêtes du store', () => {
      const json = exporter.exportAsJSON()
      const parsed = JSON.parse(json)

      expect(parsed.nodes).toHaveLength(2)
      expect(parsed.edges).toHaveLength(1)
      expect(parsed.nodes.map((n: Node) => n.id).sort()).toEqual(['a', 'b'])
      expect(parsed.edges[0]).toMatchObject({ id: 'e1', sourceId: 'a', targetId: 'b' })
    })

    it('inclut les métadonnées par défaut, mais peut les omettre', () => {
      const withMeta = JSON.parse(exporter.exportAsJSON())
      expect(withMeta.metadata).toBeDefined()
      expect(withMeta.metadata.nodeCount).toBe(2)
      expect(withMeta.metadata.edgeCount).toBe(1)

      const withoutMeta = JSON.parse(exporter.exportAsJSON({ includeMetadata: false }))
      expect(withoutMeta.metadata).toBeUndefined()
    })

    it('inclut une version et un timestamp ISO d’export', () => {
      const parsed = JSON.parse(exporter.exportAsJSON())
      expect(parsed.version).toBeTruthy()
      expect(parsed.exportedAt).toMatch(/\d{4}-\d{2}-\d{2}T/)
    })
  })

  describe('exportAsArchimate', () => {
    it('produit un XML conforme à l’en-tête Archimate 3', () => {
      const xml = exporter.exportAsArchimate()
      expect(xml).toContain('<?xml version="1.0"')
      expect(xml).toContain('<archimate:model')
      expect(xml).toContain('xmlns:archimate="http://www.opengroup.org/xsd/archimate/3.0/"')
    })

    it('liste les noeuds dans <elements> avec leur type au format standard Open Group', () => {
      const xml = exporter.exportAsArchimate()
      expect(xml).toContain('<elements>')
      expect(xml).toContain('id="a"')
      expect(xml).toContain('id="b"')
      // Le type interne kebab-case est converti en PascalCase conforme.
      expect(xml).toContain('xsi:type="archimate:BusinessActor"')
      expect(xml).toContain('xsi:type="archimate:ApplicationComponent"')
      expect(xml).not.toContain('archimate:business-actor')
    })

    it('liste les relations avec source et target', () => {
      const xml = exporter.exportAsArchimate()
      expect(xml).toContain('<relationships>')
      expect(xml).toContain('id="e1"')
      expect(xml).toContain('source="a"')
      expect(xml).toContain('target="b"')
      expect(xml).toContain('xsi:type="archimate:Composition"')
    })

    it('préserve le type interne lors d\'un aller-retour export → import', async () => {
      // Export Archimate du graphe courant (business-actor + application-component).
      const xml = exporter.exportAsArchimate()

      // Réimport dans un store neuf.
      setActivePinia(createPinia())
      const freshStore = useGraphStore()
      const { importFromArchimate } = useImportable()
      const result = await importFromArchimate(xml)

      expect(result.success).toBe(true)
      const types = Object.values(freshStore.nodes)
        .map((n) => n.data?.archimateType)
        .sort()
      // Les types reviennent au format interne kebab-case, pas en PascalCase.
      expect(types).toEqual(['application-component', 'business-actor'])
    })

    it('échappe les caractères XML dangereux dans les noms', async () => {
      await store.importNode({
        id: 'x',
        parentId: null,
        type: 'shape',
        geometry: { x: 0, y: 0, w: 80, h: 60 },
        styling: { fill: '#fff', stroke: '#000', strokeWidth: 1, opacity: 1 },
        data: { name: '<script>alert("xss")</script>' },
      })
      const xml = exporter.exportAsArchimate()
      expect(xml).not.toContain('<script>alert')
      expect(xml).toContain('&lt;script')
    })
  })
})
