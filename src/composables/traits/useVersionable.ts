// src/composables/traits/useVersionable.ts
import { ref, type Ref } from 'vue'
import { useGraphStore } from '../../stores/graph'
import type { Node, Edge } from '../../types'
import { nanoid } from 'nanoid'

/**
 * Snapshot de version du graphe.
 */
export interface GraphSnapshot {
  /**
   * ID unique du snapshot.
   */
  id: string
  /**
   * Nom de la version.
   */
  name: string
  /**
   * Description / notes.
   */
  description?: string
  /**
   * Tag de version (ex: v1.0.0).
   */
  tag?: string
  /**
   * État complet du graphe.
   */
  state: {
    nodes: Record<string, Node>
    edges: Record<string, Edge>
  }
  /**
   * Métadonnées.
   */
  metadata: {
    createdAt: number
    createdBy?: string
    branchName?: string
  }
  /**
   * ID du snapshot parent (pour historique).
   */
  parentId?: string
}

/**
 * Type de changement dans un diff.
 */
export type ChangeType = 'added' | 'modified' | 'deleted' | 'unchanged'

/**
 * Changement d'un noeud.
 */
export interface NodeChange {
  /**
   * Type de changement.
   */
  type: ChangeType
  /**
   * ID du noeud.
   */
  nodeId: string
  /**
   * État avant (si modified ou deleted).
   */
  before?: Node
  /**
   * État après (si added ou modified).
   */
  after?: Node
  /**
   * Propriétés modifiées (si modified).
   */
  changedProperties?: string[]
}

/**
 * Changement d'une arête.
 */
export interface EdgeChange {
  /**
   * Type de changement.
   */
  type: ChangeType
  /**
   * ID de l'arête.
   */
  edgeId: string
  /**
   * État avant.
   */
  before?: Edge
  /**
   * État après.
   */
  after?: Edge
}

/**
 * Différence entre deux snapshots.
 */
export interface GraphDiff {
  /**
   * ID du snapshot source.
   */
  fromSnapshotId: string
  /**
   * ID du snapshot cible.
   */
  toSnapshotId: string
  /**
   * Changements de noeuds.
   */
  nodeChanges: NodeChange[]
  /**
   * Changements d'arêtes.
   */
  edgeChanges: EdgeChange[]
  /**
   * Statistiques.
   */
  stats: {
    nodesAdded: number
    nodesModified: number
    nodesDeleted: number
    edgesAdded: number
    edgesModified: number
    edgesDeleted: number
  }
  /**
   * Timestamp de génération du diff.
   */
  timestamp: number
}

/**
 * Branche de version.
 */
export interface VersionBranch {
  /**
   * Nom de la branche.
   */
  name: string
  /**
   * ID du snapshot actuel.
   */
  currentSnapshotId: string
  /**
   * Description.
   */
  description?: string
  /**
   * Date de création.
   */
  createdAt: number
}

/**
 * État réactif exposé par le trait Versionable.
 */
export interface VersionableState {
  /**
   * Snapshots sauvegardés.
   */
  snapshots: Ref<GraphSnapshot[]>
  /**
   * Snapshot actuel.
   */
  currentSnapshot: Ref<GraphSnapshot | null>
  /**
   * Branches disponibles.
   */
  branches: Ref<VersionBranch[]>
  /**
   * Branche active.
   */
  currentBranch: Ref<string>
  /**
   * Diff actif (comparaison en cours).
   */
  activeDiff: Ref<GraphDiff | null>
}

/**
 * Handlers (actions) exposés par le trait Versionable.
 */
export interface VersionableHandlers {
  /**
   * Crée un snapshot du graphe actuel.
   * @param name - Nom du snapshot
   * @param description - Description optionnelle
   * @param tag - Tag de version optionnel
   * @returns Snapshot créé
   */
  createSnapshot: (name: string, description?: string, tag?: string) => GraphSnapshot
  /**
   * Restaure un snapshot.
   * @param snapshotId - ID du snapshot
   */
  restoreSnapshot: (snapshotId: string) => void
  /**
   * Supprime un snapshot.
   * @param snapshotId - ID du snapshot
   */
  deleteSnapshot: (snapshotId: string) => void
  /**
   * Compare deux snapshots et génère un diff.
   * @param fromSnapshotId - Snapshot source
   * @param toSnapshotId - Snapshot cible
   * @returns Diff entre les deux snapshots
   */
  compareSnapshots: (fromSnapshotId: string, toSnapshotId: string) => GraphDiff
  /**
   * Crée une nouvelle branche.
   * @param name - Nom de la branche
   * @param description - Description optionnelle
   */
  createBranch: (name: string, description?: string) => void
  /**
   * Bascule vers une branche.
   * @param branchName - Nom de la branche
   */
  switchBranch: (branchName: string) => void
  /**
   * Fusionne une branche dans la branche actuelle.
   * @param sourceBranch - Branche source
   * @param strategy - Stratégie de fusion
   */
  mergeBranch: (sourceBranch: string, strategy?: 'ours' | 'theirs' | 'manual') => void
  /**
   * Tag un snapshot avec une version.
   * @param snapshotId - ID du snapshot
   * @param tag - Tag de version
   */
  tagSnapshot: (snapshotId: string, tag: string) => void
  /**
   * Obtient l'historique des snapshots.
   * @returns Snapshots triés par date
   */
  getSnapshotHistory: () => GraphSnapshot[]
  /**
   * Exporte un snapshot en JSON.
   * @param snapshotId - ID du snapshot
   * @returns JSON du snapshot
   */
  exportSnapshot: (snapshotId: string) => string
  /**
   * Importe un snapshot depuis JSON.
   * @param json - JSON du snapshot
   * @returns Snapshot importé
   */
  importSnapshot: (json: string) => GraphSnapshot
}

/**
 * Trait permettant de gérer les versions du graphe avec snapshots et diff.
 *
 * Extension de useHistorable avec fonctionnalités avancées :
 * - **Snapshots nommés** : Sauvegardes complètes avec métadonnées
 * - **Diff visuel** : Comparaison entre versions avec changements détaillés
 * - **Branches** : Travail en parallèle sur différentes versions
 * - **Tags** : Versions sémantiques (v1.0.0, v2.0.0, etc.)
 * - **Fusion** : Merge de branches avec stratégies
 * - **Export/Import** : Sauvegarde externe des snapshots
 *
 * @returns État réactif et handlers pour la gestion de versions
 *
 * @example
 * ```typescript
 * const {
 *   createSnapshot,
 *   restoreSnapshot,
 *   compareSnapshots,
 *   createBranch
 * } = useVersionable();
 *
 * // Créer un snapshot
 * const v1 = createSnapshot('Version 1.0', 'Version initiale', 'v1.0.0');
 *
 * // Modifier le graphe...
 *
 * // Créer un nouveau snapshot
 * const v2 = createSnapshot('Version 1.1', 'Ajout de fonctionnalités', 'v1.1.0');
 *
 * // Comparer les versions
 * const diff = compareSnapshots(v1.id, v2.id);
 * console.log(`${diff.stats.nodesAdded} noeuds ajoutés`);
 *
 * // Créer une branche expérimentale
 * createBranch('experimental', 'Tests de nouvelles idées');
 * ```
 */
// État global des versions (partagé entre le bouton Toolbar et le panneau).
// Restauration automatique depuis localStorage au chargement du module.
function loadSnapshotsFromStorage(): GraphSnapshot[] {
  try {
    const raw = localStorage.getItem('graph-snapshots')
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

const snapshots = ref<GraphSnapshot[]>(loadSnapshotsFromStorage())
const currentSnapshot = ref<GraphSnapshot | null>(null)
const branches = ref<VersionBranch[]>([
  {
    name: 'main',
    currentSnapshotId: '',
    description: 'Branche principale',
    createdAt: Date.now(),
  },
])
const currentBranch = ref('main')
const activeDiff = ref<GraphDiff | null>(null)

export function useVersionable(): VersionableState & VersionableHandlers {
  const graphStore = useGraphStore()

  /**
   * Crée un snapshot du graphe actuel.
   */
  function createSnapshot(name: string, description?: string, tag?: string): GraphSnapshot {
    const snapshot: GraphSnapshot = {
      id: nanoid(),
      name,
      description,
      tag,
      state: {
        nodes: { ...graphStore.nodes },
        edges: { ...graphStore.edges },
      },
      metadata: {
        createdAt: Date.now(),
        branchName: currentBranch.value,
      },
      parentId: currentSnapshot.value?.id,
    }

    snapshots.value.push(snapshot)
    currentSnapshot.value = snapshot

    // Mettre à jour la branche actuelle
    const branch = branches.value.find((b) => b.name === currentBranch.value)
    if (branch) {
      branch.currentSnapshotId = snapshot.id
    }

    // Sauvegarder dans localStorage
    try {
      localStorage.setItem('graph-snapshots', JSON.stringify(snapshots.value))
    } catch (e) {
      console.warn('Impossible de sauvegarder les snapshots:', e)
    }

    return snapshot
  }

  /**
   * Restaure un snapshot.
   * Utilise graphStore.replaceAll pour préserver les IDs et synchroniser
   * la base IndexedDB (sinon la reactivité serait cassée par assignation
   * directe à des refs readonly).
   */
  async function restoreSnapshot(snapshotId: string): Promise<void> {
    const snapshot = snapshots.value.find((s) => s.id === snapshotId)
    if (!snapshot) {
      console.error(`Snapshot ${snapshotId} non trouvé`)
      return
    }
    await graphStore.replaceAll(snapshot.state.nodes, snapshot.state.edges)
    currentSnapshot.value = snapshot
  }

  /**
   * Supprime un snapshot.
   */
  function deleteSnapshot(snapshotId: string): void {
    const index = snapshots.value.findIndex((s) => s.id === snapshotId)
    if (index !== -1) {
      snapshots.value.splice(index, 1)

      // Sauvegarder
      try {
        localStorage.setItem('graph-snapshots', JSON.stringify(snapshots.value))
      } catch (e) {
        console.warn('Impossible de sauvegarder les snapshots:', e)
      }
    }
  }

  /**
   * Calcule les propriétés modifiées entre deux noeuds.
   */
  function getChangedProperties(before: Node, after: Node): string[] {
    const changed: string[] = []

    // Comparer geometry
    if (JSON.stringify(before.geometry) !== JSON.stringify(after.geometry)) {
      changed.push('geometry')
    }

    // Comparer styling
    if (JSON.stringify(before.styling) !== JSON.stringify(after.styling)) {
      changed.push('styling')
    }

    // Comparer data
    if (JSON.stringify(before.data) !== JSON.stringify(after.data)) {
      changed.push('data')
    }

    // Comparer parentId
    if (before.parentId !== after.parentId) {
      changed.push('parentId')
    }

    return changed
  }

  /**
   * Compare deux snapshots.
   */
  function compareSnapshots(fromSnapshotId: string, toSnapshotId: string): GraphDiff {
    const fromSnapshot = snapshots.value.find((s) => s.id === fromSnapshotId)
    const toSnapshot = snapshots.value.find((s) => s.id === toSnapshotId)

    if (!fromSnapshot || !toSnapshot) {
      throw new Error('Snapshot non trouvé')
    }

    const nodeChanges: NodeChange[] = []
    const edgeChanges: EdgeChange[] = []

    const stats = {
      nodesAdded: 0,
      nodesModified: 0,
      nodesDeleted: 0,
      edgesAdded: 0,
      edgesModified: 0,
      edgesDeleted: 0,
    }

    // Comparer les noeuds
    const fromNodeIds = new Set(Object.keys(fromSnapshot.state.nodes))
    const toNodeIds = new Set(Object.keys(toSnapshot.state.nodes))

    // Noeuds ajoutés
    for (const nodeId of toNodeIds) {
      if (!fromNodeIds.has(nodeId)) {
        nodeChanges.push({
          type: 'added',
          nodeId,
          after: toSnapshot.state.nodes[nodeId],
        })
        stats.nodesAdded++
      }
    }

    // Noeuds supprimés
    for (const nodeId of fromNodeIds) {
      if (!toNodeIds.has(nodeId)) {
        nodeChanges.push({
          type: 'deleted',
          nodeId,
          before: fromSnapshot.state.nodes[nodeId],
        })
        stats.nodesDeleted++
      }
    }

    // Noeuds modifiés
    for (const nodeId of fromNodeIds) {
      if (toNodeIds.has(nodeId)) {
        const before = fromSnapshot.state.nodes[nodeId]
        const after = toSnapshot.state.nodes[nodeId]

        const changed = getChangedProperties(before, after)
        if (changed.length > 0) {
          nodeChanges.push({
            type: 'modified',
            nodeId,
            before,
            after,
            changedProperties: changed,
          })
          stats.nodesModified++
        }
      }
    }

    // Comparer les arêtes
    const fromEdgeIds = new Set(Object.keys(fromSnapshot.state.edges))
    const toEdgeIds = new Set(Object.keys(toSnapshot.state.edges))

    // Arêtes ajoutées
    for (const edgeId of toEdgeIds) {
      if (!fromEdgeIds.has(edgeId)) {
        edgeChanges.push({
          type: 'added',
          edgeId,
          after: toSnapshot.state.edges[edgeId],
        })
        stats.edgesAdded++
      }
    }

    // Arêtes supprimées
    for (const edgeId of fromEdgeIds) {
      if (!toEdgeIds.has(edgeId)) {
        edgeChanges.push({
          type: 'deleted',
          edgeId,
          before: fromSnapshot.state.edges[edgeId],
        })
        stats.edgesDeleted++
      }
    }

    // Arêtes modifiées
    for (const edgeId of fromEdgeIds) {
      if (toEdgeIds.has(edgeId)) {
        const before = fromSnapshot.state.edges[edgeId]
        const after = toSnapshot.state.edges[edgeId]

        if (JSON.stringify(before) !== JSON.stringify(after)) {
          edgeChanges.push({
            type: 'modified',
            edgeId,
            before,
            after,
          })
          stats.edgesModified++
        }
      }
    }

    const diff: GraphDiff = {
      fromSnapshotId,
      toSnapshotId,
      nodeChanges,
      edgeChanges,
      stats,
      timestamp: Date.now(),
    }

    activeDiff.value = diff
    return diff
  }

  /**
   * Crée une nouvelle branche.
   */
  function createBranch(name: string, description?: string): void {
    const existingBranch = branches.value.find((b) => b.name === name)
    if (existingBranch) {
      console.warn(`La branche ${name} existe déjà`)
      return
    }

    const branch: VersionBranch = {
      name,
      currentSnapshotId: currentSnapshot.value?.id || '',
      description,
      createdAt: Date.now(),
    }

    branches.value.push(branch)
  }

  /**
   * Bascule vers une branche.
   */
  function switchBranch(branchName: string): void {
    const branch = branches.value.find((b) => b.name === branchName)
    if (!branch) {
      console.error(`Branche ${branchName} non trouvée`)
      return
    }

    currentBranch.value = branchName

    // Restaurer le snapshot de la branche
    if (branch.currentSnapshotId) {
      restoreSnapshot(branch.currentSnapshotId)
    }
  }

  /**
   * Fusionne une branche.
   */
  function mergeBranch(
    sourceBranch: string,
    strategy: 'ours' | 'theirs' | 'manual' = 'theirs'
  ): void {
    const source = branches.value.find((b) => b.name === sourceBranch)
    const target = branches.value.find((b) => b.name === currentBranch.value)

    if (!source || !target) {
      console.error('Branche source ou cible non trouvée')
      return
    }

    const sourceSnapshot = snapshots.value.find((s) => s.id === source.currentSnapshotId)
    const targetSnapshot = snapshots.value.find((s) => s.id === target.currentSnapshotId)

    if (!sourceSnapshot || !targetSnapshot) {
      console.error('Snapshot non trouvé')
      return
    }

    // Stratégie simple : prendre la source ou la cible
    if (strategy === 'theirs') {
      // Prendre la source
      graphStore.nodes = { ...sourceSnapshot.state.nodes }
      graphStore.edges = { ...sourceSnapshot.state.edges }
    } else if (strategy === 'ours') {
      // Garder la cible (rien à faire)
    }

    // Créer un snapshot de fusion
    createSnapshot(
      `Merge ${sourceBranch} into ${currentBranch.value}`,
      `Fusion de ${sourceBranch}`,
      undefined
    )
  }

  /**
   * Tag un snapshot.
   */
  function tagSnapshot(snapshotId: string, tag: string): void {
    const snapshot = snapshots.value.find((s) => s.id === snapshotId)
    if (snapshot) {
      snapshot.tag = tag

      // Sauvegarder
      try {
        localStorage.setItem('graph-snapshots', JSON.stringify(snapshots.value))
      } catch (e) {
        console.warn('Impossible de sauvegarder les snapshots:', e)
      }
    }
  }

  /**
   * Obtient l'historique des snapshots.
   */
  function getSnapshotHistory(): GraphSnapshot[] {
    return [...snapshots.value].sort((a, b) => b.metadata.createdAt - a.metadata.createdAt)
  }

  /**
   * Exporte un snapshot.
   */
  function exportSnapshot(snapshotId: string): string {
    const snapshot = snapshots.value.find((s) => s.id === snapshotId)
    if (!snapshot) {
      throw new Error(`Snapshot ${snapshotId} non trouvé`)
    }

    return JSON.stringify(snapshot, null, 2)
  }

  /**
   * Importe un snapshot.
   */
  function importSnapshot(json: string): GraphSnapshot {
    const snapshot = JSON.parse(json) as GraphSnapshot

    // Vérifier que le snapshot est valide
    if (!snapshot.id || !snapshot.state) {
      throw new Error('Snapshot invalide')
    }

    // Générer un nouvel ID pour éviter les conflits
    snapshot.id = nanoid()
    snapshot.metadata.createdAt = Date.now()

    snapshots.value.push(snapshot)

    // Sauvegarder
    try {
      localStorage.setItem('graph-snapshots', JSON.stringify(snapshots.value))
    } catch (e) {
      console.warn('Impossible de sauvegarder les snapshots:', e)
    }

    return snapshot
  }

  // Charger les snapshots depuis localStorage au démarrage
  try {
    const saved = localStorage.getItem('graph-snapshots')
    if (saved) {
      snapshots.value = JSON.parse(saved)
    }
  } catch (e) {
    console.warn('Impossible de charger les snapshots:', e)
  }

  return {
    snapshots,
    currentSnapshot,
    branches,
    currentBranch,
    activeDiff,
    createSnapshot,
    restoreSnapshot,
    deleteSnapshot,
    compareSnapshots,
    createBranch,
    switchBranch,
    mergeBranch,
    tagSnapshot,
    getSnapshotHistory,
    exportSnapshot,
    importSnapshot,
  }
}
