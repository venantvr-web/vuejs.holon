// src/composables/traits/__tests__/useValidatable.spec.ts
import { describe, it, expect, beforeEach, vi } from 'vitest'
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
import { useValidatable } from '../useValidatable'
import type { Node } from '../../../types'

function makeNode(id: string, archimateType?: string): Node {
  return {
    id,
    parentId: null,
    type: 'shape',
    geometry: { x: 0, y: 0, w: 80, h: 60 },
    styling: { fill: '#fff', stroke: '#000', strokeWidth: 1, opacity: 1 },
    data: archimateType ? { name: id, archimateType } : { name: id },
  }
}

describe('useValidatable', () => {
  let store: ReturnType<typeof useGraphStore>
  let validatable: ReturnType<typeof useValidatable>

  beforeEach(async () => {
    setActivePinia(createPinia())
    store = useGraphStore()
    validatable = useValidatable()
    await store.importNode(makeNode('n1', 'business-actor'))
    await store.importNode(makeNode('n2', 'application-component'))
  })

  it('validateGraph renvoie une structure cohérente avec issues, stats et timestamp', () => {
    const result = validatable.validateGraph()

    expect(result).toMatchObject({
      valid: expect.any(Boolean),
      issues: expect.any(Array),
      stats: {
        errors: expect.any(Number),
        warnings: expect.any(Number),
        infos: expect.any(Number),
      },
      timestamp: expect.any(Number),
    })
    expect(result.stats.errors + result.stats.warnings + result.stats.infos).toBe(
      result.issues.length
    )
  })

  it('valid = false dès qu’une erreur de sévérité « error » est présente', () => {
    const result = validatable.validateGraph()
    if (result.stats.errors > 0) {
      expect(result.valid).toBe(false)
    } else {
      expect(result.valid).toBe(true)
    }
  })

  it('disableRule retire les issues de la règle correspondante', () => {
    const rules = validatable.getAllRules()
    const first = rules[0]
    expect(first).toBeDefined()

    validatable.disableRule(first.id)
    const result = validatable.validateGraph()
    const issuesFromDisabled = result.issues.filter((i) => i.ruleId === first.id)
    expect(issuesFromDisabled).toHaveLength(0)

    // Réactiver pour ne pas polluer les autres tests qui partagent l'état global
    validatable.enableRule(first.id)
  })

  it('setRuleSeverity modifie la sévérité dans la définition de règle', () => {
    const rules = validatable.getAllRules()
    const candidate = rules.find((r) => r.severity !== 'info')
    if (!candidate) return

    validatable.setRuleSeverity(candidate.id, 'info')
    const updated = validatable.getAllRules().find((r) => r.id === candidate.id)
    expect(updated?.severity).toBe('info')

    validatable.setRuleSeverity(candidate.id, candidate.severity)
  })

  it('lastValidationResult est mis à jour après chaque validateGraph', () => {
    // L'état du trait est module-level : on ne peut pas garantir `null` au
    // démarrage. On vérifie en revanche que le timestamp grandit après
    // chaque validation et que le résultat reflète le nouvel état.
    validatable.validateGraph()
    const first = validatable.lastValidationResult.value
    expect(first).not.toBe(null)
    validatable.validateGraph()
    const second = validatable.lastValidationResult.value
    expect(second).not.toBe(null)
    expect(second!.timestamp).toBeGreaterThanOrEqual(first!.timestamp)
  })

  it('errorCount et warningCount reflètent stats du dernier résultat', () => {
    const result = validatable.validateGraph()
    expect(validatable.errorCount.value).toBe(result.stats.errors)
    expect(validatable.warningCount.value).toBe(result.stats.warnings)
  })

  it('validateNode filtre les issues touchant ce noeud', async () => {
    // On garantit au moins un graphe non-trivial pour solliciter les règles.
    await store.importNode(makeNode('orphelin'))
    const issues = validatable.validateNode('orphelin')
    for (const issue of issues) {
      expect(issue.nodeIds).toContain('orphelin')
    }
  })
})
