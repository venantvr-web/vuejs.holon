// src/composables/traits/__tests__/useEventStormable.spec.ts
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'

// Stub Dexie : toutes les opérations DB résolvent sans effet réel. Les tests
// se concentrent sur la cohérence de l'état réactif et de la logique métier.
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
import {
  useEventStormable,
  getAllEventStormingTypes,
  EVENT_STORMING_TYPES,
  EVENT_STORMING_GRAMMAR,
  type EventStormingType,
} from '../useEventStormable'
import type { Node, Edge } from '../../../types'

function makeSticker(id: string, type: EventStormingType): Node {
  const def = EVENT_STORMING_TYPES[type]
  return {
    id,
    parentId: null,
    type: def.nodeType,
    geometry: { x: 0, y: 0, w: def.width, h: def.height },
    styling: { fill: def.fill, stroke: def.stroke, strokeWidth: 1.5, opacity: 1 },
    data: { name: def.label, eventStormingType: type },
  }
}

function makeEdge(id: string, sourceId: string, targetId: string): Edge {
  return { id, sourceId, targetId, routing: 'straight' }
}

describe('useEventStormable', () => {
  let store: ReturnType<typeof useGraphStore>
  let trait: ReturnType<typeof useEventStormable>

  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
    store = useGraphStore()
    trait = useEventStormable()
    trait.setNotationMode('archimate')
  })

  describe('catalogue des stickers', () => {
    it('expose les 8 types canoniques', () => {
      const types = Object.keys(EVENT_STORMING_TYPES)
      expect(types).toHaveLength(8)
      expect(types).toEqual(
        expect.arrayContaining([
          'domain-event',
          'command',
          'actor',
          'aggregate',
          'policy',
          'read-model',
          'external-system',
          'hotspot',
        ])
      )
    })

    it('définit des couleurs hexadécimales et des tailles positives', () => {
      for (const def of Object.values(EVENT_STORMING_TYPES)) {
        expect(def.fill).toMatch(/^#[0-9A-Fa-f]{6}$/)
        expect(def.stroke).toMatch(/^#[0-9A-Fa-f]{6}$/)
        expect(def.width).toBeGreaterThan(0)
        expect(def.height).toBeGreaterThan(0)
      }
    })

    it("l'agrégat est le seul conteneur du catalogue", () => {
      const containers = Object.entries(EVENT_STORMING_TYPES)
        .filter(([, def]) => def.nodeType === 'container')
        .map(([type]) => type)
      expect(containers).toEqual(['aggregate'])
    })

    it('getAllEventStormingTypes renvoie le catalogue complet à plat', () => {
      const all = getAllEventStormingTypes()
      expect(all).toHaveLength(8)
      expect(all[0]).toMatchObject({ type: 'domain-event', fill: '#FFA94D' })
      for (const item of all) {
        expect(EVENT_STORMING_TYPES[item.type]).toBeDefined()
      }
    })
  })

  describe('bascule de notation', () => {
    it('démarre en notation Archimate par défaut', () => {
      expect(trait.notationMode.value).toBe('archimate')
      expect(trait.isEventStormingMode.value).toBe(false)
    })

    it('setNotationMode change le mode et le persiste', () => {
      trait.setNotationMode('event-storming')
      expect(trait.notationMode.value).toBe('event-storming')
      expect(trait.isEventStormingMode.value).toBe(true)
      expect(localStorage.getItem('holon-notation-mode')).toBe('event-storming')
    })

    it('toggleNotationMode alterne entre les deux notations', () => {
      trait.toggleNotationMode()
      expect(trait.notationMode.value).toBe('event-storming')
      trait.toggleNotationMode()
      expect(trait.notationMode.value).toBe('archimate')
    })

    it("l'état est partagé entre deux instances du trait (état module)", () => {
      const other = useEventStormable()
      trait.setNotationMode('event-storming')
      expect(other.notationMode.value).toBe('event-storming')
    })
  })

  describe('createStickerTemplate', () => {
    it('construit un gabarit conforme à la définition du type', () => {
      const template = trait.createStickerTemplate('domain-event')
      expect(template.type).toBe('shape')
      expect(template.geometry).toEqual({ x: 0, y: 0, w: 140, h: 90 })
      expect(template.styling.fill).toBe('#FFA94D')
      expect(template.styling.stroke).toBe('#E8590C')
      expect(template.data.eventStormingType).toBe('domain-event')
      expect(template.data.name).toBe('Domain Event')
      // La couleur du sticker est signifiante : elle ne doit pas être
      // écrasée par un tint de type.
      expect(template.data.customFill).toBe(true)
    })

    it('accepte un nom localisé en surcharge', () => {
      const template = trait.createStickerTemplate('command', 'Valider la commande')
      expect(template.data.name).toBe('Valider la commande')
    })

    it("l'agrégat est un conteneur avec autosize", () => {
      const template = trait.createStickerTemplate('aggregate')
      expect(template.type).toBe('container')
      expect(template.data.autosize).toBe(true)
    })

    it('les stickers simples ne portent pas autosize', () => {
      const template = trait.createStickerTemplate('actor')
      expect(template.data.autosize).toBeUndefined()
    })

    it('le gabarit est instanciable via le store', async () => {
      const template = trait.createStickerTemplate('policy')
      const node = await store.createNode(template, null)
      expect(trait.getStickerType(node)).toBe('policy')
    })
  })

  describe('getStickerType', () => {
    it('renvoie le type pour un sticker valide', () => {
      expect(trait.getStickerType(makeSticker('a', 'hotspot'))).toBe('hotspot')
    })

    it('renvoie null pour un noeud non typé, un type inconnu ou null', () => {
      const plain = makeSticker('a', 'actor')
      plain.data = { name: 'Sans type' }
      expect(trait.getStickerType(plain)).toBeNull()

      const unknown = makeSticker('b', 'actor')
      unknown.data = { eventStormingType: 'banana' }
      expect(trait.getStickerType(unknown)).toBeNull()

      expect(trait.getStickerType(null)).toBeNull()
      expect(trait.getStickerType(undefined)).toBeNull()
    })
  })

  describe('checkGrammar', () => {
    it('accepte le cycle canonique complet sans violation', async () => {
      await store.importNode(makeSticker('actor', 'actor'))
      await store.importNode(makeSticker('command', 'command'))
      await store.importNode(makeSticker('aggregate', 'aggregate'))
      await store.importNode(makeSticker('event', 'domain-event'))
      await store.importNode(makeSticker('policy', 'policy'))
      await store.importNode(makeSticker('read', 'read-model'))

      await store.importEdge(makeEdge('e1', 'actor', 'command'))
      await store.importEdge(makeEdge('e2', 'command', 'aggregate'))
      await store.importEdge(makeEdge('e3', 'aggregate', 'event'))
      await store.importEdge(makeEdge('e4', 'event', 'policy'))
      await store.importEdge(makeEdge('e5', 'policy', 'command'))
      await store.importEdge(makeEdge('e6', 'event', 'read'))
      await store.importEdge(makeEdge('e7', 'read', 'actor'))

      expect(trait.checkGrammar()).toEqual([])
    })

    it('signale une relation contraire à la grammaire', async () => {
      await store.importNode(makeSticker('command', 'command'))
      await store.importNode(makeSticker('policy', 'policy'))
      await store.importEdge(makeEdge('e1', 'command', 'policy'))

      const issues = trait.checkGrammar()
      expect(issues).toHaveLength(1)
      expect(issues[0]).toMatchObject({
        edgeId: 'e1',
        sourceType: 'command',
        targetType: 'policy',
      })
    })

    it('ignore le point chaud (annotation libre, dans les deux sens)', async () => {
      await store.importNode(makeSticker('hotspot', 'hotspot'))
      await store.importNode(makeSticker('event', 'domain-event'))
      await store.importEdge(makeEdge('e1', 'hotspot', 'event'))
      await store.importEdge(makeEdge('e2', 'event', 'hotspot'))

      expect(trait.checkGrammar()).toEqual([])
    })

    it('ignore les liens impliquant un noeud non typé', async () => {
      const plain = makeSticker('plain', 'actor')
      plain.data = { name: 'Boîte libre' }
      await store.importNode(plain)
      await store.importNode(makeSticker('event', 'domain-event'))
      await store.importEdge(makeEdge('e1', 'plain', 'event'))

      expect(trait.checkGrammar()).toEqual([])
    })
  })

  describe('grammaire', () => {
    it('chaque cible référencée existe dans le catalogue', () => {
      for (const targets of Object.values(EVENT_STORMING_GRAMMAR)) {
        for (const target of targets) {
          expect(EVENT_STORMING_TYPES[target]).toBeDefined()
        }
      }
    })
  })
})
