// src/composables/traits/useAnchorable.ts
import { computed, type Ref } from 'vue';
import { useGraphStore } from '../../stores/graph';
import type { Node } from '../../types';

// Types d'ancrage
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

export interface AnchorPoint {
  x: number;
  y: number;
  position: AnchorPosition;
}

export interface AnchorableOptions {
  nodeId: Ref<string>;
}

export interface AnchorableState {
  anchors: Ref<AnchorPoint[]>;
  defaultAnchor: Ref<AnchorPosition>;
}

export interface AnchorableHandlers {
  getAnchorPoint: (position: AnchorPosition) => AnchorPoint;
  getNearestAnchor: (targetX: number, targetY: number) => AnchorPoint;
  getEdgeIntersection: (targetX: number, targetY: number) => AnchorPoint;
  setDefaultAnchor: (position: AnchorPosition) => void;
}

// Calcule la position absolue d'un noeud (en tenant compte des parents)
function getNodeAbsolutePosition(nodeId: string, nodes: Record<string, Node>): { x: number; y: number } {
  const node = nodes[nodeId];
  if (!node) return { x: 0, y: 0 };

  let x = node.geometry.x;
  let y = node.geometry.y;

  // Remonter la hiérarchie
  let parentId = node.parentId;
  while (parentId) {
    const parent = nodes[parentId];
    if (!parent) break;
    x += parent.geometry.x;
    y += parent.geometry.y;
    parentId = parent.parentId;
  }

  return { x, y };
}

export function useAnchorable(options: AnchorableOptions): AnchorableState & AnchorableHandlers {
  const graphStore = useGraphStore();

  const defaultAnchor = computed(() => {
    const node = graphStore.nodes[options.nodeId.value];
    return (node?.data?.defaultAnchor as AnchorPosition) ?? AnchorPosition.Auto;
  });

  // Tous les points d'ancrage disponibles
  const anchors = computed((): AnchorPoint[] => {
    const node = graphStore.nodes[options.nodeId.value];
    if (!node) return [];

    const abs = getNodeAbsolutePosition(options.nodeId.value, graphStore.nodes);
    const w = node.geometry.w;
    const h = node.geometry.h;

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
    ];
  });

  function getAnchorPoint(position: AnchorPosition): AnchorPoint {
    const node = graphStore.nodes[options.nodeId.value];
    if (!node) return { x: 0, y: 0, position };

    const abs = getNodeAbsolutePosition(options.nodeId.value, graphStore.nodes);
    const w = node.geometry.w;
    const h = node.geometry.h;

    switch (position) {
      case AnchorPosition.North:
        return { x: abs.x + w / 2, y: abs.y, position };
      case AnchorPosition.South:
        return { x: abs.x + w / 2, y: abs.y + h, position };
      case AnchorPosition.East:
        return { x: abs.x + w, y: abs.y + h / 2, position };
      case AnchorPosition.West:
        return { x: abs.x, y: abs.y + h / 2, position };
      case AnchorPosition.NorthEast:
        return { x: abs.x + w, y: abs.y, position };
      case AnchorPosition.NorthWest:
        return { x: abs.x, y: abs.y, position };
      case AnchorPosition.SouthEast:
        return { x: abs.x + w, y: abs.y + h, position };
      case AnchorPosition.SouthWest:
        return { x: abs.x, y: abs.y + h, position };
      case AnchorPosition.Center:
        return { x: abs.x + w / 2, y: abs.y + h / 2, position };
      default:
        return { x: abs.x + w / 2, y: abs.y + h / 2, position: AnchorPosition.Center };
    }
  }

  // Trouve l'ancre la plus proche d'un point cible
  function getNearestAnchor(targetX: number, targetY: number): AnchorPoint {
    const allAnchors = anchors.value;
    if (allAnchors.length === 0) {
      return { x: 0, y: 0, position: AnchorPosition.Center };
    }

    let nearest = allAnchors[0];
    let minDist = Infinity;

    for (const anchor of allAnchors) {
      // Exclure le centre pour les connexions
      if (anchor.position === AnchorPosition.Center) continue;

      const dx = anchor.x - targetX;
      const dy = anchor.y - targetY;
      const dist = dx * dx + dy * dy;

      if (dist < minDist) {
        minDist = dist;
        nearest = anchor;
      }
    }

    return nearest;
  }

  // Calcule le point d'intersection avec le bord du rectangle
  // C'est la méthode clé pour que les flèches ne traversent pas les noeuds
  function getEdgeIntersection(targetX: number, targetY: number): AnchorPoint {
    const node = graphStore.nodes[options.nodeId.value];
    if (!node) return { x: 0, y: 0, position: AnchorPosition.Center };

    const abs = getNodeAbsolutePosition(options.nodeId.value, graphStore.nodes);
    const w = node.geometry.w;
    const h = node.geometry.h;

    // Centre du noeud
    const cx = abs.x + w / 2;
    const cy = abs.y + h / 2;

    // Vecteur du centre vers la cible
    const dx = targetX - cx;
    const dy = targetY - cy;

    // Si le point est au centre, retourner le centre
    if (dx === 0 && dy === 0) {
      return { x: cx, y: cy, position: AnchorPosition.Center };
    }

    // Calculer l'intersection avec le bord du rectangle
    // On utilise le ratio pour déterminer quel bord est touché

    // Calcul des ratios pour chaque direction
    const scaleX = Math.abs(dx) > 0 ? (w / 2) / Math.abs(dx) : Infinity;
    const scaleY = Math.abs(dy) > 0 ? (h / 2) / Math.abs(dy) : Infinity;

    // Prendre le plus petit ratio (premier bord touché)
    const scale = Math.min(scaleX, scaleY);

    // Point d'intersection
    const ix = cx + dx * scale;
    const iy = cy + dy * scale;

    // Déterminer la position d'ancrage
    let position: AnchorPosition;
    if (scaleX < scaleY) {
      // Intersection avec un bord vertical
      position = dx > 0 ? AnchorPosition.East : AnchorPosition.West;
    } else if (scaleY < scaleX) {
      // Intersection avec un bord horizontal
      position = dy > 0 ? AnchorPosition.South : AnchorPosition.North;
    } else {
      // Coin
      if (dx > 0 && dy > 0) position = AnchorPosition.SouthEast;
      else if (dx > 0 && dy < 0) position = AnchorPosition.NorthEast;
      else if (dx < 0 && dy > 0) position = AnchorPosition.SouthWest;
      else position = AnchorPosition.NorthWest;
    }

    return { x: ix, y: iy, position };
  }

  function setDefaultAnchor(position: AnchorPosition) {
    const node = graphStore.nodes[options.nodeId.value];
    if (!node) return;

    graphStore.updateNode(options.nodeId.value, {
      data: {
        ...node.data,
        defaultAnchor: position,
      },
    });
  }

  return {
    anchors,
    defaultAnchor: computed(() => defaultAnchor.value),
    getAnchorPoint,
    getNearestAnchor,
    getEdgeIntersection,
    setDefaultAnchor,
  };
}

// Helper pour calculer l'intersection depuis l'extérieur
export function calculateEdgeIntersection(
  nodeId: string,
  targetX: number,
  targetY: number,
  nodes: Record<string, Node>
): { x: number; y: number } {
  const node = nodes[nodeId];
  if (!node) return { x: 0, y: 0 };

  const abs = getNodeAbsolutePosition(nodeId, nodes);
  const w = node.geometry.w;
  const h = node.geometry.h;

  const cx = abs.x + w / 2;
  const cy = abs.y + h / 2;

  const dx = targetX - cx;
  const dy = targetY - cy;

  if (dx === 0 && dy === 0) {
    return { x: cx, y: cy };
  }

  const scaleX = Math.abs(dx) > 0 ? (w / 2) / Math.abs(dx) : Infinity;
  const scaleY = Math.abs(dy) > 0 ? (h / 2) / Math.abs(dy) : Infinity;
  const scale = Math.min(scaleX, scaleY);

  return {
    x: cx + dx * scale,
    y: cy + dy * scale,
  };
}

// Helper pour calculer le centre absolu d'un noeud
export function getNodeCenter(nodeId: string, nodes: Record<string, Node>): { x: number; y: number } {
  const node = nodes[nodeId];
  if (!node) return { x: 0, y: 0 };

  const abs = getNodeAbsolutePosition(nodeId, nodes);
  return {
    x: abs.x + node.geometry.w / 2,
    y: abs.y + node.geometry.h / 2,
  };
}
