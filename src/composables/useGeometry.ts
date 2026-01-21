
// src/composables/useGeometry.ts
import { useGraphStore } from '../stores/graph';
import type { Node } from '../types';

/**
 * Un hook composable pour toutes les opérations géométriques complexes.
 */
export function useGeometry() {
  const graphStore = useGraphStore();

  /**
   * Calcule les coordonnées absolues (World Space) d'un noeud en remontant l'arbre des parents.
   * C'est la fonction clé pour le rendu des arêtes.
   * @param nodeId - L'ID du noeud dont on veut les coordonnées absolues.
   * @returns Les coordonnées {x, y} absolues.
   */
  function getNodeAbsolutePosition(nodeId: string): { x: number; y: number } {
    let currentNode = graphStore.nodes[nodeId];
    if (!currentNode) return { x: 0, y: 0 };

    let absoluteX = currentNode.geometry.x;
    let absoluteY = currentNode.geometry.y;

    // Remonter la hiérarchie jusqu'à la racine (parentId === null)
    while (currentNode.parentId) {
      const parentNode = graphStore.nodes[currentNode.parentId];
      if (!parentNode) break; // Sécurité si le parent n'est pas trouvé

      absoluteX += parentNode.geometry.x;
      absoluteY += parentNode.geometry.y;

      currentNode = parentNode;
    }

    return { x: absoluteX, y: absoluteY };
  }

  /**
   * Convertit les coordonnées de l'écran (Screen Space) en coordonnées locales
   * à l'intérieur d'un groupe SVG, en tenant compte du zoom et du pan.
   *
   * @param screenX - Coordonnée X de la souris (e.g., event.clientX)
   * @param screenY - Coordonnée Y de la souris (e.g., event.clientY)
   * @param svgElement - L'élément <svg> racine du canvas.
   * @param targetParentId - L'ID du conteneur cible du drop (null si c'est la racine).
   * @returns Les coordonnées {x, y} relatives au parent cible.
   */
  function screenToLocalCoordinates(
    screenX: number,
    screenY: number,
    svgElement: SVGSVGElement,
    targetParentId: string | null
  ): { x: number; y: number } {
    if (!svgElement) return { x: 0, y: 0 };

    // 1. Obtenir la CTM (Current Transformation Matrix) du SVG
    const ctm = svgElement.getScreenCTM();
    if (!ctm) return { x: 0, y: 0 };

    // 2. Inverser la matrice pour passer de Screen Space à SVG Space
    const inverseCtm = ctm.inverse();

    // 3. Créer un point SVG et le transformer
    const pt = svgElement.createSVGPoint();
    pt.x = screenX;
    pt.y = screenY;
    const svgPoint = pt.matrixTransform(inverseCtm);

    // 4. Si la cible est la racine, on a terminé.
    if (targetParentId === null) {
      return { x: svgPoint.x, y: svgPoint.y };
    }

    // 5. Si la cible est un noeud imbriqué, soustraire sa position absolue.
    const parentAbsolutePos = getNodeAbsolutePosition(targetParentId);

    return {
      x: svgPoint.x - parentAbsolutePos.x,
      y: svgPoint.y - parentAbsolutePos.y,
    };
  }

  return {
    getNodeAbsolutePosition,
    screenToLocalCoordinates,
  };
}
