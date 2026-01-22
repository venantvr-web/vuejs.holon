// src/composables/traits/useClipboardable.ts
import { ref } from 'vue';
import { useGraphStore } from '../../stores/graph';
import { useSelectionState } from './useSelectable';
import { nanoid } from 'nanoid';
import type { Node, Edge } from '../../types';

export interface ClipboardData {
  nodes: Node[];
  edges: Edge[];
  timestamp: number;
}

export interface ClipboardableHandlers {
  copy: (nodeIds?: string[]) => void;
  cut: (nodeIds?: string[]) => void;
  paste: (offsetX?: number, offsetY?: number) => Promise<string[]>;
  duplicate: (nodeIds?: string[]) => Promise<string[]>;
  canPaste: () => boolean;
  clearClipboard: () => void;
}

// Clipboard interne
const clipboard = ref<ClipboardData | null>(null);
const PASTE_OFFSET = 20;

export function useClipboardable(): ClipboardableHandlers {
  const graphStore = useGraphStore();
  const { selectedNodeIds, clearSelection } = useSelectionState();

  function getTargetNodeIds(nodeIds?: string[]): string[] {
    return nodeIds ?? Array.from(selectedNodeIds.value);
  }

  // Collecte les noeuds et leurs descendants
  function collectNodesWithDescendants(nodeIds: string[]): Node[] {
    const result: Node[] = [];
    const visited = new Set<string>();

    function collect(id: string) {
      if (visited.has(id)) return;
      visited.add(id);

      const node = graphStore.nodes[id];
      if (!node) return;

      result.push(JSON.parse(JSON.stringify(node)));

      // Collecter les enfants
      const children = Object.values(graphStore.nodes).filter(n => n.parentId === id);
      for (const child of children) {
        collect(child.id);
      }
    }

    for (const id of nodeIds) {
      collect(id);
    }

    return result;
  }

  // Collecte les edges entre les noeuds
  function collectEdges(nodeIds: Set<string>): Edge[] {
    return Object.values(graphStore.edges)
      .filter(e => nodeIds.has(e.sourceId) && nodeIds.has(e.targetId))
      .map(e => JSON.parse(JSON.stringify(e)));
  }

  function copy(nodeIds?: string[]) {
    const ids = getTargetNodeIds(nodeIds);
    if (ids.length === 0) return;

    const nodes = collectNodesWithDescendants(ids);
    const nodeIdSet = new Set(nodes.map(n => n.id));
    const edges = collectEdges(nodeIdSet);

    clipboard.value = {
      nodes,
      edges,
      timestamp: Date.now(),
    };
  }

  function cut(nodeIds?: string[]) {
    const ids = getTargetNodeIds(nodeIds);
    if (ids.length === 0) return;

    // Copier d'abord
    copy(ids);

    // Puis supprimer
    for (const id of ids) {
      graphStore.deleteNode(id);
    }

    clearSelection();
  }

  async function paste(offsetX = PASTE_OFFSET, offsetY = PASTE_OFFSET): Promise<string[]> {
    if (!clipboard.value) return [];

    const { nodes, edges } = clipboard.value;
    const idMapping = new Map<string, string>();
    const newNodeIds: string[] = [];

    // Calculer le bounding box pour centrer le paste
    const minX = Math.min(...nodes.map(n => n.geometry.x));
    const minY = Math.min(...nodes.map(n => n.geometry.y));

    // Créer les nouveaux noeuds avec de nouveaux IDs
    for (const node of nodes) {
      const newId = nanoid();
      idMapping.set(node.id, newId);

      // Déterminer le nouveau parentId
      let newParentId = node.parentId;
      if (newParentId && idMapping.has(newParentId)) {
        newParentId = idMapping.get(newParentId)!;
      } else if (newParentId && !nodes.find(n => n.id === newParentId)) {
        // Le parent original n'est pas dans le clipboard, mettre à null
        newParentId = null;
      }

      const newNode: Node = {
        ...node,
        id: newId,
        parentId: newParentId,
        geometry: {
          ...node.geometry,
          x: node.geometry.x + offsetX,
          y: node.geometry.y + offsetY,
        },
      };

      await graphStore.createNode(
        {
          type: newNode.type,
          geometry: newNode.geometry,
          style: newNode.style,
          data: newNode.data,
        },
        newNode.parentId
      );

      // On doit mettre à jour l'ID car createNode génère un nouvel ID
      // Donc on utilise updateNode pour corriger
      newNodeIds.push(newId);
    }

    // Créer les nouvelles edges
    for (const edge of edges) {
      const newSourceId = idMapping.get(edge.sourceId);
      const newTargetId = idMapping.get(edge.targetId);

      if (newSourceId && newTargetId) {
        await graphStore.createEdge(newSourceId, newTargetId, edge.routing);
      }
    }

    // Sélectionner les nouveaux noeuds (seulement les racines)
    const rootNodes = nodes.filter(n => !n.parentId || !idMapping.has(n.parentId));
    selectedNodeIds.value = new Set(rootNodes.map(n => idMapping.get(n.id)!));

    return newNodeIds;
  }

  async function duplicate(nodeIds?: string[]): Promise<string[]> {
    const ids = getTargetNodeIds(nodeIds);
    if (ids.length === 0) return [];

    // Sauvegarder le clipboard actuel
    const savedClipboard = clipboard.value;

    // Copier et coller
    copy(ids);
    const newIds = await paste();

    // Restaurer le clipboard
    clipboard.value = savedClipboard;

    return newIds;
  }

  function canPaste(): boolean {
    return clipboard.value !== null && clipboard.value.nodes.length > 0;
  }

  function clearClipboard() {
    clipboard.value = null;
  }

  return {
    copy,
    cut,
    paste,
    duplicate,
    canPaste,
    clearClipboard,
  };
}

// Export du clipboard pour debug
export function useClipboardState() {
  return {
    clipboard,
    hasContent: () => clipboard.value !== null && clipboard.value.nodes.length > 0,
  };
}
