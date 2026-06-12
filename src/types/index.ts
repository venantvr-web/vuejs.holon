// src/types/index.ts

// Export des types utilitaires
export * from './trait-utilities'

/**
 * La géométrie d'un noeud, relative à son parent.
 */
export interface Geometry {
  x: number
  y: number
  w: number
  h: number
}

/**
 * Le style visuel d'un noeud.
 * Utilise des propriétés compatibles avec SVG.
 */
export interface Styling {
  fill: string
  stroke: string
  strokeWidth: number
  opacity: number
}

/**
 * Le noeud est l'élément de base de notre graphe.
 * Il peut être un conteneur ou une forme simple.
 */
export interface Node {
  id: string
  parentId: string | null // null pour les noeuds à la racine du canvas
  type: 'container' | 'shape'
  geometry: Geometry
  styling: Styling
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
  data: Record<string, any>
}

/**
 * Type de routage pour les liens.
 */
export type EdgeRouting = 'straight' | 'orthogonal' | 'curved' | 'bezier'

/**
 * Types de flèches pour les marqueurs d'edges.
 */
export type ArrowType =
  | 'none'
  | 'dot'
  | 'small-dot'
  | 'arrow'
  | 'filled-arrow'
  | 'diamond'
  | 'filled-diamond'
  | 'circle'
  | 'filled-circle'
  | 'square'
  | 'filled-square'
  | 'archi-composition'
  | 'archi-aggregation'
  | 'archi-assignment'
  | 'archi-realization'
  | 'archi-serving'
  | 'archi-access'
  | 'archi-influence'
  | 'archi-trigger'
  | 'archi-flow'

/**
 * Élément de la bibliothèque de blocs réutilisables.
 * Sert de modèle pour instancier de nouveaux noeuds sur le canevas.
 */
export interface LibraryItem {
  id: string
  name: string
  isBuiltIn: boolean
  createdAt: number
  template: Omit<Node, 'id' | 'parentId'>
}

/**
 * Un lien (arête) entre deux noeuds, identifiés par leur ID.
 * Les liens existent indépendamment de la hiérarchie des noeuds.
 */
export interface Edge {
  id: string
  sourceId: string
  targetId: string
  routing: EdgeRouting
  /**
   * Type de flèche au départ de l'edge (optionnel, défaut: 'dot').
   */
  startArrow?: ArrowType
  /**
   * Type de flèche à l'arrivée de l'edge (optionnel, défaut: 'arrow').
   */
  endArrow?: ArrowType
  /**
   * Taille des marqueurs de flèche (optionnel, défaut: 10).
   */
  arrowSize?: number
  /**
   * Données libres de l'arête : nom affiché, commentaire, type de relation,
   * labels avancés, métadonnées applicatives.
   *
   * Champs usuels : `name` (string), `comment` (string), `relationType` (RelationType),
   * `labels` (EdgeLabel[]).
   */
  data?: Record<string, any>
}
