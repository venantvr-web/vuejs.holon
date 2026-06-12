// src/db/index.ts
import Dexie, { Table } from 'dexie'
import type { Node, Edge, LibraryItem } from '../types'

/**
 * Entrée d'auto-backup persistée localement.
 *
 * Chaque entrée est un snapshot complet du graphe, indexé par timestamp pour
 * pouvoir purger les anciens en cas de rétention dépassée.
 */
export interface BackupEntry {
  /** Identifiant interne (nanoid). */
  id: string
  /** Date de création (epoch ms). */
  createdAt: number
  /** Étiquette facultative (« avant import », « manuelle », etc.). */
  label?: string
  /** Snapshot complet des noeuds. */
  nodes: Record<string, Node>
  /** Snapshot complet des arêtes. */
  edges: Record<string, Edge>
  /** Source qui a déclenché le backup. */
  source: 'auto' | 'manual'
}

/**
 * Classe de base de données typée pour notre application Holon.
 * Utilise Dexie.js pour la persistance dans IndexedDB.
 */
export class HolonDatabase extends Dexie {
  // Déclaration des "tables" (Object Stores).
  nodes!: Table<Node, string> // Clé primaire de type string (ID)
  edges!: Table<Edge, string>
  library!: Table<LibraryItem, string>
  backups!: Table<BackupEntry, string>

  constructor() {
    super('HolonDatabase')
    this.version(1).stores({
      // Indexation des champs pour des recherches rapides.
      // '&id' signifie que 'id' est la clé primaire.
      // 'parentId' est indexé pour retrouver facilement les enfants d'un noeud.
      nodes: '&id, parentId',
      // '&id' pour la clé primaire, et les IDs source/cible pour les requêtes de connectivité.
      edges: '&id, sourceId, targetId',
    })
    // v2 : ajout de la bibliothèque de blocs réutilisables.
    this.version(2).stores({
      nodes: '&id, parentId',
      edges: '&id, sourceId, targetId',
      library: '&id, isBuiltIn, createdAt',
    })
    // v3 : auto-backups (rétention locale du graphe complet).
    this.version(3).stores({
      nodes: '&id, parentId',
      edges: '&id, sourceId, targetId',
      library: '&id, isBuiltIn, createdAt',
      backups: '&id, createdAt, source',
    })
  }
}

// Instance unique de la base de données, exportée pour être utilisée dans les stores.
export const db = new HolonDatabase()
