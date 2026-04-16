// src/types/trait-utilities.ts

import type { Ref, ComputedRef } from 'vue';

/**
 * Type utilitaire pour une computed property réactive mutable.
 * Représente un computed avec getter et setter.
 */
export type MutableComputedRef<T> = ComputedRef<T> & {
  value: T;
};

/**
 * Type utilitaire pour les computed properties de traits.
 * Alias pour ComputedRef pour plus de clarté sémantique.
 */
export type TraitComputedProperty<T> = ComputedRef<T>;

/**
 * Type générique pour les options d'un trait.
 * La plupart des traits suivent ce pattern avec nodeId obligatoire.
 */
export interface BaseTraitOptions {
  /**
   * Référence réactive vers l'ID du nœud concerné.
   */
  nodeId: Ref<string>;
}

/**
 * Type générique pour les options d'un trait d'edge.
 * Similaire aux traits de nœuds mais pour les arêtes.
 */
export interface BaseEdgeTraitOptions {
  /**
   * Référence réactive vers l'ID de l'arête concernée.
   */
  edgeId: Ref<string>;
}

/**
 * Type utilitaire pour extraire les données d'un objet avec une propriété 'data'.
 * Utile pour typer node.data ou edge.data.
 */
export type ExtractDataType<T> = T extends { data: infer D } ? D : never;

/**
 * Type utilitaire pour les clés autorisées dans node.data.
 * Extensible via module augmentation si nécessaire.
 */
export type NodeDataKey = string;

/**
 * Type utilitaire pour les clés autorisées dans edge.data.
 */
export type EdgeDataKey = string;

/**
 * Type helper pour rendre certaines propriétés optionnelles.
 * Équivalent à Partial mais sémantiquement plus clair.
 */
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

/**
 * Type helper pour rendre certaines propriétés requises.
 */
export type Required<T, K extends keyof T> = Omit<T, K> & globalThis.Required<Pick<T, K>>;

/**
 * Type utilitaire pour les handlers d'événements communs dans les traits.
 */
export type TraitEventHandler<E = Event> = (event: E) => void;

/**
 * Type utilitaire pour les callbacks asynchrones des traits.
 */
export type TraitAsyncCallback<T = void> = () => Promise<T>;

/**
 * Type utilitaire pour les callbacks synchrones des traits.
 */
export type TraitCallback<T = void> = () => T;

/**
 * Type générique pour les propriétés de configuration d'un trait.
 * Permet de typer des configurations optionnelles.
 */
export type TraitConfig<T> = Partial<T> & {
  /**
   * Indique si le trait est activé.
   * @default true
   */
  enabled?: boolean;
};

/**
 * Type utilitaire pour extraire le type de retour d'un composable trait.
 * Utile pour typer les résultats de composition de traits.
 */
export type TraitReturn<
  State extends Record<string, any>,
  Handlers extends Record<string, any>
> = State & Handlers;

/**
 * Type guard générique pour vérifier si une valeur est définie (not null/undefined).
 */
export function isDefined<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined;
}

/**
 * Type guard pour vérifier si une valeur est une string non vide.
 */
export function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

/**
 * Type guard pour vérifier si une valeur est un nombre valide (not NaN).
 */
export function isValidNumber(value: unknown): value is number {
  return typeof value === 'number' && !isNaN(value) && isFinite(value);
}

/**
 * Type utilitaire pour les positions 2D.
 */
export interface Position2D {
  x: number;
  y: number;
}

/**
 * Type utilitaire pour les dimensions 2D.
 */
export interface Size2D {
  width: number;
  height: number;
}

/**
 * Type utilitaire pour les rectangles (position + dimensions).
 */
export interface Rectangle extends Position2D, Size2D {}

/**
 * Type utilitaire pour les bounding boxes.
 */
export interface BoundingBox {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
}

/**
 * Type utilitaire pour les couleurs RGB.
 */
export interface RGBColor {
  r: number; // 0-255
  g: number; // 0-255
  b: number; // 0-255
}

/**
 * Type utilitaire pour les couleurs RGBA.
 */
export interface RGBAColor extends RGBColor {
  a: number; // 0-1
}

/**
 * Type pour les couleurs (string hex ou RGB object).
 */
export type Color = string | RGBColor | RGBAColor;

/**
 * Type utilitaire pour les métadonnées génériques.
 * Utilisé pour node.data ou edge.data quand le contenu est flexible.
 */
export type Metadata = Record<string, unknown>;

/**
 * Type utilitaire pour les ID d'entités.
 */
export type EntityId = string;

/**
 * Type utilitaire pour les timestamps.
 */
export type Timestamp = number;

/**
 * Type utilitaire pour les fonctions de validation.
 */
export type ValidationFn<T> = (value: T) => boolean;

/**
 * Type utilitaire pour les fonctions de transformation.
 */
export type TransformFn<TInput, TOutput> = (input: TInput) => TOutput;

/**
 * Type utilitaire pour les predicates (fonctions de filtrage).
 */
export type PredicateFn<T> = (value: T) => boolean;

/**
 * Type utilitaire pour les fonctions de comparaison.
 */
export type CompareFn<T> = (a: T, b: T) => number;
