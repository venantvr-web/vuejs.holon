// src/composables/__tests__/useViewport.spec.ts
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'

vi.mock('../../db', () => {
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

import { useViewport } from '../useViewport'
import { usePannable } from '../traits/usePannable'
import { useZoomable } from '../traits/useZoomable'
import { useGraphStore } from '../../stores/graph'
import type { Node } from '../../types'

function makeNode(id: string, x: number, y: number, w = 100, h = 80): Node {
  return {
    id,
    parentId: null,
    type: 'shape',
    geometry: { x, y, w, h },
    styling: { fill: '#fff', stroke: '#000', strokeWidth: 1, opacity: 1 },
    data: {},
  }
}

describe('useViewport (consolidation)', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    const v = useViewport()
    v.resetView(false)
  })

  it('setZoom clampe entre MIN_ZOOM et MAX_ZOOM', () => {
    const v = useViewport()
    v.setZoom(100)
    expect(v.zoomLevel.value).toBe(v.MAX_ZOOM)
    v.setZoom(0.0001)
    expect(v.zoomLevel.value).toBe(v.MIN_ZOOM)
  })

  it('zoomPercent reflète zoomLevel × 100 arrondi', () => {
    const v = useViewport()
    v.setZoom(1.234)
    expect(v.zoomPercent.value).toBe(123)
  })

  it('zoomAroundScreenPoint conserve la position écran du point sous la souris', () => {
    const v = useViewport()
    // Avant : pan = (0,0), zoom = 1. Point écran (200, 100) = monde (200, 100).
    // Après zoom × 2 autour de ce point, le point monde doit toujours se
    // projeter sur l'écran (200, 100).
    v.zoomAroundScreenPoint(2, 200, 100)
    const screenAfter = {
      x: v.pan.value.x + 200 * v.zoomLevel.value,
      y: v.pan.value.y + 100 * v.zoomLevel.value,
    }
    expect(screenAfter.x).toBeCloseTo(200, 5)
    expect(screenAfter.y).toBeCloseTo(100, 5)
  })

  it('fitWorldBox centre et adapte le zoom à la bbox monde', () => {
    const v = useViewport()
    v.fitWorldBox({ x: 0, y: 0, w: 100, h: 100 }, 1000, 1000, 0, false)
    // Le contenu (100x100) tient largement → zoom limité par max (5).
    expect(v.zoomLevel.value).toBeLessThanOrEqual(v.MAX_ZOOM)
    // Le centre monde (50,50) doit tomber au centre écran (500,500).
    const projectedX = v.pan.value.x + 50 * v.zoomLevel.value
    expect(projectedX).toBeCloseTo(500, 3)
  })
})

describe('usePannable façade de useViewport', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    useViewport().resetView(false)
  })

  it('panX/panY lisent et écrivent dans viewport.pan', () => {
    const v = useViewport()
    const p = usePannable()

    p.panX.value = 50
    p.panY.value = 80
    expect(v.pan.value).toEqual({ x: 50, y: 80 })

    v.pan.value = { x: 7, y: 9 }
    expect(p.panX.value).toBe(7)
    expect(p.panY.value).toBe(9)
  })

  it('panTo sans animation met à jour le viewport instantanément', () => {
    const v = useViewport()
    const p = usePannable()
    p.panTo(123, 456, false)
    expect(v.pan.value).toEqual({ x: 123, y: 456 })
  })

  it('panBy applique un delta cumulatif', () => {
    const v = useViewport()
    const p = usePannable()
    p.panTo(100, 100, false)
    p.panBy(10, -5)
    expect(v.pan.value).toEqual({ x: 110, y: 95 })
  })

  it('resetPan(false) ramène à l’origine immédiatement', () => {
    const v = useViewport()
    const p = usePannable()
    p.panTo(50, 50, false)
    p.resetPan(false)
    expect(v.pan.value).toEqual({ x: 0, y: 0 })
  })

  it('centerOn place le point monde au centre écran (en tenant compte du zoom)', () => {
    const v = useViewport()
    const p = usePannable()
    v.setZoom(2)
    p.centerOn(100, 50, 800, 600, false)
    // Vérification : (100,50) doit se projeter sur (400,300).
    const sx = v.pan.value.x + 100 * v.zoomLevel.value
    const sy = v.pan.value.y + 50 * v.zoomLevel.value
    expect(sx).toBe(400)
    expect(sy).toBe(300)
  })
})

describe('useZoomable façade de useViewport', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    useViewport().resetView(false)
  })

  it('zoom est une vue mutable sur viewport.zoomLevel', () => {
    const v = useViewport()
    const z = useZoomable()
    z.setZoomLevel(2)
    expect(v.zoomLevel.value).toBe(2)
    expect(z.zoom.value).toBe(2)
  })

  it('zoomIn/zoomOut ajoutent ou retirent zoomStep', () => {
    const z = useZoomable({ zoomStep: 0.25 })
    z.setZoomLevel(1)
    z.zoomIn()
    expect(z.zoom.value).toBeCloseTo(1.25)
    z.zoomOut()
    z.zoomOut()
    expect(z.zoom.value).toBeCloseTo(0.75)
  })

  it('resetZoom remet à 100 %', () => {
    const z = useZoomable()
    z.setZoomLevel(3)
    z.resetZoom()
    expect(z.zoom.value).toBe(1)
  })

  // Helper : attendre la fin d'une animation rAF (durée par défaut 300 ms +
  // marge). Permet d'observer l'état final du viewport dans les tests qui
  // déclenchent fitWorldBox / animateViewport.
  async function settleAnimation() {
    await new Promise((resolve) => setTimeout(resolve, 400))
  }

  it('zoomToSelection ajuste le viewport autour de la bbox des noeuds donnés', async () => {
    const store = useGraphStore()
    await store.importNode(makeNode('a', 0, 0, 100, 100))
    await store.importNode(makeNode('b', 200, 200, 100, 100))

    const v = useViewport()
    const z = useZoomable()
    z.zoomToSelection(['a', 'b'], 1000, 1000)
    await settleAnimation()
    // Centre de la bbox = (150, 150) → doit se projeter au centre écran (500,500).
    const sx = v.pan.value.x + 150 * v.zoomLevel.value
    expect(sx).toBeCloseTo(500, 3)
  })

  it('zoomToFit sans noeud reset à l’origine', async () => {
    const v = useViewport()
    const z = useZoomable()
    v.setZoom(3)
    v.pan.value = { x: 100, y: 100 }
    z.zoomToFit(1000, 1000)
    await settleAnimation()
    expect(v.zoomLevel.value).toBe(1)
    expect(v.pan.value).toEqual({ x: 0, y: 0 })
  })
})
