// src/composables/traits/utils/__tests__/import-migrations.spec.ts
import { describe, it, expect } from 'vitest'
import { compareVersions, migrateImportData, CURRENT_FORMAT_VERSION } from '../import-migrations'

describe('compareVersions', () => {
  it('ordonne correctement majeur et mineur', () => {
    expect(compareVersions('1.0', '1.0')).toBe(0)
    expect(compareVersions('1.0', '1.1')).toBeLessThan(0)
    expect(compareVersions('2.0', '1.9')).toBeGreaterThan(0)
    expect(compareVersions('1.0', '1')).toBe(0)
    expect(compareVersions('1.2', '1')).toBeGreaterThan(0)
  })
})

describe('migrateImportData', () => {
  it('laisse passer un document déjà à la version courante', () => {
    const out = migrateImportData({ version: CURRENT_FORMAT_VERSION, nodes: [], edges: [] })
    expect(out.ok).toBe(true)
    expect(out.data?.version).toBe(CURRENT_FORMAT_VERSION)
    expect(out.warnings).toHaveLength(0)
  })

  it('rejette une entrée qui n’est pas un objet', () => {
    expect(migrateImportData(null).ok).toBe(false)
    expect(migrateImportData([1, 2, 3]).ok).toBe(false)
    expect(migrateImportData('x').ok).toBe(false)
  })

  it('rejette une version du futur', () => {
    const out = migrateImportData({ version: '99.0', nodes: [], edges: [] })
    expect(out.ok).toBe(false)
    expect(out.error).toMatch(/99\.0/)
  })

  it('suppose la version courante quand elle est absente, avec avertissement', () => {
    const out = migrateImportData({ nodes: [], edges: [] })
    expect(out.ok).toBe(true)
    expect(out.data?.version).toBe(CURRENT_FORMAT_VERSION)
    expect(out.warnings.length).toBeGreaterThan(0)
  })

  it('rejette une version antérieure sans chemin de migration', () => {
    // Aucune migration n'est encore définie : une version « 0.9 » inconnue et
    // antérieure ne peut pas être remontée.
    const out = migrateImportData({ version: '0.9', nodes: [], edges: [] })
    expect(out.ok).toBe(false)
    expect(out.error).toMatch(/migration/i)
  })
})
