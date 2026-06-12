// src/stores/graph.ts
import { defineStore } from 'pinia'
import { ref, readonly, computed } from 'vue'
import { db } from '../db'
import type { Node, Edge } from '../types'
import { nanoid } from 'nanoid'
import {
  invalidatePositionCache,
  clearPositionCache,
} from '../composables/traits/utils/position-cache'
import { playSound } from '../composables/useSound'

/**
 * Indique si un patch `Partial<Node>` modifie la position absolue d'un noeud
 * (ou de ses descendants). Tant que ce n'est pas le cas, on n'invalide pas
 * le cache des positions.
 */
function patchAffectsAbsolutePosition(patch: Partial<Node>): boolean {
  if ('parentId' in patch) return true
  if (patch.geometry) {
    const g = patch.geometry
    if ('x' in g || 'y' in g) return true
  }
  return false
}

/**
 * Copie profonde « déproxifiée » pour l'écriture IndexedDB.
 *
 * Les valeurs lues depuis l'état réactif contiennent des proxys Vue imbriqués
 * (ex. un tableau `tags` dans node.data) ; le structured clone d'IndexedDB ne
 * sait pas cloner un Proxy et levait DataCloneError dès qu'on persistait un
 * noeud porteur de données non primitives (repli d'un conteneur taggé, etc.).
 */
function toPlain<T>(value: T): T {
  return JSON.parse(JSON.stringify(value))
}

/**
 * Clé interne utilisée dans `childrenIndex` pour grouper les noeuds racines
 * (ceux dont `parentId === null`). Évite d'avoir à gérer `null` comme clé.
 */
const ROOT_KEY = '__root__'

export const useGraphStore = defineStore('graph', () => {
  // --- STATE ---
  const nodes = ref<Record<string, Node>>({})
  const edges = ref<Record<string, Edge>>({})

  /**
   * Index inverse parent → enfants. Maintenu incrémentalement par les actions
   * de mutation pour éviter un filtre O(n) à chaque rendu de `NodeRenderer`.
   * L'ordre dans chaque liste est l'ordre d'insertion ; le tri par z-index
   * reste la responsabilité du composant qui rend.
   */
  const childrenIndex = ref<Record<string, string[]>>({ [ROOT_KEY]: [] })

  /**
   * Compteur monotonique incrémenté à chaque mutation du graphe (noeud ou
   * arête). Les consommateurs comme `useAutoSnapshot` peuvent watcher cette
   * seule référence au lieu de poser un `deep: true` sur l'ensemble du store,
   * ce qui rendait O(n) chaque mutation pour un coût négligeable de gain
   * d'information.
   */
  const mutationVersion = ref(0)
  function bump(): void {
    mutationVersion.value++
  }

  function indexAdd(nodeId: string, parentId: string | null): void {
    const key = parentId ?? ROOT_KEY
    let bucket = childrenIndex.value[key]
    if (!bucket) {
      bucket = []
      childrenIndex.value[key] = bucket
    }
    if (!bucket.includes(nodeId)) bucket.push(nodeId)
  }

  function indexRemove(nodeId: string, parentId: string | null): void {
    const key = parentId ?? ROOT_KEY
    const bucket = childrenIndex.value[key]
    if (!bucket) return
    const i = bucket.indexOf(nodeId)
    if (i >= 0) bucket.splice(i, 1)
  }

  function rebuildIndex(): void {
    const idx: Record<string, string[]> = { [ROOT_KEY]: [] }
    for (const node of Object.values(nodes.value)) {
      const key = node.parentId ?? ROOT_KEY
      if (!idx[key]) idx[key] = []
      idx[key].push(node.id)
    }
    childrenIndex.value = idx
  }

  // --- GETTERS ---
  const rootNodes = computed(() => {
    const ids = childrenIndex.value[ROOT_KEY] ?? []
    return ids.map((id) => nodes.value[id]).filter((n): n is Node => !!n)
  })

  /**
   * Renvoie les enfants directs d'un parent en O(k), k = nombre d'enfants.
   *
   * @param parentId - ID du parent (string pour un container, ou `null` pour
   *   la racine ; les deux signatures sont acceptées)
   */
  const getChildren = (parentId: string | null) => {
    const key = parentId ?? ROOT_KEY
    const ids = childrenIndex.value[key] ?? []
    return ids.map((id) => nodes.value[id]).filter((n): n is Node => !!n)
  }

  // --- ACTIONS ---

  /**
   * Charge tous les noeuds et arêtes depuis IndexedDB.
   */
  async function loadFromDB() {
    const allNodes = await db.nodes.toArray()
    const allEdges = await db.edges.toArray()

    nodes.value = allNodes.reduce(
      (acc, node) => {
        acc[node.id] = node
        return acc
      },
      {} as Record<string, Node>
    )

    edges.value = allEdges.reduce(
      (acc, edge) => {
        acc[edge.id] = edge
        return acc
      },
      {} as Record<string, Edge>
    )
    // Rechargement complet : on repart d'un cache et d'un index propres.
    clearPositionCache()
    rebuildIndex()
  }

  /**
   * Crée un nouveau noeud et le sauvegarde en base.
   */
  async function createNode(partialNode: Omit<Node, 'id' | 'parentId'>, parentId: string | null) {
    const id = nanoid()
    const newNode: Node = {
      ...partialNode,
      id,
      parentId,
    }
    nodes.value[id] = newNode
    indexAdd(id, parentId)
    invalidatePositionCache()
    bump()
    playSound('create')
    await db.nodes.put(toPlain(newNode))
    return newNode
  }

  /**
   * Met à jour un noeud existant.
   */
  async function updateNode(id: string, updates: Partial<Node>) {
    const previous = nodes.value[id]
    if (!previous) return
    const updatedNode = { ...previous, ...updates }
    nodes.value[id] = updatedNode
    if ('parentId' in updates && previous.parentId !== updatedNode.parentId) {
      indexRemove(id, previous.parentId)
      indexAdd(id, updatedNode.parentId)
    }
    if (patchAffectsAbsolutePosition(updates)) {
      invalidatePositionCache()
    }
    bump()
    await db.nodes.update(id, toPlain(updates))
  }

  /**
   * Met à jour plusieurs noeuds dans une *unique* transaction IndexedDB.
   *
   * Utilisé par le drag multi-sélection : déplacer N noeuds émettait jusqu'ici
   * N `db.nodes.update` indépendants par frame. En les regroupant dans
   * `db.transaction`, on garantit l'atomicité (pas de demi-déplacement
   * persisté en cas de crash) et on réduit l'overhead transactionnel.
   *
   * L'état en mémoire est appliqué synchroniquement comme dans `updateNode`,
   * seul le commit DB est groupé.
   */
  async function batchedUpdateNodes(
    patches: Array<{ id: string; updates: Partial<Node> }>
  ): Promise<void> {
    if (patches.length === 0) return

    let positionAffected = false
    const dbOps: Array<{ id: string; updates: Partial<Node> }> = []

    for (const { id, updates } of patches) {
      const previous = nodes.value[id]
      if (!previous) continue
      const updatedNode = { ...previous, ...updates }
      nodes.value[id] = updatedNode
      if ('parentId' in updates && previous.parentId !== updatedNode.parentId) {
        indexRemove(id, previous.parentId)
        indexAdd(id, updatedNode.parentId)
      }
      if (patchAffectsAbsolutePosition(updates)) {
        positionAffected = true
      }
      dbOps.push({ id, updates })
    }

    if (positionAffected) invalidatePositionCache()
    if (dbOps.length > 0) bump()

    await db.transaction('rw', db.nodes, async () => {
      for (const { id, updates } of dbOps) {
        await db.nodes.update(id, toPlain(updates))
      }
    })
  }

  /**
   * Supprime un noeud et tous ses enfants récursivement.
   */
  async function deleteNode(id: string) {
    // Récupérer tous les enfants récursivement via l'index (O(k) par niveau).
    const toDelete: string[] = [id]
    const collectChildren = (parentId: string) => {
      const childIds = childrenIndex.value[parentId] ?? []
      for (const childId of childIds) {
        toDelete.push(childId)
        collectChildren(childId)
      }
    }
    collectChildren(id)

    // Indexer les noeuds à supprimer pour un test d'appartenance en O(1).
    const toDeleteSet = new Set(toDelete)

    // Supprimer les arêtes connectées
    const edgesToDelete = Object.values(edges.value)
      .filter((e) => toDeleteSet.has(e.sourceId) || toDeleteSet.has(e.targetId))
      .map((e) => e.id)

    for (const edgeId of edgesToDelete) {
      delete edges.value[edgeId]
      await db.edges.delete(edgeId)
    }

    // Supprimer les noeuds et tenir l'index à jour.
    for (const nodeId of toDelete) {
      const node = nodes.value[nodeId]
      if (node) indexRemove(nodeId, node.parentId)
      delete childrenIndex.value[nodeId]
      delete nodes.value[nodeId]
      await db.nodes.delete(nodeId)
    }
    invalidatePositionCache()
    if (toDelete.length > 0 || edgesToDelete.length > 0) {
      bump()
      playSound('delete')
    }
  }

  /**
   * Crée une nouvelle arête entre deux noeuds.
   */
  async function createEdge(
    sourceId: string,
    targetId: string,
    routing: 'straight' | 'orthogonal' = 'straight'
  ) {
    // Vérifier que les noeuds existent
    if (!nodes.value[sourceId] || !nodes.value[targetId]) return null

    // Vérifier qu'une arête identique (même sens) n'existe pas déjà.
    // Le sens compte : A→B et B→A sont deux relations distinctes en Archimate.
    const exists = Object.values(edges.value).some(
      (e) => e.sourceId === sourceId && e.targetId === targetId
    )
    if (exists) return null

    const id = nanoid()
    const newEdge: Edge = { id, sourceId, targetId, routing }
    edges.value[id] = newEdge
    bump()
    playSound('connect')
    await db.edges.put(toPlain(newEdge))
    return newEdge
  }

  /**
   * Met à jour une arête existante.
   */
  async function updateEdge(id: string, updates: Partial<Edge>) {
    if (edges.value[id]) {
      const updatedEdge = { ...edges.value[id], ...updates }
      edges.value[id] = updatedEdge
      bump()
      await db.edges.update(id, toPlain(updates))
    }
  }

  /**
   * Supprime une arête.
   */
  async function deleteEdge(id: string) {
    if (edges.value[id]) {
      delete edges.value[id]
      bump()
      await db.edges.delete(id)
    }
  }

  /**
   * Déplace un noeud vers un nouveau parent.
   */
  async function reparentNode(nodeId: string, newParentId: string | null) {
    const node = nodes.value[nodeId]
    if (!node) return
    const oldParentId = node.parentId
    if (oldParentId === newParentId) return
    node.parentId = newParentId
    indexRemove(nodeId, oldParentId)
    indexAdd(nodeId, newParentId)
    invalidatePositionCache()
    bump()
    await db.nodes.update(nodeId, { parentId: newParentId })
  }

  /**
   * Efface tout le graphe.
   */
  async function clearAll() {
    nodes.value = {}
    edges.value = {}
    childrenIndex.value = { [ROOT_KEY]: [] }
    clearPositionCache()
    bump()
    await db.nodes.clear()
    await db.edges.clear()
  }

  /**
   * Insère un noeud complet (ID inclus) dans le graphe.
   * Utilisé pour la restauration d'undo et le collage qui doivent préserver
   * les identifiants afin de maintenir la cohérence des arêtes et des parents.
   */
  async function importNode(node: Node) {
    const existing = nodes.value[node.id]
    if (existing && existing.parentId !== node.parentId) {
      indexRemove(node.id, existing.parentId)
      indexAdd(node.id, node.parentId)
    } else if (!existing) {
      indexAdd(node.id, node.parentId)
    }
    nodes.value[node.id] = { ...node }
    invalidatePositionCache()
    bump()
    await db.nodes.put(toPlain(node))
  }

  /**
   * Insère une arête complète (ID inclus) dans le graphe.
   */
  async function importEdge(edge: Edge) {
    edges.value[edge.id] = { ...edge }
    bump()
    await db.edges.put(toPlain(edge))
  }

  /**
   * Remplace atomiquement tout le contenu du graphe par un snapshot.
   * Utilisé par l'undo/redo pour restaurer un état antérieur sans passer
   * par des créations/suppressions individuelles.
   */
  async function replaceAll(newNodes: Record<string, Node>, newEdges: Record<string, Edge>) {
    nodes.value = { ...newNodes }
    edges.value = { ...newEdges }
    rebuildIndex()
    clearPositionCache()
    bump()
    await db.transaction('rw', db.nodes, db.edges, async () => {
      await db.nodes.clear()
      await db.edges.clear()
      await db.nodes.bulkPut(Object.values(newNodes).map(toPlain))
      await db.edges.bulkPut(Object.values(newEdges).map(toPlain))
    })
  }

  return {
    // State
    nodes: readonly(nodes),
    edges: readonly(edges),
    mutationVersion: readonly(mutationVersion),

    // Getters
    rootNodes,
    getChildren,

    // Actions
    loadFromDB,
    createNode,
    updateNode,
    batchedUpdateNodes,
    deleteNode,
    createEdge,
    updateEdge,
    deleteEdge,
    reparentNode,
    clearAll,
    importNode,
    importEdge,
    replaceAll,
  }
})
