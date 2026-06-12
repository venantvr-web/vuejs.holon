// src/composables/traits/utils/trait-helpers.ts
import { computed, type Ref, type ComputedRef } from 'vue'
import { useGraphStore } from '../../../stores/graph'
import type { Node } from '../../../types'
import { NodeNotFoundError } from './errors'
import { getCachedAbsolutePosition } from './position-cache'

/**
 * Crée une computed property réactive pour accéder/modifier un champ de node.data.
 * Standardise le pattern getter/setter utilisé par tous les traits.
 *
 * @param nodeId - Référence réactive vers l'ID du noeud
 * @param dataKey - Clé dans node.data à accéder
 * @param defaultValue - Valeur par défaut si le champ n'existe pas
 * @returns ComputedRef réactive avec getter/setter
 *
 * @example
 * ```typescript
 * const isCollapsed = createTraitComputedProperty(
 *   nodeId,
 *   'collapsed',
 *   false
 * );
 *
 * // Lecture
 * console.log(isCollapsed.value); // false
 *
 * // Écriture (déclenche updateNode automatiquement)
 * isCollapsed.value = true;
 * ```
 */
export function createTraitComputedProperty<T>(
  nodeId: Ref<string>,
  dataKey: string,
  defaultValue: T
): ComputedRef<T> {
  const graphStore = useGraphStore()

  return computed({
    get: (): T => {
      const node = graphStore.nodes[nodeId.value]
      if (!node) return defaultValue
      return (node.data?.[dataKey] as T) ?? defaultValue
    },
    set: (value: T): void => {
      const node = graphStore.nodes[nodeId.value]
      if (!node) {
        throw new NodeNotFoundError(nodeId.value)
      }

      graphStore.updateNode(nodeId.value, {
        data: {
          ...node.data,
          [dataKey]: value,
        },
      })
    },
  })
}

/**
 * Crée une computed property réactive writable pour accéder/modifier
 * un objet imbriqué dans node.data avec fusion intelligente.
 *
 * @param nodeId - Référence réactive vers l'ID du noeud
 * @param dataKey - Clé dans node.data à accéder
 * @param defaultValue - Objet par défaut
 * @returns ComputedRef avec merge automatique lors du set
 *
 * @example
 * ```typescript
 * const lockState = createTraitObjectProperty(
 *   nodeId,
 *   'locked',
 *   { position: false, size: false }
 * );
 *
 * // Merge partiel
 * lockState.value = { position: true }; // size reste false
 * ```
 */
export function createTraitObjectProperty<T extends Record<string, any>>(
  nodeId: Ref<string>,
  dataKey: string,
  defaultValue: T
): ComputedRef<T> {
  const graphStore = useGraphStore()

  return computed({
    get: (): T => {
      const node = graphStore.nodes[nodeId.value]
      if (!node) return defaultValue
      return (node.data?.[dataKey] as T) ?? defaultValue
    },
    set: (value: Partial<T>): void => {
      const node = graphStore.nodes[nodeId.value]
      if (!node) {
        throw new NodeNotFoundError(nodeId.value)
      }

      const currentValue = (node.data?.[dataKey] as T) ?? defaultValue
      const mergedValue = { ...currentValue, ...value }

      graphStore.updateNode(nodeId.value, {
        data: {
          ...node.data,
          [dataKey]: mergedValue,
        },
      })
    },
  })
}

/**
 * Vérifie si un noeud existe dans le store.
 * Utilitaire simple pour éviter la répétition de vérifications.
 *
 * @param nodeId - ID du noeud à vérifier
 * @returns true si le noeud existe, false sinon
 */
export function nodeExists(nodeId: string): boolean {
  const graphStore = useGraphStore()
  return !!graphStore.nodes[nodeId]
}

/**
 * Récupère un noeud de manière sécurisée.
 * Lance une NodeNotFoundError si le noeud n'existe pas.
 *
 * @param nodeId - ID du noeud à récupérer
 * @returns Le noeud
 * @throws {NodeNotFoundError} Si le noeud n'existe pas
 */
export function getNodeOrThrow(nodeId: string): Node {
  const graphStore = useGraphStore()
  const node = graphStore.nodes[nodeId]

  if (!node) {
    throw new NodeNotFoundError(nodeId)
  }

  return node
}

/**
 * Calcule la position absolue d'un noeud en remontant la chaîne des parents.
 * Utilitaire partagé pour éviter duplication entre useAnchorable et useGeometry.
 *
 * Le résultat est mémoïsé par `position-cache` ; l'invalidation est pilotée
 * par le store dès qu'une mutation modifie la géométrie ou la topologie.
 *
 * @param nodeId - ID du noeud
 * @returns Position absolue { x, y } ou null si noeud inexistant
 */
export function getNodeAbsolutePosition(nodeId: string): { x: number; y: number } | null {
  const graphStore = useGraphStore()
  return getCachedAbsolutePosition(nodeId, graphStore.nodes as Record<string, Node>)
}

/**
 * Calcule le centre absolu d'un noeud.
 *
 * @param nodeId - ID du noeud
 * @returns Position du centre { x, y } ou null si noeud inexistant
 */
export function getNodeCenter(nodeId: string): { x: number; y: number } | null {
  const graphStore = useGraphStore()
  const node = graphStore.nodes[nodeId]

  if (!node) return null

  const absPos = getNodeAbsolutePosition(nodeId)
  if (!absPos) return null

  return {
    x: absPos.x + node.geometry.w / 2,
    y: absPos.y + node.geometry.h / 2,
  }
}

/**
 * Récupère tous les enfants directs d'un noeud.
 *
 * Délègue à `graphStore.getChildren` qui exploite l'index parent → enfants
 * (O(k) au lieu de O(n) en filtre brut).
 *
 * @param nodeId - ID du noeud parent
 * @returns Tableau des noeuds enfants
 */
export function getNodeChildren(nodeId: string): Node[] {
  const graphStore = useGraphStore()
  return graphStore.getChildren(nodeId)
}

/**
 * Récupère tous les descendants d'un noeud (récursif).
 *
 * @param nodeId - ID du noeud parent
 * @returns Tableau de tous les descendants
 */
export function getNodeDescendants(nodeId: string): Node[] {
  const descendants: Node[] = []
  const children = getNodeChildren(nodeId)

  for (const child of children) {
    descendants.push(child)
    descendants.push(...getNodeDescendants(child.id))
  }

  return descendants
}

/**
 * Vérifie si un noeud est ancêtre d'un autre noeud.
 *
 * @param ancestorId - ID du potentiel ancêtre
 * @param descendantId - ID du potentiel descendant
 * @returns true si ancestorId est ancêtre de descendantId
 */
export function isAncestorOf(ancestorId: string, descendantId: string): boolean {
  const graphStore = useGraphStore()
  let currentNode = graphStore.nodes[descendantId] as (typeof graphStore.nodes)[string] | undefined

  while (currentNode) {
    if (currentNode.parentId === ancestorId) return true
    currentNode = currentNode.parentId ? graphStore.nodes[currentNode.parentId] : undefined
  }

  return false
}

/**
 * Calcule la profondeur d'un noeud dans l'arbre (0 = racine).
 *
 * @param nodeId - ID du noeud
 * @returns Profondeur (nombre d'ancêtres) ou -1 si noeud inexistant
 */
export function getNodeDepth(nodeId: string): number {
  const graphStore = useGraphStore()
  const node = graphStore.nodes[nodeId]

  if (!node) return -1

  let depth = 0
  let currentParentId = node.parentId

  while (currentParentId) {
    depth++
    const parent = graphStore.nodes[currentParentId]
    if (!parent) break
    currentParentId = parent.parentId
  }

  return depth
}
