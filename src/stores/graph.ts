
// src/stores/graph.ts
import { defineStore } from 'pinia';
import { ref, readonly } from 'vue';
import { db } from '../db';
import type { Node, Edge } from '../types';
import { nanoid } from 'nanoid'; // Pour générer des IDs uniques

export const useGraphStore = defineStore('graph', () => {
  // --- STATE ---
  // Utilisation de Record<string, T> pour un accès O(1)
  const nodes = ref<Record<string, Node>>({});
  const edges = ref<Record<string, Edge>>({});

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
   * @param partialNode - Données initiales du noeud (type, géométrie...)
   * @param parentId - ID du parent, ou null pour la racine.
   */
  async function createNode(partialNode: Omit<Node, 'id'>, parentId: string | null) {
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
   * @param id - ID du noeud à mettre à jour.
   * @param updates - Champs à modifier.
   */
  async function updateNode(id: string, updates: Partial<Node>) {
    if (nodes.value[id]) {
      Object.assign(nodes.value[id], updates);
      await db.nodes.update(id, updates);
    }
  }

  // ... autres actions (deleteNode, createEdge, etc.)

  return {
    // State (lecture seule à l'extérieur du store)
    nodes: readonly(nodes),
    edges: readonly(edges),

    // Actions
    loadFromDB,
    createNode,
    updateNode,
  };
});
