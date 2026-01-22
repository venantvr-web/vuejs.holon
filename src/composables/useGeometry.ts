// src/composables/useGeometry.ts
import { useGraphStore } from '../stores/graph';

/**
 * Un hook composable pour toutes les opérations géométriques complexes.
 */
export function useGeometry() {
  const graphStore = useGraphStore();

  /**
   * Calcule les coordonnées absolues (World Space) d'un noeud en remontant l'arbre des parents.
   */
  function getNodeAbsolutePosition(nodeId: string): { x: number; y: number } {
    let currentNode = graphStore.nodes[nodeId];
    if (!currentNode) return { x: 0, y: 0 };

    let absoluteX = currentNode.geometry.x;
    let absoluteY = currentNode.geometry.y;

    while (currentNode.parentId) {
      const parentNode = graphStore.nodes[currentNode.parentId];
      if (!parentNode) break;

      absoluteX += parentNode.geometry.x;
      absoluteY += parentNode.geometry.y;

      currentNode = parentNode;
    }

    return { x: absoluteX, y: absoluteY };
  }

  /**
   * Convertit les coordonnées de l'écran en coordonnées locales SVG.
   */
  function screenToLocalCoordinates(
    screenX: number,
    screenY: number,
    svgElement: SVGSVGElement,
    targetParentId: string | null
  ): { x: number; y: number } {
    if (!svgElement) return { x: 0, y: 0 };

    const ctm = svgElement.getScreenCTM();
    if (!ctm) return { x: 0, y: 0 };

    const inverseCtm = ctm.inverse();
    const pt = svgElement.createSVGPoint();
    pt.x = screenX;
    pt.y = screenY;
    const svgPoint = pt.matrixTransform(inverseCtm);

    if (targetParentId === null) {
      return { x: svgPoint.x, y: svgPoint.y };
    }

    const parentAbsolutePos = getNodeAbsolutePosition(targetParentId);
    return {
      x: svgPoint.x - parentAbsolutePos.x,
      y: svgPoint.y - parentAbsolutePos.y,
    };
  }

  /**
   * Vérifie si un point (en coordonnées absolues) est à l'intérieur d'un noeud.
   */
  function isPointInsideNode(nodeId: string, absX: number, absY: number): boolean {
    const node = graphStore.nodes[nodeId];
    if (!node) return false;

    const nodePos = getNodeAbsolutePosition(nodeId);
    return (
      absX >= nodePos.x &&
      absX <= nodePos.x + node.geometry.w &&
      absY >= nodePos.y &&
      absY <= nodePos.y + node.geometry.h
    );
  }

  /**
   * Vérifie si un noeud est un descendant d'un autre (pour éviter les cycles).
   */
  function isDescendantOf(nodeId: string, potentialAncestorId: string): boolean {
    let current = graphStore.nodes[nodeId];
    while (current && current.parentId) {
      if (current.parentId === potentialAncestorId) return true;
      current = graphStore.nodes[current.parentId];
    }
    return false;
  }

  /**
   * Trouve le container le plus profond sous un point donné (coordonnées absolues).
   * Exclut le noeud spécifié et ses descendants.
   */
  function findContainerAtPoint(
    absX: number,
    absY: number,
    excludeNodeId: string | null = null
  ): string | null {
    const containers = Object.values(graphStore.nodes).filter(
      n => n.type === 'container' && n.id !== excludeNodeId
    );

    // Trier par profondeur (les plus profonds d'abord)
    const sortedByDepth = containers
      .map(node => ({
        node,
        depth: getNodeDepth(node.id),
      }))
      .sort((a, b) => b.depth - a.depth);

    for (const { node } of sortedByDepth) {
      // Ne pas permettre de dropper dans un descendant
      if (excludeNodeId && isDescendantOf(node.id, excludeNodeId)) continue;

      if (isPointInsideNode(node.id, absX, absY)) {
        return node.id;
      }
    }

    return null;
  }

  /**
   * Calcule la profondeur d'un noeud dans la hiérarchie.
   */
  function getNodeDepth(nodeId: string): number {
    let depth = 0;
    let current = graphStore.nodes[nodeId];
    while (current && current.parentId) {
      depth++;
      current = graphStore.nodes[current.parentId];
    }
    return depth;
  }

  /**
   * Convertit les coordonnées d'un noeud d'un parent à un autre.
   */
  function convertCoordinates(
    nodeId: string,
    fromParentId: string | null,
    toParentId: string | null
  ): { x: number; y: number } {
    const node = graphStore.nodes[nodeId];
    if (!node) return { x: 0, y: 0 };

    // Position absolue actuelle du noeud
    const absolutePos = getNodeAbsolutePosition(nodeId);

    // Si le nouveau parent est null (racine), retourner la position absolue
    if (toParentId === null) {
      return { x: absolutePos.x, y: absolutePos.y };
    }

    // Sinon, soustraire la position absolue du nouveau parent
    const newParentPos = getNodeAbsolutePosition(toParentId);
    return {
      x: absolutePos.x - newParentPos.x,
      y: absolutePos.y - newParentPos.y,
    };
  }

  return {
    getNodeAbsolutePosition,
    screenToLocalCoordinates,
    isPointInsideNode,
    isDescendantOf,
    findContainerAtPoint,
    getNodeDepth,
    convertCoordinates,
  };
}
