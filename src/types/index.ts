
// src/types/index.ts

/**
 * La géométrie d'un noeud, relative à son parent.
 */
export interface Geometry {
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * Le style visuel d'un noeud.
 * Utilise des propriétés compatibles avec SVG.
 */
export interface Styling {
  fill: string;
  stroke: string;
  strokeWidth: number;
  opacity: number;
}

/**
 * Le noeud est l'élément de base de notre graphe.
 * Il peut être un conteneur ou une forme simple.
 */
export interface Node {
  id: string;
  parentId: string | null; // null pour les noeuds à la racine du canvas
  type: 'container' | 'shape';
  geometry: Geometry;
  styling: Styling;
  data: Record<string, any>; // Contenu libre (texte, métadonnées...)
}

/**
 * Type de routage pour les liens.
 */
export type EdgeRouting = 'straight' | 'orthogonal';

/**
 * Un lien (arête) entre deux noeuds, identifiés par leur ID.
 * Les liens existent indépendamment de la hiérarchie des noeuds.
 */
export interface Edge {
  id: string;
  sourceId: string;
  targetId: string;
  routing: EdgeRouting;
}
