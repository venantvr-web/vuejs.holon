// src/composables/traits/utils/position-cache.ts
import type { Node } from '../../../types'

/**
 * Cache mémoïsé des positions absolues monde des noeuds.
 *
 * Le calcul d'une position absolue est en O(profondeur) — il remonte la chaîne
 * des parents. Sur un graphe modeste rendu à 60 fps, on observe quelques
 * dizaines à centaines d'appels par frame (collision, halo, mini-map, arêtes,
 * focus, marquee...). Sans cache, chaque rendu refait toutes les remontées,
 * ce qui fait s'effondrer le FPS dès quelques centaines de noeuds.
 *
 * Stratégie : un compteur `version` global. Tant qu'aucune mutation
 * topologique ou géométrique ne survient, les positions sont stables ; le
 * cache renvoie en O(1). À la première mutation, on bump la version et le
 * cache se réhydrate paresseusement à la première lecture suivante.
 *
 * Cette stratégie est volontairement grossière : elle invalide tout à chaque
 * mutation. C'est le bon compromis tant que les patterns d'usage sont
 * « beaucoup de lectures entre les mutations », ce qui est le cas pendant
 * le rendu et l'interaction (un drag ≈ 1 mutation toutes les ~16 ms suivies
 * de N lectures pour relayouter).
 */

let version = 0
const cache = new Map<string, { x: number; y: number; version: number }>()

/**
 * Bump la version globale : toutes les entrées de cache deviennent obsolètes.
 * À appeler depuis le store dès qu'une mutation modifie `geometry.x`,
 * `geometry.y` ou `parentId` d'un noeud (ou crée/supprime un noeud).
 */
export function invalidatePositionCache(): void {
  version++
  // On laisse les entrées en place : elles seront écrasées paresseusement.
  // Garder la Map évite la pression GC lors de grosses sessions d'édition.
}

/**
 * Vide complètement le cache. Réservé aux tests et au chargement initial.
 */
export function clearPositionCache(): void {
  version++
  cache.clear()
}

/**
 * Renvoie la version actuelle du cache. Exposé pour les tests.
 */
export function getPositionCacheVersion(): number {
  return version
}

/**
 * Calcule (ou récupère depuis le cache) la position absolue monde d'un noeud.
 *
 * @param nodeId - identifiant du noeud
 * @param nodes - dictionnaire `id → Node` (passé explicitement pour éviter
 *   un couplage circulaire avec le store)
 * @returns `{ x, y }` en coordonnées monde, ou `null` si le noeud n'existe pas
 */
export function getCachedAbsolutePosition(
  nodeId: string,
  nodes: Record<string, Node>
): { x: number; y: number } | null {
  const cached = cache.get(nodeId)
  if (cached && cached.version === version) {
    return { x: cached.x, y: cached.y }
  }

  const node = nodes[nodeId]
  if (!node) return null

  let absX = node.geometry.x
  let absY = node.geometry.y
  let currentParentId = node.parentId

  while (currentParentId) {
    const parent = nodes[currentParentId]
    if (!parent) break
    absX += parent.geometry.x
    absY += parent.geometry.y
    currentParentId = parent.parentId
  }

  cache.set(nodeId, { x: absX, y: absY, version })
  return { x: absX, y: absY }
}
