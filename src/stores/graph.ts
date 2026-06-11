// src/stores/graph.ts
import { defineStore } from 'pinia';
import { ref, readonly, computed } from 'vue';
import { db } from '../db';
import type { Node, Edge } from '../types';
import { nanoid } from 'nanoid';

export const useGraphStore = defineStore('graph', () => {
  // --- STATE ---
  const nodes = ref<Record<string, Node>>({});
  const edges = ref<Record<string, Edge>>({});

  // --- GETTERS ---
  const rootNodes = computed(() => {
    return Object.values(nodes.value).filter(n => n.parentId === null);
  });

  const getChildren = (parentId: string) => {
    return Object.values(nodes.value).filter(n => n.parentId === parentId);
  };

  // --- ACTIONS ---

  /**
   * Charge tous les noeuds et arêtes depuis IndexedDB.
   */
  async function loadFromDB() {
    const allNodes = await db.nodes.toArray();
    const allEdges = await db.edges.toArray();

    nodes.value = allNodes.reduce((acc, node) => {
      acc[node.id] = node;
      return acc;
    }, {} as Record<string, Node>);

    edges.value = allEdges.reduce((acc, edge) => {
      acc[edge.id] = edge;
      return acc;
    }, {} as Record<string, Edge>);
  }

  /**
   * Crée un nouveau noeud et le sauvegarde en base.
   */
  async function createNode(partialNode: Omit<Node, 'id' | 'parentId'>, parentId: string | null) {
    const id = nanoid();
    const newNode: Node = {
      ...partialNode,
      id,
      parentId,
    };
    nodes.value[id] = newNode;
    await db.nodes.put(newNode);
    return newNode;
  }

  /**
   * Met à jour un noeud existant.
   */
  async function updateNode(id: string, updates: Partial<Node>) {
    if (nodes.value[id]) {
      const updatedNode = { ...nodes.value[id], ...updates };
      nodes.value[id] = updatedNode;
      await db.nodes.update(id, updates);
    }
  }

  /**
   * Supprime un noeud et tous ses enfants récursivement.
   */
  async function deleteNode(id: string) {
    // Récupérer tous les enfants récursivement
    const toDelete: string[] = [id];
    const collectChildren = (parentId: string) => {
      const children = Object.values(nodes.value).filter(n => n.parentId === parentId);
      for (const child of children) {
        toDelete.push(child.id);
        collectChildren(child.id);
      }
    };
    collectChildren(id);

    // Supprimer les arêtes connectées
    const edgesToDelete = Object.values(edges.value)
      .filter(e => toDelete.includes(e.sourceId) || toDelete.includes(e.targetId))
      .map(e => e.id);

    for (const edgeId of edgesToDelete) {
      delete edges.value[edgeId];
      await db.edges.delete(edgeId);
    }

    // Supprimer les noeuds
    for (const nodeId of toDelete) {
      delete nodes.value[nodeId];
      await db.nodes.delete(nodeId);
    }
  }

  /**
   * Crée une nouvelle arête entre deux noeuds.
   */
  async function createEdge(sourceId: string, targetId: string, routing: 'straight' | 'orthogonal' = 'straight') {
    // Vérifier que les noeuds existent
    if (!nodes.value[sourceId] || !nodes.value[targetId]) return null;

    // Vérifier qu'une arête identique (même sens) n'existe pas déjà.
    // Le sens compte : A→B et B→A sont deux relations distinctes en Archimate.
    const exists = Object.values(edges.value).some(
      e => e.sourceId === sourceId && e.targetId === targetId
    );
    if (exists) return null;

    const id = nanoid();
    const newEdge: Edge = { id, sourceId, targetId, routing };
    edges.value[id] = newEdge;
    await db.edges.put(newEdge);
    return newEdge;
  }

  /**
   * Met à jour une arête existante.
   */
  async function updateEdge(id: string, updates: Partial<Edge>) {
    if (edges.value[id]) {
      const updatedEdge = { ...edges.value[id], ...updates };
      edges.value[id] = updatedEdge;
      await db.edges.update(id, updates);
    }
  }

  /**
   * Supprime une arête.
   */
  async function deleteEdge(id: string) {
    if (edges.value[id]) {
      delete edges.value[id];
      await db.edges.delete(id);
    }
  }

  /**
   * Déplace un noeud vers un nouveau parent.
   */
  async function reparentNode(nodeId: string, newParentId: string | null) {
    if (nodes.value[nodeId]) {
      nodes.value[nodeId].parentId = newParentId;
      await db.nodes.update(nodeId, { parentId: newParentId });
    }
  }

  /**
   * Efface tout le graphe.
   */
  async function clearAll() {
    nodes.value = {};
    edges.value = {};
    await db.nodes.clear();
    await db.edges.clear();
  }

  /**
   * Insère un noeud complet (ID inclus) dans le graphe.
   * Utilisé pour la restauration d'undo et le collage qui doivent préserver
   * les identifiants afin de maintenir la cohérence des arêtes et des parents.
   */
  async function importNode(node: Node) {
    nodes.value[node.id] = { ...node };
    await db.nodes.put({ ...node });
  }

  /**
   * Insère une arête complète (ID inclus) dans le graphe.
   */
  async function importEdge(edge: Edge) {
    edges.value[edge.id] = { ...edge };
    await db.edges.put({ ...edge });
  }

  /**
   * Remplace atomiquement tout le contenu du graphe par un snapshot.
   * Utilisé par l'undo/redo pour restaurer un état antérieur sans passer
   * par des créations/suppressions individuelles.
   */
  async function replaceAll(newNodes: Record<string, Node>, newEdges: Record<string, Edge>) {
    nodes.value = { ...newNodes };
    edges.value = { ...newEdges };
    await db.transaction('rw', db.nodes, db.edges, async () => {
      await db.nodes.clear();
      await db.edges.clear();
      await db.nodes.bulkPut(Object.values(newNodes));
      await db.edges.bulkPut(Object.values(newEdges));
    });
  }

  return {
    // State
    nodes: readonly(nodes),
    edges: readonly(edges),

    // Getters
    rootNodes,
    getChildren,

    // Actions
    loadFromDB,
    createNode,
    updateNode,
    deleteNode,
    createEdge,
    updateEdge,
    deleteEdge,
    reparentNode,
    clearAll,
    importNode,
    importEdge,
    replaceAll,
  };
});
