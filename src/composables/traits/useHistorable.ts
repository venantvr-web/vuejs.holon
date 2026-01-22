// src/composables/traits/useHistorable.ts
// Event Sourcing & Object Lineage pour traçabilité complète
import { ref, computed, type Ref } from 'vue';
import { useGraphStore } from '../../stores/graph';
import { nanoid } from 'nanoid';
import type { Node, Edge } from '../../types';

// Types d'événements
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

// Structure d'un événement
export interface HistoryEvent {
  id: string;
  type: EventType;
  timestamp: number;
  // L'objet concerné
  targetId: string;
  targetType: 'node' | 'edge' | 'group' | 'diagram';
  // Données avant/après pour rollback
  before?: any;
  after?: any;
  // Métadonnées
  metadata?: {
    user?: string;
    reason?: string;
    parentEventId?: string; // Pour les événements liés
    batchId?: string; // Pour grouper les événements d'une même action
  };
  // Lignage
  lineage?: {
    clonedFrom?: string; // ID de l'objet source si clone
    derivedFrom?: string[]; // IDs des objets sources si dérivé
    version?: number; // Version de l'objet
  };
}

// Structure de lignage d'un objet
export interface ObjectLineage {
  objectId: string;
  objectType: 'node' | 'edge';
  createdAt: number;
  createdBy?: string;
  // Origine
  origin: {
    type: 'created' | 'cloned' | 'imported' | 'derived';
    sourceId?: string; // Si cloned ou derived
    sourceIds?: string[]; // Si derived de plusieurs
  };
  // Historique des versions
  versions: {
    version: number;
    timestamp: number;
    eventId: string;
    changes: string[]; // Description des changements
  }[];
  // Descendants (clones)
  descendants: string[];
}

// État global
const events = ref<HistoryEvent[]>([]);
const lineages = ref<Map<string, ObjectLineage>>(new Map());
const currentBatchId = ref<string | null>(null);
const maxEvents = ref(1000);

export interface HistorableOptions {
  nodeId?: Ref<string>;
  maxHistory?: number;
}

export interface HistorableState {
  events: Ref<HistoryEvent[]>;
  objectLineage: Ref<ObjectLineage | null>;
  objectHistory: Ref<HistoryEvent[]>;
  currentVersion: Ref<number>;
}

export interface HistorableHandlers {
  // Enregistrement d'événements
  recordEvent: (
    type: EventType,
    targetId: string,
    targetType: 'node' | 'edge' | 'group' | 'diagram',
    before?: any,
    after?: any,
    metadata?: HistoryEvent['metadata']
  ) => string;

  // Batch d'événements
  startBatch: (reason?: string) => string;
  endBatch: () => void;

  // Rollback
  rollbackToEvent: (eventId: string) => boolean;
  rollbackLastEvent: () => boolean;
  rollbackObject: (objectId: string, version: number) => boolean;

  // Lignage
  getLineage: (objectId: string) => ObjectLineage | null;
  getAncestors: (objectId: string) => string[];
  getDescendants: (objectId: string) => string[];
  cloneWithLineage: (sourceId: string) => Promise<string | null>;

  // Requêtes
  getEventsForObject: (objectId: string) => HistoryEvent[];
  getEventsBetween: (startTime: number, endTime: number) => HistoryEvent[];
  getEventsByType: (type: EventType) => HistoryEvent[];

  // Export
  exportHistory: () => string;
  exportLineage: (objectId: string) => string | null;

  // Nettoyage
  clearHistory: () => void;
  pruneOldEvents: (keepLast: number) => number;
}

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
    before?: any,
    after?: any,
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
    before?: any,
    after?: any
  ) {
    let lineage = lineages.value.get(objectId);

    // Créer le lignage si nouveau
    if (!lineage) {
      lineage = {
        objectId,
        objectType,
        createdAt: Date.now(),
        origin: {
          type: eventType === EventType.NodeCloned ? 'cloned' : 'created',
          sourceId: after?.clonedFrom,
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
    if (after?.clonedFrom) {
      const parentLineage = lineages.value.get(after.clonedFrom);
      if (parentLineage && !parentLineage.descendants.includes(objectId)) {
        parentLineage.descendants.push(objectId);
      }
    }
  }

  // Démarre un batch d'événements
  function startBatch(reason?: string): string {
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
        style: { ...sourceNode.style },
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
