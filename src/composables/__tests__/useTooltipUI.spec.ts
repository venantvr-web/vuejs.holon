// src/composables/__tests__/useTooltipUI.spec.ts
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { tooltipDirective, useTooltipUI, TOOLTIP_HOST_ID } from '../useTooltipUI'

/**
 * Mini-utilitaire qui simule le cycle Vue (`mounted` puis éventuellement
 * `updated`/`unmounted`) sans monter un composant complet. Suffit pour
 * tester la directive isolément.
 */
function applyDirective(el: HTMLElement, value: unknown) {
  tooltipDirective.mounted!(el, { value, oldValue: undefined } as never, {} as never, {} as never)
}
function updateDirective(el: HTMLElement, value: unknown, oldValue: unknown) {
  tooltipDirective.updated!(el, { value, oldValue } as never, {} as never, {} as never)
}
function unmountDirective(el: HTMLElement) {
  tooltipDirective.unmounted!(
    el,
    { value: null, oldValue: null } as never,
    {} as never,
    {} as never
  )
}

describe('useTooltipUI / directive v-tooltip', () => {
  let el: HTMLElement

  beforeEach(() => {
    el = document.createElement('button')
    el.textContent = 'cible'
    document.body.appendChild(el)
    // Réinitialisation : on cache un éventuel tooltip actif d'un précédent test.
    useTooltipUI().hide()
  })

  afterEach(() => {
    unmountDirective(el)
    el.remove()
  })

  it("pose aria-describedby et neutralise le title natif à l'application", () => {
    el.setAttribute('title', 'natif')
    applyDirective(el, 'Mon tooltip')

    expect(el.getAttribute('aria-describedby')).toBe(TOOLTIP_HOST_ID)
    expect(el.getAttribute('title')).toBe(null)
  })

  it('restaure le title natif et retire aria-describedby au démontage', () => {
    el.setAttribute('title', 'natif')
    applyDirective(el, 'Mon tooltip')
    unmountDirective(el)

    expect(el.getAttribute('title')).toBe('natif')
    expect(el.getAttribute('aria-describedby')).toBe(null)
  })

  it('affiche immédiatement le tooltip au focus (sans délai)', () => {
    applyDirective(el, 'Au focus')
    el.dispatchEvent(new FocusEvent('focus'))

    const { activeTooltip } = useTooltipUI()
    expect(activeTooltip.value?.text).toBe('Au focus')
  })

  it('cache le tooltip au blur', () => {
    applyDirective(el, 'Au focus')
    el.dispatchEvent(new FocusEvent('focus'))
    el.dispatchEvent(new FocusEvent('blur'))

    const { activeTooltip } = useTooltipUI()
    expect(activeTooltip.value).toBe(null)
  })

  it("respecte le délai d'apparition au pointerenter", async () => {
    vi.useFakeTimers()
    try {
      applyDirective(el, { text: 'différé', delay: 200 })
      el.dispatchEvent(new PointerEvent('pointerenter'))

      const { activeTooltip } = useTooltipUI()
      // Avant le délai : pas encore affiché.
      expect(activeTooltip.value).toBe(null)

      vi.advanceTimersByTime(200)
      expect(activeTooltip.value?.text).toBe('différé')
    } finally {
      vi.useRealTimers()
    }
  })

  it('annule le délai si le pointer quitte avant la fin', async () => {
    vi.useFakeTimers()
    try {
      applyDirective(el, { text: 'annulé', delay: 200 })
      el.dispatchEvent(new PointerEvent('pointerenter'))
      vi.advanceTimersByTime(50)
      el.dispatchEvent(new PointerEvent('pointerleave'))
      vi.advanceTimersByTime(300)

      const { activeTooltip } = useTooltipUI()
      expect(activeTooltip.value).toBe(null)
    } finally {
      vi.useRealTimers()
    }
  })

  it('ignore les valeurs falsy (string vide, null, objet sans text)', () => {
    applyDirective(el, '')
    expect(el.getAttribute('aria-describedby')).toBe(null)

    applyDirective(el, null)
    expect(el.getAttribute('aria-describedby')).toBe(null)

    applyDirective(el, { placement: 'top' } as unknown)
    expect(el.getAttribute('aria-describedby')).toBe(null)
  })

  it('au update avec nouvelle valeur, rebranche tout proprement', () => {
    applyDirective(el, 'v1')
    el.dispatchEvent(new FocusEvent('focus'))
    expect(useTooltipUI().activeTooltip.value?.text).toBe('v1')

    updateDirective(el, 'v2', 'v1')
    el.dispatchEvent(new FocusEvent('focus'))
    expect(useTooltipUI().activeTooltip.value?.text).toBe('v2')
  })
})
