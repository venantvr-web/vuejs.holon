// src/composables/traits/useAnchorable.ts
import { type DeepReadonly, computed, type Ref } from 'vue'
import { useGraphStore } from '../../stores/graph'
import type { Node } from '../../types'
import {
  getNodeAbsolutePosition,
  getNodeCenter as getNodeCenterHelper,
} from './utils/trait-helpers'

/**
 * Positions d'ancrage disponibles pour les points de connexion.
 */
export enum AnchorPosition {
  North = 'north',
  South = 'south',
  East = 'east',
  West = 'west',
  NorthEast = 'north-east',
  NorthWest = 'north-west',
  SouthEast = 'south-east',
  SouthWest = 'south-west',
  Center = 'center',
  Auto = 'auto', // Calcul automatique du point le plus proche
}

/**
 * Représente un point d'ancrage avec ses coordonnées et sa position.
 */
export interface AnchorPoint {
  /**
   * Coordonnée X absolue du point d'ancrage.
   */
  x: number
  /**
   * Coordonnée Y absolue du point d'ancrage.
   */
  y: number
  /**
   * Position de l'ancrage sur le noeud.
   */
  position: AnchorPosition
}

/**
 * Options de configuration pour le trait Anchorable.
 */
export interface AnchorableOptions {
  /**
   * Référence réactive vers l'ID du noeud concerné.
   */
  nodeId: Ref<string>
}

/**
 * État réactif exposé par le trait Anchorable.
 */
export interface AnchorableState {
  /**
   * Liste de tous les points d'ancrage disponibles pour le noeud.
   */
  anchors: Ref<AnchorPoint[]>
  /**
   * Position d'ancrage par défaut du noeud.
   */
  defaultAnchor: Ref<AnchorPosition>
}

/**
 * Handlers (actions) exposés par le trait Anchorable.
 */
export interface AnchorableHandlers {
  /**
   * Récupère les coordonnées d'un point d'ancrage spécifique.
   * @param position - Position de l'ancrage demandée
   * @returns Point d'ancrage avec coordonnées
   */
  getAnchorPoint: (position: AnchorPosition) => AnchorPoint
  /**
   * Trouve l'ancrage le plus proche d'un point cible donné.
   * @param targetX - Coordonnée X du point cible
   * @param targetY - Coordonnée Y du point cible
   * @returns Point d'ancrage le plus proche
   */
  getNearestAnchor: (targetX: number, targetY: number) => AnchorPoint
  /**
   * Calcule le point d'intersection précis avec le bord du noeud en direction d'un point cible.
   * @param targetX - Coordonnée X du point cible
   * @param targetY - Coordonnée Y du point cible
   * @returns Point d'intersection avec le bord du noeud
   */
  getEdgeIntersection: (targetX: number, targetY: number) => AnchorPoint
  /**
   * Définit la position d'ancrage par défaut pour le noeud.
   * @param position - Nouvelle position d'ancrage par défaut
   */
  setDefaultAnchor: (position: AnchorPosition) => void
}

/**
 * Trait permettant de gérer les points d'ancrage d'un noeud pour les connexions.
 *
 * Ce trait calcule automatiquement les points d'ancrage sur les bords et coins du noeud,
 * et fournit des méthodes pour déterminer les meilleurs points de connexion.
 *
 * @param options - Configuration du trait
 * @returns État réactif et handlers pour la gestion des ancrages
 *
 * @example
 * ```typescript
 * const { anchors, getEdgeIntersection } = useAnchorable({ nodeId: ref('node-123') });
 * const intersection = getEdgeIntersection(targetX, targetY);
 * ```
 */
export function useAnchorable(options: AnchorableOptions): AnchorableState & AnchorableHandlers {
  const graphStore = useGraphStore()

  const defaultAnchor = computed(() => {
    const node = graphStore.nodes[options.nodeId.value]
    return (node?.data?.defaultAnchor as AnchorPosition) ?? AnchorPosition.Auto
  })

  // Tous les points d'ancrage disponibles
  const anchors = computed((): AnchorPoint[] => {
    const node = graphStore.nodes[options.nodeId.value]
    if (!node) return []

    const abs = getNodeAbsolutePosition(options.nodeId.value)
    if (!abs) return []
    const w = node.geometry.w
    const h = node.geometry.h

    return [
      { x: abs.x + w / 2, y: abs.y, position: AnchorPosition.North },
      { x: abs.x + w / 2, y: abs.y + h, position: AnchorPosition.South },
      { x: abs.x + w, y: abs.y + h / 2, position: AnchorPosition.East },
      { x: abs.x, y: abs.y + h / 2, position: AnchorPosition.West },
      { x: abs.x + w, y: abs.y, position: AnchorPosition.NorthEast },
      { x: abs.x, y: abs.y, position: AnchorPosition.NorthWest },
      { x: abs.x + w, y: abs.y + h, position: AnchorPosition.SouthEast },
      { x: abs.x, y: abs.y + h, position: AnchorPosition.SouthWest },
      { x: abs.x + w / 2, y: abs.y + h / 2, position: AnchorPosition.Center },
    ]
  })

  function getAnchorPoint(position: AnchorPosition): AnchorPoint {
    const node = graphStore.nodes[options.nodeId.value]
    if (!node) return { x: 0, y: 0, position }

    const abs = getNodeAbsolutePosition(options.nodeId.value)
    if (!abs) return { x: 0, y: 0, position }
    const w = node.geometry.w
    const h = node.geometry.h

    switch (position) {
      case AnchorPosition.North:
        return { x: abs.x + w / 2, y: abs.y, position }
      case AnchorPosition.South:
        return { x: abs.x + w / 2, y: abs.y + h, position }
      case AnchorPosition.East:
        return { x: abs.x + w, y: abs.y + h / 2, position }
      case AnchorPosition.West:
        return { x: abs.x, y: abs.y + h / 2, position }
      case AnchorPosition.NorthEast:
        return { x: abs.x + w, y: abs.y, position }
      case AnchorPosition.NorthWest:
        return { x: abs.x, y: abs.y, position }
      case AnchorPosition.SouthEast:
        return { x: abs.x + w, y: abs.y + h, position }
      case AnchorPosition.SouthWest:
        return { x: abs.x, y: abs.y + h, position }
      case AnchorPosition.Center:
        return { x: abs.x + w / 2, y: abs.y + h / 2, position }
      default:
        return { x: abs.x + w / 2, y: abs.y + h / 2, position: AnchorPosition.Center }
    }
  }

  // Trouve l'ancre la plus proche d'un point cible
  function getNearestAnchor(targetX: number, targetY: number): AnchorPoint {
    const allAnchors = anchors.value
    if (allAnchors.length === 0) {
      return { x: 0, y: 0, position: AnchorPosition.Center }
    }

    let nearest = allAnchors[0]
    let minDist = Infinity

    for (const anchor of allAnchors) {
      // Exclure le centre pour les connexions
      if (anchor.position === AnchorPosition.Center) continue

      const dx = anchor.x - targetX
      const dy = anchor.y - targetY
      const dist = dx * dx + dy * dy

      if (dist < minDist) {
        minDist = dist
        nearest = anchor
      }
    }

    return nearest
  }

  // Calcule le point d'intersection avec le bord du rectangle
  // C'est la méthode clé pour que les flèches ne traversent pas les noeuds
  function getEdgeIntersection(targetX: number, targetY: number): AnchorPoint {
    const node = graphStore.nodes[options.nodeId.value]
    if (!node) return { x: 0, y: 0, position: AnchorPosition.Center }

    const abs = getNodeAbsolutePosition(options.nodeId.value)
    if (!abs) return { x: 0, y: 0, position: AnchorPosition.Center }
    const w = node.geometry.w
    const h = node.geometry.h

    // Centre du noeud
    const cx = abs.x + w / 2
    const cy = abs.y + h / 2

    // Vecteur du centre vers la cible
    const dx = targetX - cx
    const dy = targetY - cy

    // Si le point est au centre, retourner le centre
    if (dx === 0 && dy === 0) {
      return { x: cx, y: cy, position: AnchorPosition.Center }
    }

    // Calculer l'intersection avec le bord du rectangle
    // On utilise le ratio pour déterminer quel bord est touché

    // Calcul des ratios pour chaque direction
    const scaleX = Math.abs(dx) > 0 ? w / 2 / Math.abs(dx) : Infinity
    const scaleY = Math.abs(dy) > 0 ? h / 2 / Math.abs(dy) : Infinity

    // Prendre le plus petit ratio (premier bord touché)
    const scale = Math.min(scaleX, scaleY)

    // Point d'intersection
    const ix = cx + dx * scale
    const iy = cy + dy * scale

    // Déterminer la position d'ancrage
    let position: AnchorPosition
    if (scaleX < scaleY) {
      // Intersection avec un bord vertical
      position = dx > 0 ? AnchorPosition.East : AnchorPosition.West
    } else if (scaleY < scaleX) {
      // Intersection avec un bord horizontal
      position = dy > 0 ? AnchorPosition.South : AnchorPosition.North
    } else {
      // Coin
      if (dx > 0 && dy > 0) position = AnchorPosition.SouthEast
      else if (dx > 0 && dy < 0) position = AnchorPosition.NorthEast
      else if (dx < 0 && dy > 0) position = AnchorPosition.SouthWest
      else position = AnchorPosition.NorthWest
    }

    return { x: ix, y: iy, position }
  }

  function setDefaultAnchor(position: AnchorPosition) {
    const node = graphStore.nodes[options.nodeId.value]
    if (!node) return

    graphStore.updateNode(options.nodeId.value, {
      data: {
        ...node.data,
        defaultAnchor: position,
      },
    })
  }

  return {
    anchors,
    defaultAnchor: computed(() => defaultAnchor.value),
    getAnchorPoint,
    getNearestAnchor,
    getEdgeIntersection,
    setDefaultAnchor,
  }
}

// Helper pour calculer l'intersection depuis l'extérieur
export function calculateEdgeIntersection(
  nodeId: string,
  targetX: number,
  targetY: number,
  nodes: DeepReadonly<Record<string, Node>>
): { x: number; y: number } {
  const node = nodes[nodeId]
  if (!node) return { x: 0, y: 0 }

  const abs = getNodeAbsolutePosition(nodeId)
  if (!abs) return { x: 0, y: 0 }
  const w = node.geometry.w
  const h = node.geometry.h

  const cx = abs.x + w / 2
  const cy = abs.y + h / 2

  const dx = targetX - cx
  const dy = targetY - cy

  if (dx === 0 && dy === 0) {
    return { x: cx, y: cy }
  }

  const scaleX = Math.abs(dx) > 0 ? w / 2 / Math.abs(dx) : Infinity
  const scaleY = Math.abs(dy) > 0 ? h / 2 / Math.abs(dy) : Infinity
  const scale = Math.min(scaleX, scaleY)

  return {
    x: cx + dx * scale,
    y: cy + dy * scale,
  }
}

// Helper pour calculer le centre absolu d'un noeud
// Note: Wrapper pour compatibilité avec l'ancienne signature qui prend 'nodes'
export function getNodeCenter(
  nodeId: string,
  _nodes: DeepReadonly<Record<string, Node>>
): { x: number; y: number } {
  return getNodeCenterHelper(nodeId) || { x: 0, y: 0 }
}
