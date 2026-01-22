// src/composables/traits/useRoutable.ts
import { computed, type Ref } from 'vue';
import { useGraphStore } from '../../stores/graph';
import { calculateEdgeIntersection, getNodeCenter } from './useAnchorable';
import type { Node, Edge } from '../../types';

// Types de routage
export enum RoutingType {
  Straight = 'straight',
  Orthogonal = 'orthogonal',
  Curved = 'curved',
  Bezier = 'bezier',
}

// Point de contrôle pour les courbes
export interface ControlPoint {
  x: number;
  y: number;
}

export interface RoutePoint {
  x: number;
  y: number;
}

export interface EdgeRoute {
  sourcePoint: RoutePoint;
  targetPoint: RoutePoint;
  controlPoints: ControlPoint[];
  path: string; // SVG path
}

export interface RoutableOptions {
  edgeId: Ref<string>;
}

export interface RoutableState {
  routingType: Ref<RoutingType>;
  controlPoints: Ref<ControlPoint[]>;
  route: Ref<EdgeRoute | null>;
}

export interface RoutableHandlers {
  setRoutingType: (type: RoutingType) => void;
  addControlPoint: (point: ControlPoint, index?: number) => void;
  removeControlPoint: (index: number) => void;
  updateControlPoint: (index: number, point: ControlPoint) => void;
  clearControlPoints: () => void;
  calculateRoute: () => EdgeRoute | null;
}

// Calcul de position absolue d'un noeud
function getNodeAbsolutePosition(nodeId: string, nodes: Record<string, Node>): { x: number; y: number } {
  const node = nodes[nodeId];
  if (!node) return { x: 0, y: 0 };

  let x = node.geometry.x;
  let y = node.geometry.y;

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

export function useRoutable(options: RoutableOptions): RoutableState & RoutableHandlers {
  const graphStore = useGraphStore();

  const edge = computed(() => graphStore.edges[options.edgeId.value]);

  const routingType = computed((): RoutingType => {
    return (edge.value?.routing as RoutingType) ?? RoutingType.Straight;
  });

  const controlPoints = computed((): ControlPoint[] => {
    const e = edge.value;
    if (!e) return [];
    return (e as any).controlPoints ?? [];
  });

  // Calcule la route complète de l'edge
  const route = computed((): EdgeRoute | null => {
    return calculateRoute();
  });

  function calculateRoute(): EdgeRoute | null {
    const e = edge.value;
    if (!e) return null;

    const sourceNode = graphStore.nodes[e.sourceId];
    const targetNode = graphStore.nodes[e.targetId];
    if (!sourceNode || !targetNode) return null;

    // Centres des noeuds
    const sourceCenter = getNodeCenter(e.sourceId, graphStore.nodes);
    const targetCenter = getNodeCenter(e.targetId, graphStore.nodes);

    // Points d'intersection avec les bords
    const sourcePoint = calculateEdgeIntersection(e.sourceId, targetCenter.x, targetCenter.y, graphStore.nodes);
    const targetPoint = calculateEdgeIntersection(e.targetId, sourceCenter.x, sourceCenter.y, graphStore.nodes);

    const points = controlPoints.value;
    let path: string;

    switch (routingType.value) {
      case RoutingType.Straight:
        path = `M ${sourcePoint.x} ${sourcePoint.y} L ${targetPoint.x} ${targetPoint.y}`;
        break;

      case RoutingType.Orthogonal:
        path = calculateOrthogonalPath(sourcePoint, targetPoint, sourceNode, targetNode);
        break;

      case RoutingType.Curved:
        path = calculateCurvedPath(sourcePoint, targetPoint);
        break;

      case RoutingType.Bezier:
        path = calculateBezierPath(sourcePoint, targetPoint, points);
        break;

      default:
        path = `M ${sourcePoint.x} ${sourcePoint.y} L ${targetPoint.x} ${targetPoint.y}`;
    }

    return {
      sourcePoint,
      targetPoint,
      controlPoints: points,
      path,
    };
  }

  function calculateOrthogonalPath(
    source: RoutePoint,
    target: RoutePoint,
    sourceNode: Node,
    targetNode: Node
  ): string {
    const dx = target.x - source.x;
    const dy = target.y - source.y;

    // Déterminer le meilleur point de pivot
    const midX = source.x + dx / 2;
    const midY = source.y + dy / 2;

    // Si principalement horizontal
    if (Math.abs(dx) > Math.abs(dy)) {
      return `M ${source.x} ${source.y} H ${midX} V ${target.y} H ${target.x}`;
    }
    // Si principalement vertical
    return `M ${source.x} ${source.y} V ${midY} H ${target.x} V ${target.y}`;
  }

  function calculateCurvedPath(source: RoutePoint, target: RoutePoint): string {
    const dx = target.x - source.x;
    const dy = target.y - source.y;

    // Point de contrôle pour une courbe quadratique simple
    const cx = source.x + dx / 2;
    const cy = source.y + dy / 2 - Math.min(Math.abs(dx), Math.abs(dy)) / 4;

    return `M ${source.x} ${source.y} Q ${cx} ${cy} ${target.x} ${target.y}`;
  }

  function calculateBezierPath(
    source: RoutePoint,
    target: RoutePoint,
    points: ControlPoint[]
  ): string {
    if (points.length === 0) {
      // Par défaut, courbe de Bézier cubique
      const dx = target.x - source.x;
      const dy = target.y - source.y;

      const cp1x = source.x + dx * 0.3;
      const cp1y = source.y;
      const cp2x = target.x - dx * 0.3;
      const cp2y = target.y;

      return `M ${source.x} ${source.y} C ${cp1x} ${cp1y} ${cp2x} ${cp2y} ${target.x} ${target.y}`;
    }

    if (points.length === 1) {
      // Courbe quadratique avec un point de contrôle
      return `M ${source.x} ${source.y} Q ${points[0].x} ${points[0].y} ${target.x} ${target.y}`;
    }

    if (points.length === 2) {
      // Courbe cubique avec deux points de contrôle
      return `M ${source.x} ${source.y} C ${points[0].x} ${points[0].y} ${points[1].x} ${points[1].y} ${target.x} ${target.y}`;
    }

    // Plus de points: série de courbes
    let path = `M ${source.x} ${source.y}`;
    path += ` Q ${points[0].x} ${points[0].y}`;

    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1];
      const curr = points[i];
      const midX = (prev.x + curr.x) / 2;
      const midY = (prev.y + curr.y) / 2;
      path += ` ${midX} ${midY} T`;
    }

    path += ` ${target.x} ${target.y}`;
    return path;
  }

  function setRoutingType(type: RoutingType) {
    if (!edge.value) return;
    // Note: il faut ajouter le support dans le store pour mettre à jour l'edge
    // Pour l'instant, on stocke dans data
  }

  function addControlPoint(point: ControlPoint, index?: number) {
    const currentPoints = [...controlPoints.value];
    if (index !== undefined) {
      currentPoints.splice(index, 0, point);
    } else {
      currentPoints.push(point);
    }
    updateEdgeControlPoints(currentPoints);
  }

  function removeControlPoint(index: number) {
    const currentPoints = [...controlPoints.value];
    currentPoints.splice(index, 1);
    updateEdgeControlPoints(currentPoints);
  }

  function updateControlPoint(index: number, point: ControlPoint) {
    const currentPoints = [...controlPoints.value];
    currentPoints[index] = point;
    updateEdgeControlPoints(currentPoints);
  }

  function clearControlPoints() {
    updateEdgeControlPoints([]);
  }

  function updateEdgeControlPoints(points: ControlPoint[]) {
    // TODO: Ajouter une méthode updateEdge dans le store
    // Pour l'instant, rien à faire car les edges n'ont pas de champ controlPoints
  }

  return {
    routingType: computed(() => routingType.value),
    controlPoints,
    route,
    setRoutingType,
    addControlPoint,
    removeControlPoint,
    updateControlPoint,
    clearControlPoints,
    calculateRoute,
  };
}

// Fonction utilitaire pour calculer la route d'un edge directement
export function calculateEdgeRoute(
  edge: Edge,
  nodes: Record<string, Node>,
  routingType: RoutingType = RoutingType.Straight
): EdgeRoute | null {
  const sourceNode = nodes[edge.sourceId];
  const targetNode = nodes[edge.targetId];
  if (!sourceNode || !targetNode) return null;

  const sourceCenter = getNodeCenter(edge.sourceId, nodes);
  const targetCenter = getNodeCenter(edge.targetId, nodes);

  const sourcePoint = calculateEdgeIntersection(edge.sourceId, targetCenter.x, targetCenter.y, nodes);
  const targetPoint = calculateEdgeIntersection(edge.targetId, sourceCenter.x, sourceCenter.y, nodes);

  let path: string;

  switch (routingType) {
    case RoutingType.Straight:
      path = `M ${sourcePoint.x} ${sourcePoint.y} L ${targetPoint.x} ${targetPoint.y}`;
      break;

    case RoutingType.Orthogonal: {
      const dx = targetPoint.x - sourcePoint.x;
      const dy = targetPoint.y - sourcePoint.y;
      const midX = sourcePoint.x + dx / 2;
      const midY = sourcePoint.y + dy / 2;

      if (Math.abs(dx) > Math.abs(dy)) {
        path = `M ${sourcePoint.x} ${sourcePoint.y} H ${midX} V ${targetPoint.y} H ${targetPoint.x}`;
      } else {
        path = `M ${sourcePoint.x} ${sourcePoint.y} V ${midY} H ${targetPoint.x} V ${targetPoint.y}`;
      }
      break;
    }

    case RoutingType.Curved: {
      const dx = targetPoint.x - sourcePoint.x;
      const dy = targetPoint.y - sourcePoint.y;
      const cx = sourcePoint.x + dx / 2;
      const cy = sourcePoint.y + dy / 2 - Math.min(Math.abs(dx), Math.abs(dy)) / 4;
      path = `M ${sourcePoint.x} ${sourcePoint.y} Q ${cx} ${cy} ${targetPoint.x} ${targetPoint.y}`;
      break;
    }

    case RoutingType.Bezier: {
      const dx = targetPoint.x - sourcePoint.x;
      const cp1x = sourcePoint.x + dx * 0.3;
      const cp1y = sourcePoint.y;
      const cp2x = targetPoint.x - dx * 0.3;
      const cp2y = targetPoint.y;
      path = `M ${sourcePoint.x} ${sourcePoint.y} C ${cp1x} ${cp1y} ${cp2x} ${cp2y} ${targetPoint.x} ${targetPoint.y}`;
      break;
    }

    default:
      path = `M ${sourcePoint.x} ${sourcePoint.y} L ${targetPoint.x} ${targetPoint.y}`;
  }

  return {
    sourcePoint,
    targetPoint,
    controlPoints: [],
    path,
  };
}

// Calcule l'angle de la flèche au point cible
export function calculateArrowAngle(
  sourceX: number,
  sourceY: number,
  targetX: number,
  targetY: number
): number {
  return Math.atan2(targetY - sourceY, targetX - sourceX) * (180 / Math.PI);
}

// Génère le path SVG pour une flèche
export function generateArrowPath(
  x: number,
  y: number,
  angle: number,
  size: number = 10
): string {
  const rad = (angle * Math.PI) / 180;
  const x1 = x - size * Math.cos(rad - Math.PI / 6);
  const y1 = y - size * Math.sin(rad - Math.PI / 6);
  const x2 = x - size * Math.cos(rad + Math.PI / 6);
  const y2 = y - size * Math.sin(rad + Math.PI / 6);

  return `M ${x} ${y} L ${x1} ${y1} M ${x} ${y} L ${x2} ${y2}`;
}
