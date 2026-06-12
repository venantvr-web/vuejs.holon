// src/composables/traits/useGroupable.ts
import { ref, computed, type Ref } from 'vue'
import { useGraphStore } from '../../stores/graph'
import { useSelectionState } from './useSelectable'
import { nanoid } from 'nanoid'

/**
 * Représente un groupe de noeuds.
 */
export interface NodeGroup {
  /**
   * Identifiant unique du groupe.
   */
  id: string
  /**
   * Nom affiché du groupe.
   */
  name: string
  /**
   * Set des IDs des noeuds membres du groupe.
   */
  nodeIds: Set<string>
  /**
   * Couleur optionnelle du groupe.
   */
  color?: string
  /**
   * Indique si le groupe est verrouillé.
   */
  locked?: boolean
  /**
   * Timestamp de création du groupe.
   */
  createdAt: number
}

/**
 * Options de configuration pour le trait Groupable.
 */
export interface GroupableOptions {
  /**
   * Référence réactive vers l'ID du noeud concerné.
   */
  nodeId: Ref<string>
}

/**
 * État réactif exposé par le trait Groupable.
 */
export interface GroupableState {
  /**
   * ID du groupe auquel appartient le noeud (null si non groupé).
   */
  groupId: Ref<string | null>
  /**
   * Nom du groupe auquel appartient le noeud (null si non groupé).
   */
  groupName: Ref<string | null>
  /**
   * Indique si le noeud appartient à un groupe.
   */
  isGrouped: Ref<boolean>
  /**
   * Liste des IDs des autres membres du groupe.
   */
  groupMembers: Ref<string[]>
}

/**
 * Handlers (actions) exposés par le trait Groupable.
 */
export interface GroupableHandlers {
  /**
   * Crée un nouveau groupe avec les noeuds sélectionnés.
   * @param name - Nom du groupe (optionnel, généré automatiquement si omis)
   * @returns ID du groupe créé (null si échec)
   */
  createGroup: (name?: string) => string | null
  /**
   * Ajoute ce noeud à un groupe existant.
   * @param groupId - ID du groupe cible
   */
  addToGroup: (groupId: string) => void
  /**
   * Retire ce noeud de son groupe actuel.
   */
  removeFromGroup: () => void
  /**
   * Dissout complètement le groupe actuel.
   */
  dissolveGroup: () => void
}

// État global des groupes
const groups = ref<Map<string, NodeGroup>>(new Map())

/**
 * Trait permettant de grouper logiquement plusieurs noeuds ensemble.
 *
 * Les groupes permettent de sélectionner, déplacer ou styler collectivement
 * des noeuds sans hiérarchie parent-enfant.
 *
 * @param options - Configuration du trait
 * @returns État réactif et handlers pour la gestion des groupes
 *
 * @example
 * ```typescript
 * const { isGrouped, createGroup, groupMembers } = useGroupable({
 *   nodeId: ref('node-123')
 * });
 * createGroup('Mon groupe'); // Crée un groupe avec les noeuds sélectionnés
 * ```
 */
export function useGroupable(options: GroupableOptions): GroupableState & GroupableHandlers {
  const graphStore = useGraphStore()
  const { selectedNodeIds } = useSelectionState()

  const groupId = computed(() => {
    const node = graphStore.nodes[options.nodeId.value]
    return node?.data?.groupId ?? null
  })

  const groupName = computed(() => {
    const gid = groupId.value
    if (!gid) return null
    return groups.value.get(gid)?.name ?? null
  })

  const isGrouped = computed(() => groupId.value !== null)

  const groupMembers = computed(() => {
    const gid = groupId.value
    if (!gid) return []
    const group = groups.value.get(gid)
    return group ? Array.from(group.nodeIds) : []
  })

  // Crée un groupe avec les noeuds sélectionnés
  function createGroup(name?: string): string | null {
    if (selectedNodeIds.value.size < 2) return null

    const id = nanoid()
    const group: NodeGroup = {
      id,
      name: name ?? `Groupe ${groups.value.size + 1}`,
      nodeIds: new Set(selectedNodeIds.value),
      createdAt: Date.now(),
    }

    groups.value.set(id, group)

    // Associer chaque noeud au groupe
    for (const nodeId of selectedNodeIds.value) {
      const node = graphStore.nodes[nodeId]
      if (node) {
        graphStore.updateNode(nodeId, {
          data: {
            ...node.data,
            groupId: id,
          },
        })
      }
    }

    return id
  }

  function addToGroup(targetGroupId: string) {
    const group = groups.value.get(targetGroupId)
    if (!group) return

    group.nodeIds.add(options.nodeId.value)

    const node = graphStore.nodes[options.nodeId.value]
    if (node) {
      graphStore.updateNode(options.nodeId.value, {
        data: {
          ...node.data,
          groupId: targetGroupId,
        },
      })
    }
  }

  function removeFromGroup() {
    const gid = groupId.value
    if (!gid) return

    const group = groups.value.get(gid)
    if (group) {
      group.nodeIds.delete(options.nodeId.value)

      // Si le groupe est vide ou n'a qu'un membre, le dissoudre
      if (group.nodeIds.size <= 1) {
        dissolveGroupById(gid)
        return
      }
    }

    const node = graphStore.nodes[options.nodeId.value]
    if (node) {
      const newData = { ...node.data }
      delete newData.groupId
      graphStore.updateNode(options.nodeId.value, { data: newData })
    }
  }

  function dissolveGroup() {
    const gid = groupId.value
    if (!gid) return
    dissolveGroupById(gid)
  }

  return {
    groupId: computed(() => groupId.value),
    groupName,
    isGrouped,
    groupMembers,
    createGroup,
    addToGroup,
    removeFromGroup,
    dissolveGroup,
  }
}

// Fonction helper interne
function dissolveGroupById(groupId: string) {
  const graphStore = useGraphStore()
  const group = groups.value.get(groupId)

  if (!group) return

  // Retirer le groupId de tous les membres
  for (const nodeId of group.nodeIds) {
    const node = graphStore.nodes[nodeId]
    if (node) {
      const newData = { ...node.data }
      delete newData.groupId
      graphStore.updateNode(nodeId, { data: newData })
    }
  }

  // Supprimer le groupe
  groups.value.delete(groupId)
}

// État global pour la gestion des groupes
export function useGroupState() {
  const graphStore = useGraphStore()
  const { selectedNodeIds } = useSelectionState()

  return {
    groups,

    // Crée un groupe avec la sélection actuelle
    createGroupFromSelection: (name?: string): string | null => {
      if (selectedNodeIds.value.size < 2) return null

      const id = nanoid()
      const group: NodeGroup = {
        id,
        name: name ?? `Groupe ${groups.value.size + 1}`,
        nodeIds: new Set(selectedNodeIds.value),
        createdAt: Date.now(),
      }

      groups.value.set(id, group)

      for (const nodeId of selectedNodeIds.value) {
        const node = graphStore.nodes[nodeId]
        if (node) {
          graphStore.updateNode(nodeId, {
            data: {
              ...node.data,
              groupId: id,
            },
          })
        }
      }

      return id
    },

    // Sélectionne tous les membres d'un groupe
    selectGroup: (groupId: string) => {
      const group = groups.value.get(groupId)
      if (!group) return
      selectedNodeIds.value = new Set(group.nodeIds)
    },

    // Renomme un groupe
    renameGroup: (groupId: string, name: string) => {
      const group = groups.value.get(groupId)
      if (group) {
        group.name = name
      }
    },

    // Dissout un groupe
    dissolveGroup: (groupId: string) => {
      dissolveGroupById(groupId)
    },

    // Verrouille/déverrouille un groupe
    toggleGroupLock: (groupId: string) => {
      const group = groups.value.get(groupId)
      if (group) {
        group.locked = !group.locked
      }
    },

    // Définit la couleur d'un groupe
    setGroupColor: (groupId: string, color: string) => {
      const group = groups.value.get(groupId)
      if (group) {
        group.color = color
      }
    },

    // Liste tous les groupes
    getAllGroups: () => Array.from(groups.value.values()),

    // Récupère un groupe par ID
    getGroup: (groupId: string) => groups.value.get(groupId),
  }
}
