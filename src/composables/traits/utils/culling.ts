// src/composables/traits/utils/culling.ts
import type { Node } from '../../../types'
import { getCachedAbsolutePosition } from './position-cache'

/**
 * Rectangle en coordonnées monde.
 */
export interface WorldRect {
  x: number
  y: number
  w: number
  h: number
}

/**
 * Marge d'hystérésis par défaut (en unités monde) appliquée lors du culling.
 *
 * Sans marge, les noeuds qui sortent du viewport sont démontés *au pixel près*,
 * ce qui provoque des pops visibles au pan et casse le rendu des étiquettes
 * débordantes des conteneurs. 200 unités correspond à un demi-noeud type, ce
 * qui suffit largement pour absorber les déplacements rapides.
 */
export const DEFAULT_CULLING_MARGIN = 200

/**
 * Vérifie si un noeud (par ses coordonnées absolues monde) intersecte le
 * rectangle visible, en tenant compte d'une marge d'hystérésis.
 */
export function isAbsoluteBoxVisible(
  absX: number,
  absY: number,
  w: number,
  h: number,
  visible: WorldRect,
  margin: number = DEFAULT_CULLING_MARGIN
): boolean {
  return (
    absX + w >= visible.x - margin &&
    absY + h >= visible.y - margin &&
    absX <= visible.x + visible.w + margin &&
    absY <= visible.y + visible.h + margin
  )
}

/**
 * Vérifie si un noeud (identifié par son ID) est visible dans le viewport.
 *
 * Recompose la position absolue via le cache mémoïsé puis appelle
 * `isAbsoluteBoxVisible`. Renvoie `true` si le noeud est inconnu — laisser
 * Vue s'en occuper plutôt que culler silencieusement.
 */
export function isNodeVisible(
  node: Node,
  nodes: Record<string, Node>,
  visible: WorldRect,
  margin: number = DEFAULT_CULLING_MARGIN
): boolean {
  const pos = getCachedAbsolutePosition(node.id, nodes)
  if (!pos) return true
  return isAbsoluteBoxVisible(pos.x, pos.y, node.geometry.w, node.geometry.h, visible, margin)
}
