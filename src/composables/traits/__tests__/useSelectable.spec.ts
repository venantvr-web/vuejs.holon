// src/composables/traits/__tests__/useSelectable.spec.ts
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ref } from 'vue'
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

import { useSelectable, useSelectionState } from '../useSelectable'

describe('useSelectable', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    useSelectionState().clearSelection()
  })

  it('sélectionne un noeud et le focus en même temps', () => {
    const id = ref('n1')
    const trait = useSelectable({ nodeId: id })

    expect(trait.isSelected.value).toBe(false)
    expect(trait.isFocused.value).toBe(false)

    trait.select()

    expect(trait.isSelected.value).toBe(true)
    expect(trait.isFocused.value).toBe(true)
  })

  it('en sélection simple, sélectionner un autre noeud désélectionne le précédent', () => {
    const a = useSelectable({ nodeId: ref('a') })
    const b = useSelectable({ nodeId: ref('b') })

    a.select()
    b.select() // sélection simple, pas en ajout

    expect(a.isSelected.value).toBe(false)
    expect(b.isSelected.value).toBe(true)
  })

  it('en sélection additive, conserve les anciennes sélections', () => {
    const a = useSelectable({ nodeId: ref('a') })
    const b = useSelectable({ nodeId: ref('b') })

    a.select()
    b.select(true) // ajoute à la sélection existante

    expect(a.isSelected.value).toBe(true)
    expect(b.isSelected.value).toBe(true)
  })

  it('deselect retire la sélection et le focus du noeud cible', () => {
    const id = ref('n1')
    const trait = useSelectable({ nodeId: id })
    trait.select()

    trait.deselect()

    expect(trait.isSelected.value).toBe(false)
    expect(trait.isFocused.value).toBe(false)
  })

  it('focus et blur ne touchent pas à la sélection', () => {
    const id = ref('n1')
    const trait = useSelectable({ nodeId: id })
    trait.select()

    trait.blur()
    expect(trait.isSelected.value).toBe(true)
    expect(trait.isFocused.value).toBe(false)

    trait.focus()
    expect(trait.isFocused.value).toBe(true)
  })

  it("clearSelection vide l'état global pour tous les noeuds", () => {
    const a = useSelectable({ nodeId: ref('a') })
    const b = useSelectable({ nodeId: ref('b') })
    a.select()
    b.select(true)

    useSelectionState().clearSelection()

    expect(a.isSelected.value).toBe(false)
    expect(b.isSelected.value).toBe(false)
  })
})
