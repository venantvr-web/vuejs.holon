
// src/db/index.ts
import Dexie, { Table } from 'dexie';
import type { Node, Edge } from '../types';

/**
 * Classe de base de données typée pour notre application Holon.
 * Utilise Dexie.js pour la persistance dans IndexedDB.
 */
export class HolonDatabase extends Dexie {
  // Déclaration des "tables" (Object Stores) pour les noeuds et les arêtes.
  nodes!: Table<Node, string>; // Clé primaire de type string (ID)
  edges!: Table<Edge, string>; // Clé primaire de type string (ID)

  constructor() {
    super('HolonDatabase');
    this.version(1).stores({
      // Indexation des champs pour des recherches rapides.
      // '&id' signifie que 'id' est la clé primaire.
      // 'parentId' est indexé pour retrouver facilement les enfants d'un noeud.
      nodes: '&id, parentId',
      // '&id' pour la clé primaire, et les IDs source/cible pour les requêtes de connectivité.
      edges: '&id, sourceId, targetId',
    });
  }
}

// Instance unique de la base de données, exportée pour être utilisée dans les stores.
export const db = new HolonDatabase();
