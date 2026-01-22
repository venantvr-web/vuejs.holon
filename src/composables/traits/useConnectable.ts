// src/composables/traits/useConnectable.ts
import { ref, type Ref } from 'vue';
import { useGraphStore } from '../../stores/graph';

export interface ConnectableOptions {
  nodeId: Ref<string>;
}

export interface ConnectableState {
  isConnectionSource: Ref<boolean>;
}

export interface ConnectableHandlers {
  startConnection: () => void;
  finishConnection: (targetId: string) => void;
  cancelConnection: () => void;
}

// État global pour la connexion en cours (partagé entre tous les noeuds)
const globalConnectionSource = ref<string | null>(null);
const globalConnectionMode = ref(false);

export function useConnectable(options: ConnectableOptions): ConnectableState & ConnectableHandlers & {
  connectionMode: Ref<boolean>;
  connectionSource: Ref<string | null>;
} {
  const graphStore = useGraphStore();

  const isConnectionSource = ref(false);

  function startConnection() {
    globalConnectionMode.value = true;
    globalConnectionSource.value = options.nodeId.value;
    isConnectionSource.value = true;
  }

  function finishConnection(targetId: string) {
    if (globalConnectionSource.value && globalConnectionSource.value !== targetId) {
      graphStore.createEdge(globalConnectionSource.value, targetId);
    }
    cancelConnection();
  }

  function cancelConnection() {
    globalConnectionMode.value = false;
    globalConnectionSource.value = null;
    isConnectionSource.value = false;
  }

  return {
    isConnectionSource,
    connectionMode: globalConnectionMode,
    connectionSource: globalConnectionSource,
    startConnection,
    finishConnection,
    cancelConnection,
  };
}

// Export des états globaux pour le canvas
export function useConnectionState() {
  return {
    connectionMode: globalConnectionMode,
    connectionSource: globalConnectionSource,
    cancelConnection: () => {
      globalConnectionMode.value = false;
      globalConnectionSource.value = null;
    },
  };
}
