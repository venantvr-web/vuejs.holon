
// src/types/index.ts

// Export des types utilitaires
export * from './trait-utilities';

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
  /**
   * Données libres du noeud (métadonnées, configuration, état applicatif).
   *
   * Type `any` **justifié** : chaque trait peut stocker des données de types différents
   * (string, number, boolean, objects complexes) sans contrainte structurelle.
   *
   * Les traits individuels doivent valider les types lors de l'accès :
   * ```typescript
   * const name = node.data.name as string | undefined;
   * if (typeof name === 'string') { ... }
   * ```
   *
   * @example
   * // Exemples de données courantes
   * {
   *   name: 'Mon noeud',
   *   description: 'Description longue',
   *   archimateType: 'BusinessActor',
   *   locked: true,
   *   collapsed: false,
   *   defaultAnchor: AnchorPosition.Auto
   * }
   */
  data: Record<string, any>;
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
