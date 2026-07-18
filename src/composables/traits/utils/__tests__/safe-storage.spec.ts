// src/composables/traits/utils/__tests__/safe-storage.spec.ts
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { safeGetItem, safeSetItem, safeGetJSON, safeSetJSON } from '../safe-storage'

describe('safe-storage', () => {
  beforeEach(() => localStorage.clear())
  afterEach(() => vi.restoreAllMocks())

  it('écrit et relit une valeur brute', () => {
    expect(safeSetItem('k', 'v')).toBe(true)
    expect(safeGetItem('k')).toBe('v')
  })

  it('renvoie null pour une clé absente', () => {
    expect(safeGetItem('absente')).toBeNull()
  })

  it('sérialise et désérialise du JSON', () => {
    safeSetJSON('obj', { a: 1, b: [2, 3] })
    expect(safeGetJSON('obj', null)).toEqual({ a: 1, b: [2, 3] })
  })

  it('renvoie le fallback si la clé est absente', () => {
    expect(safeGetJSON('vide', ['défaut'])).toEqual(['défaut'])
  })

  it('renvoie le fallback si le contenu est illisible', () => {
    localStorage.setItem('cassé', '{pas du json')
    expect(safeGetJSON('cassé', 42)).toBe(42)
  })

  it('absorbe une exception de lecture (stockage indisponible)', () => {
    vi.spyOn(localStorage, 'getItem').mockImplementation(() => {
      throw new Error('SecurityError')
    })
    expect(safeGetItem('k')).toBeNull()
    expect(safeGetJSON('k', 'fallback')).toBe('fallback')
  })

  it('absorbe une exception d’écriture (quota dépassé) et renvoie false', () => {
    vi.spyOn(localStorage, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError')
    })
    expect(safeSetItem('k', 'v')).toBe(false)
    expect(safeSetJSON('k', { a: 1 })).toBe(false)
  })
})
