// src/composables/traits/useHistorable.ts
// Event Sourcing & Object Lineage pour traçabilité complète
import { ref, computed, type Ref } from 'vue';
import { useGraphStore } from '../../stores/graph';
import { nanoid } from 'nanoid';
// Types Node et Edge utilisés implicitement via graphStore

/**
 * Types d'événements traçables dans l'historique.
 */
export enum EventType {
  // Noeuds
  NodeCreated = 'node:created',
  NodeUpdated = 'node:updated',
  NodeDeleted = 'node:deleted',
  NodeMoved = 'node:moved',
  NodeResized = 'node:resized',
  NodeReparented = 'node:reparented',
  NodeCloned = 'node:cloned',
  NodeStyled = 'node:styled',
  NodeTyped = 'node:typed',
  NodeLocked = 'node:locked',
  NodeUnlocked = 'node:unlocked',

  // Edges
  EdgeCreated = 'edge:created',
  EdgeUpdated = 'edge:updated',
  EdgeDeleted = 'edge:deleted',

  // Groupes
  GroupCreated = 'group:created',
  GroupDissolved = 'group:dissolved',
  NodeAddedToGroup = 'node:added-to-group',
  NodeRemovedFromGroup = 'node:removed-from-group',

  // Bulk operations
  BulkDelete = 'bulk:delete',
  BulkMove = 'bulk:move',
  BulkStyle = 'bulk:style',

  // Import/Export
  DiagramImported = 'diagram:imported',
  DiagramCleared = 'diagram:cleared',

  // Undo/Redo
  Undo = 'history:undo',
  Redo = 'history:redo',
}

/**
 * Événement historique traçant une modification dans le graphe.
 */
export interface HistoryEvent {
  /**
   * Identifiant unique de l'événement.
   */
  id: string;
  /**
   * Type d'événement.
   */
  type: EventType;
  /**
   * Timestamp de l'événement.
   */
  timestamp: number;
  /**
   * ID de l'objet concerné.
   */
  targetId: string;
  /**
   * Type de l'objet concerné.
   */
  targetType: 'node' | 'edge' | 'group' | 'diagram';
  /**
   * Données avant modification pour rollback.
   * Type unknown car peut contenir n'importe quel snapshot d'objet (Node, Edge, etc.).
   */
  before?: unknown;
  /**
   * Données après modification.
   * Type unknown car peut contenir n'importe quel snapshot d'objet (Node, Edge, etc.).
   */
  after?: unknown;
  /**
   * Métadonnées additionnelles de l'événement.
   */
  metadata?: {
    /**
     * Utilisateur ayant déclenché l'événement.
     */
    user?: string;
    /**
     * Raison de la modification.
     */
    reason?: string;
    /**
     * ID de l'événement parent (pour événements liés).
     */
    parentEventId?: string;
    /**
     * ID du batch (pour grouper les événements d'une même action).
     */
    batchId?: string;
  };
  /**
   * Information de lignage pour traçabilité des clones.
   */
  lineage?: {
    /**
     * ID de l'objet source si clone.
     */
    clonedFrom?: string;
    /**
     * IDs des objets sources si dérivé.
     */
    derivedFrom?: string[];
    /**
     * Version de l'objet.
     */
    version?: number;
  };
}

/**
 * Structure de lignage d'un objet pour traçabilité complète.
 */
export interface ObjectLineage {
  /**
   * ID de l'objet tracé.
   */
  objectId: string;
  /**
   * Type de l'objet.
   */
  objectType: 'node' | 'edge';
  /**
   * Timestamp de création.
   */
  createdAt: number;
  /**
   * Créateur de l'objet.
   */
  createdBy?: string;
  /**
   * Information sur l'origine de l'objet.
   */
  origin: {
    /**
     * Type d'origine.
     */
    type: 'created' | 'cloned' | 'imported' | 'derived';
    /**
     * ID de l'objet source si cloné ou dérivé.
     */
    sourceId?: string;
    /**
     * IDs des objets sources si dérivé de plusieurs.
     */
    sourceIds?: string[];
  };
  /**
   * Historique des versions de l'objet.
   */
  versions: {
    /**
     * Numéro de version.
     */
    version: number;
    /**
     * Timestamp de la version.
     */
    timestamp: number;
    /**
     * ID de l'événement ayant créé cette version.
     */
    eventId: string;
    /**
     * Liste des champs modifiés.
     */
    changes: string[];
  }[];
  /**
   * IDs des descendants (objets clonés depuis celui-ci).
   */
  descendants: string[];
}

// État global
const events = ref<HistoryEvent[]>([]);
const lineages = ref<Map<string, ObjectLineage>>(new Map());
const currentBatchId = ref<string | null>(null);
const maxEvents = ref(1000);

/**
 * Options de configuration pour le trait Historable.
 */
export interface HistorableOptions {
  /**
   * ID du noeud à tracer (optionnel, pour filtrage de l'historique).
   */
  nodeId?: Ref<string>;
  /**
   * Nombre maximum d'événements à conserver en mémoire.
   */
  maxHistory?: number;
}

/**
 * État réactif exposé par le trait Historable.
 */
export interface HistorableState {
  /**
   * Liste complète des événements historiques.
   */
  events: Ref<HistoryEvent[]>;
  /**
   * Lignage de l'objet spécifié dans les options (null si non spécifié).
   */
  objectLineage: Ref<ObjectLineage | null>;
  /**
   * Historique filtré pour l'objet spécifié dans les options.
   */
  objectHistory: Ref<HistoryEvent[]>;
  /**
   * Version actuelle de l'objet.
   */
  currentVersion: Ref<number>;
}

/**
 * Handlers (actions) exposés par le trait Historable.
 */
export interface HistorableHandlers {
  /**
   * Enregistre un événement dans l'historique.
   * @param type - Type d'événement
   * @param targetId - ID de l'objet concerné
   * @param targetType - Type de l'objet
   * @param before - Snapshot avant modification
   * @param after - Snapshot après modification
   * @param metadata - Métadonnées optionnelles
   * @returns ID de l'événement créé
   */
  recordEvent: (
    type: EventType,
    targetId: string,
    targetType: 'node' | 'edge' | 'group' | 'diagram',
    before?: unknown,
    after?: unknown,
    metadata?: HistoryEvent['metadata']
  ) => string;
  /**
   * Démarre un batch d'événements groupés.
   * @param reason - Raison du batch
   * @returns ID du batch
   */
  startBatch: (reason?: string) => string;
  /**
   * Termine le batch d'événements en cours.
   */
  endBatch: () => void;
  /**
   * Annule les modifications jusqu'à un événement spécifique.
   * @param eventId - ID de l'événement cible
   * @returns true si succès
   */
  rollbackToEvent: (eventId: string) => boolean;
  /**
   * Annule le dernier événement.
   * @returns true si succès
   */
  rollbackLastEvent: () => boolean;
  /**
   * Restaure un objet à une version spécifique.
   * @param objectId - ID de l'objet
   * @param version - Numéro de version cible
   * @returns true si succès
   */
  rollbackObject: (objectId: string, version: number) => boolean;
  /**
   * Récupère le lignage complet d'un objet.
   * @param objectId - ID de l'objet
   * @returns Lignage de l'objet (null si non trouvé)
   */
  getLineage: (objectId: string) => ObjectLineage | null;
  /**
   * Récupère la chaîne d'ancêtres d'un objet (clones successifs).
   * @param objectId - ID de l'objet
   * @returns IDs des ancêtres
   */
  getAncestors: (objectId: string) => string[];
  /**
   * Récupère tous les descendants d'un objet (clones).
   * @param objectId - ID de l'objet
   * @returns IDs des descendants
   */
  getDescendants: (objectId: string) => string[];
  /**
   * Clone un noeud avec traçabilité du lignage.
   * @param sourceId - ID du noeud source
   * @returns ID du clone créé (null si échec)
   */
  cloneWithLineage: (sourceId: string) => Promise<string | null>;
  /**
   * Récupère tous les événements concernant un objet.
   * @param objectId - ID de l'objet
   * @returns Liste des événements
   */
  getEventsForObject: (objectId: string) => HistoryEvent[];
  /**
   * Récupère les événements dans une plage temporelle.
   * @param startTime - Timestamp de début
   * @param endTime - Timestamp de fin
   * @returns Liste des événements
   */
  getEventsBetween: (startTime: number, endTime: number) => HistoryEvent[];
  /**
   * Récupère tous les événements d'un type donné.
   * @param type - Type d'événement
   * @returns Liste des événements
   */
  getEventsByType: (type: EventType) => HistoryEvent[];
  /**
   * Exporte l'historique complet en JSON.
   * @returns JSON de l'historique
   */
  exportHistory: () => string;
  /**
   * Exporte le lignage d'un objet en JSON.
   * @param objectId - ID de l'objet
   * @returns JSON du lignage (null si non trouvé)
   */
  exportLineage: (objectId: string) => string | null;
  /**
   * Vide complètement l'historique.
   */
  clearHistory: () => void;
  /**
   * Nettoie les événements anciens en conservant les N derniers.
   * @param keepLast - Nombre d'événements à conserver
   * @returns Nombre d'événements supprimés
   */
  pruneOldEvents: (keepLast: number) => number;
}

/**
 * Trait permettant de tracer l'historique complet des modifications avec Event Sourcing.
 *
 * Implémente un système de lignage d'objets pour tracer les clones et dérivations,
 * avec support du rollback et de l'export pour audit.
 *
 * @param options - Configuration du trait
 * @returns État réactif et handlers pour la gestion de l'historique
 *
 * @example
 * ```typescript
 * const { recordEvent, rollbackLastEvent, exportHistory } = useHistorable({
 *   maxHistory: 500
 * });
 * recordEvent(EventType.NodeUpdated, 'node-123', 'node', oldData, newData);
 * ```
 */
export function useHistorable(options: HistorableOptions = {}): HistorableState & HistorableHandlers {
  const graphStore = useGraphStore();

  if (options.maxHistory) {
    maxEvents.value = options.maxHistory;
  }

  // État calculé pour un objet spécifique
  const objectLineage = computed((): ObjectLineage | null => {
    if (!options.nodeId) return null;
    return lineages.value.get(options.nodeId.value) ?? null;
  });

  const objectHistory = computed((): HistoryEvent[] => {
    if (!options.nodeId) return [];
    return events.value.filter(e => e.targetId === options.nodeId!.value);
  });

  const currentVersion = computed((): number => {
    const lineage = objectLineage.value;
    if (!lineage) return 0;
    return lineage.versions.length;
  });

  // Enregistre un événement
  function recordEvent(
    type: EventType,
    targetId: string,
    targetType: 'node' | 'edge' | 'group' | 'diagram',
    before?: unknown,
    after?: unknown,
    metadata?: HistoryEvent['metadata']
  ): string {
    const eventId = nanoid();

    const event: HistoryEvent = {
      id: eventId,
      type,
      timestamp: Date.now(),
      targetId,
      targetType,
      before: before ? JSON.parse(JSON.stringify(before)) : undefined,
      after: after ? JSON.parse(JSON.stringify(after)) : undefined,
      metadata: {
        ...metadata,
        batchId: currentBatchId.value ?? undefined,
      },
    };

    events.value.push(event);

    // Limiter la taille
    if (events.value.length > maxEvents.value) {
      events.value = events.value.slice(-maxEvents.value);
    }

    // Mettre à jour le lignage si c'est un node ou edge
    if (targetType === 'node' || targetType === 'edge') {
      updateLineage(targetId, targetType, type, eventId, before, after);
    }

    return eventId;
  }

  // Met à jour le lignage d'un objet
  function updateLineage(
    objectId: string,
    objectType: 'node' | 'edge',
    eventType: EventType,
    eventId: string,
    beforeRaw?: unknown,
    afterRaw?: unknown
  ) {
    // Les snapshots sont des objets de données arbitraires : on les indexe par
    // clé pour le diff, d'où le typage Record plutôt que unknown opaque.
    const before = beforeRaw as Record<string, unknown> | undefined;
    const after = afterRaw as Record<string, unknown> | undefined;
    let lineage = lineages.value.get(objectId);

    // Créer le lignage si nouveau
    if (!lineage) {
      lineage = {
        objectId,
        objectType,
        createdAt: Date.now(),
        origin: {
          type: eventType === EventType.NodeCloned ? 'cloned' : 'created',
          sourceId: after?.clonedFrom as string | undefined,
        },
        versions: [],
        descendants: [],
      };
      lineages.value.set(objectId, lineage);
    }

    // Ajouter la version
    const changes: string[] = [];
    if (before && after) {
      // Détecter les changements
      for (const key of Object.keys(after)) {
        if (JSON.stringify(before[key]) !== JSON.stringify(after[key])) {
          changes.push(key);
        }
      }
    }

    lineage.versions.push({
      version: lineage.versions.length + 1,
      timestamp: Date.now(),
      eventId,
      changes,
    });

    // Si c'est un clone, enregistrer dans le parent
    if (typeof after?.clonedFrom === 'string') {
      const parentLineage = lineages.value.get(after.clonedFrom);
      if (parentLineage && !parentLineage.descendants.includes(objectId)) {
        parentLineage.descendants.push(objectId);
      }
    }
  }

  // Démarre un batch d'événements
  function startBatch(_reason?: string): string {
    currentBatchId.value = nanoid();
    return currentBatchId.value;
  }

  function endBatch() {
    currentBatchId.value = null;
  }

  // Rollback vers un événement spécifique
  function rollbackToEvent(eventId: string): boolean {
    const eventIndex = events.value.findIndex(e => e.id === eventId);
    if (eventIndex === -1) return false;

    const event = events.value[eventIndex];
    if (!event.before) return false;

    // Restaurer l'état précédent
    if (event.targetType === 'node' && graphStore.nodes[event.targetId]) {
      graphStore.updateNode(event.targetId, event.before);
      recordEvent(
        EventType.Undo,
        event.targetId,
        'node',
        event.after,
        event.before,
        { reason: `Rollback to event ${eventId}`, parentEventId: eventId }
      );
      return true;
    }

    return false;
  }

  // Rollback le dernier événement
  function rollbackLastEvent(): boolean {
    const lastEvent = events.value[events.value.length - 1];
    if (!lastEvent || lastEvent.type === EventType.Undo) return false;
    return rollbackToEvent(lastEvent.id);
  }

  // Rollback un objet à une version spécifique
  function rollbackObject(objectId: string, version: number): boolean {
    const lineage = lineages.value.get(objectId);
    if (!lineage || version < 1 || version > lineage.versions.length) return false;

    const targetVersion = lineage.versions[version - 1];
    const event = events.value.find(e => e.id === targetVersion.eventId);

    if (event?.before) {
      graphStore.updateNode(objectId, event.before);
      recordEvent(
        EventType.Undo,
        objectId,
        'node',
        null,
        event.before,
        { reason: `Rollback to version ${version}` }
      );
      return true;
    }

    return false;
  }

  // Récupère le lignage d'un objet
  function getLineage(objectId: string): ObjectLineage | null {
    return lineages.value.get(objectId) ?? null;
  }

  // Récupère les ancêtres (chaîne de clones)
  function getAncestors(objectId: string): string[] {
    const ancestors: string[] = [];
    let currentId = objectId;

    while (currentId) {
      const lineage = lineages.value.get(currentId);
      if (!lineage?.origin.sourceId) break;
      ancestors.push(lineage.origin.sourceId);
      currentId = lineage.origin.sourceId;
    }

    return ancestors;
  }

  // Récupère tous les descendants
  function getDescendants(objectId: string): string[] {
    const descendants: string[] = [];
    const toVisit = [objectId];

    while (toVisit.length > 0) {
      const current = toVisit.pop()!;
      const lineage = lineages.value.get(current);

      if (lineage) {
        for (const descId of lineage.descendants) {
          if (!descendants.includes(descId)) {
            descendants.push(descId);
            toVisit.push(descId);
          }
        }
      }
    }

    return descendants;
  }

  // Clone un noeud avec suivi du lignage
  async function cloneWithLineage(sourceId: string): Promise<string | null> {
    const sourceNode = graphStore.nodes[sourceId];
    if (!sourceNode) return null;

    // Créer le clone
    const clonedNode = await graphStore.createNode(
      {
        type: sourceNode.type,
        geometry: {
          ...sourceNode.geometry,
          x: sourceNode.geometry.x + 20,
          y: sourceNode.geometry.y + 20,
        },
        styling: { ...sourceNode.styling },
        data: {
          ...sourceNode.data,
          clonedFrom: sourceId,
          clonedAt: Date.now(),
        },
      },
      sourceNode.parentId
    );

    // Enregistrer l'événement avec lignage
    recordEvent(
      EventType.NodeCloned,
      clonedNode.id,
      'node',
      null,
      { ...clonedNode, clonedFrom: sourceId },
      { reason: `Cloned from ${sourceId}` }
    );

    return clonedNode.id;
  }

  // Requêtes
  function getEventsForObject(objectId: string): HistoryEvent[] {
    return events.value.filter(e => e.targetId === objectId);
  }

  function getEventsBetween(startTime: number, endTime: number): HistoryEvent[] {
    return events.value.filter(
      e => e.timestamp >= startTime && e.timestamp <= endTime
    );
  }

  function getEventsByType(type: EventType): HistoryEvent[] {
    return events.value.filter(e => e.type === type);
  }

  // Export
  function exportHistory(): string {
    return JSON.stringify(
      {
        events: events.value,
        lineages: Array.from(lineages.value.entries()),
        exportedAt: Date.now(),
      },
      null,
      2
    );
  }

  function exportLineage(objectId: string): string | null {
    const lineage = lineages.value.get(objectId);
    if (!lineage) return null;

    const relatedEvents = getEventsForObject(objectId);
    const ancestors = getAncestors(objectId);
    const descendants = getDescendants(objectId);

    return JSON.stringify(
      {
        lineage,
        events: relatedEvents,
        ancestors,
        descendants,
        exportedAt: Date.now(),
      },
      null,
      2
    );
  }

  // Nettoyage
  function clearHistory() {
    events.value = [];
    lineages.value.clear();
  }

  function pruneOldEvents(keepLast: number): number {
    const originalLength = events.value.length;
    if (originalLength <= keepLast) return 0;

    events.value = events.value.slice(-keepLast);
    return originalLength - keepLast;
  }

  return {
    events: computed(() => events.value),
    objectLineage,
    objectHistory,
    currentVersion,
    recordEvent,
    startBatch,
    endBatch,
    rollbackToEvent,
    rollbackLastEvent,
    rollbackObject,
    getLineage,
    getAncestors,
    getDescendants,
    cloneWithLineage,
    getEventsForObject,
    getEventsBetween,
    getEventsByType,
    exportHistory,
    exportLineage,
    clearHistory,
    pruneOldEvents,
  };
}

// État global pour debug et persistance
export function useHistoryState() {
  return {
    events,
    lineages,
    stats: computed(() => ({
      totalEvents: events.value.length,
      totalObjects: lineages.value.size,
      eventsByType: events.value.reduce((acc, e) => {
        acc[e.type] = (acc[e.type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
    })),
    saveToStorage: () => {
      localStorage.setItem('holon-history', JSON.stringify(events.value));
      localStorage.setItem(
        'holon-lineages',
        JSON.stringify(Array.from(lineages.value.entries()))
      );
    },
    loadFromStorage: () => {
      try {
        const savedEvents = localStorage.getItem('holon-history');
        if (savedEvents) {
          events.value = JSON.parse(savedEvents);
        }
        const savedLineages = localStorage.getItem('holon-lineages');
        if (savedLineages) {
          lineages.value = new Map(JSON.parse(savedLineages));
        }
      } catch {
        // Ignorer les erreurs
      }
    },
  };
}
