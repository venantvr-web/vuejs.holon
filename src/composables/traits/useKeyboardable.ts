// src/composables/traits/useKeyboardable.ts
import { ref, onMounted, onUnmounted, type Ref } from 'vue';
import { useGraphStore } from '../../stores/graph';
import { useSelectionState } from './useSelectable';
import { useUndoable } from './useUndoable';

export interface KeyboardShortcut {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  meta?: boolean;
  action: () => void;
  description: string;
  category: string;
}

export interface KeyboardableOptions {
  enabled?: Ref<boolean>;
  customShortcuts?: KeyboardShortcut[];
}

export interface KeyboardableState {
  isEnabled: Ref<boolean>;
  shortcuts: Ref<KeyboardShortcut[]>;
}

export interface KeyboardableHandlers {
  enable: () => void;
  disable: () => void;
  addShortcut: (shortcut: KeyboardShortcut) => void;
  removeShortcut: (key: string) => void;
  getShortcutsByCategory: () => Record<string, KeyboardShortcut[]>;
}

// État global des raccourcis
const globalShortcuts = ref<KeyboardShortcut[]>([]);
const isGlobalEnabled = ref(true);

export function useKeyboardable(options: KeyboardableOptions = {}): KeyboardableState & KeyboardableHandlers {
  const graphStore = useGraphStore();
  const { selectedNodeIds, clearSelection, deleteSelected } = useSelectionState();
  const { undo, redo, canUndo, canRedo } = useUndoable();

  const isEnabled = options.enabled ?? ref(true);

  // Raccourcis par défaut
  const defaultShortcuts: KeyboardShortcut[] = [
    // Édition
    {
      key: 'z',
      ctrl: true,
      action: () => canUndo.value && undo(),
      description: 'Annuler',
      category: 'Édition',
    },
    {
      key: 'z',
      ctrl: true,
      shift: true,
      action: () => canRedo.value && redo(),
      description: 'Rétablir',
      category: 'Édition',
    },
    {
      key: 'y',
      ctrl: true,
      action: () => canRedo.value && redo(),
      description: 'Rétablir',
      category: 'Édition',
    },
    {
      key: 'Delete',
      action: () => deleteSelected(),
      description: 'Supprimer sélection',
      category: 'Édition',
    },
    {
      key: 'Backspace',
      action: () => deleteSelected(),
      description: 'Supprimer sélection',
      category: 'Édition',
    },

    // Sélection
    {
      key: 'a',
      ctrl: true,
      action: () => {
        // Sélectionner tous les noeuds
        const allIds = Object.keys(graphStore.nodes);
        selectedNodeIds.value = new Set(allIds);
      },
      description: 'Tout sélectionner',
      category: 'Sélection',
    },
    {
      key: 'Escape',
      action: () => clearSelection(),
      description: 'Désélectionner tout',
      category: 'Sélection',
    },

    // Clipboard (placeholders - à implémenter avec useClipboardable)
    {
      key: 'c',
      ctrl: true,
      action: () => {
        // TODO: Implémenter avec useClipboardable
        console.log('Copy:', Array.from(selectedNodeIds.value));
      },
      description: 'Copier',
      category: 'Presse-papier',
    },
    {
      key: 'v',
      ctrl: true,
      action: () => {
        // TODO: Implémenter avec useClipboardable
        console.log('Paste');
      },
      description: 'Coller',
      category: 'Presse-papier',
    },
    {
      key: 'x',
      ctrl: true,
      action: () => {
        // TODO: Implémenter avec useClipboardable
        console.log('Cut:', Array.from(selectedNodeIds.value));
      },
      description: 'Couper',
      category: 'Presse-papier',
    },
    {
      key: 'd',
      ctrl: true,
      action: () => {
        // Dupliquer la sélection
        // TODO: Implémenter duplication
        console.log('Duplicate:', Array.from(selectedNodeIds.value));
      },
      description: 'Dupliquer',
      category: 'Presse-papier',
    },
  ];

  // Initialiser avec les raccourcis par défaut
  if (globalShortcuts.value.length === 0) {
    globalShortcuts.value = [...defaultShortcuts];
  }

  // Ajouter les raccourcis personnalisés
  if (options.customShortcuts) {
    for (const shortcut of options.customShortcuts) {
      addShortcut(shortcut);
    }
  }

  function handleKeyDown(event: KeyboardEvent) {
    if (!isEnabled.value || !isGlobalEnabled.value) return;

    // Ignorer si on est dans un champ de saisie
    const target = event.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
      return;
    }

    for (const shortcut of globalShortcuts.value) {
      const ctrlMatch = shortcut.ctrl ? (event.ctrlKey || event.metaKey) : !(event.ctrlKey || event.metaKey);
      const shiftMatch = shortcut.shift ? event.shiftKey : !event.shiftKey;
      const altMatch = shortcut.alt ? event.altKey : !event.altKey;

      if (
        event.key.toLowerCase() === shortcut.key.toLowerCase() &&
        ctrlMatch &&
        shiftMatch &&
        altMatch
      ) {
        event.preventDefault();
        shortcut.action();
        return;
      }
    }
  }

  function enable() {
    isEnabled.value = true;
  }

  function disable() {
    isEnabled.value = false;
  }

  function addShortcut(shortcut: KeyboardShortcut) {
    // Éviter les doublons
    const index = globalShortcuts.value.findIndex(
      s =>
        s.key === shortcut.key &&
        !!s.ctrl === !!shortcut.ctrl &&
        !!s.shift === !!shortcut.shift &&
        !!s.alt === !!shortcut.alt
    );

    if (index !== -1) {
      globalShortcuts.value[index] = shortcut;
    } else {
      globalShortcuts.value.push(shortcut);
    }
  }

  function removeShortcut(key: string) {
    globalShortcuts.value = globalShortcuts.value.filter(s => s.key !== key);
  }

  function getShortcutsByCategory(): Record<string, KeyboardShortcut[]> {
    const result: Record<string, KeyboardShortcut[]> = {};
    for (const shortcut of globalShortcuts.value) {
      if (!result[shortcut.category]) {
        result[shortcut.category] = [];
      }
      result[shortcut.category].push(shortcut);
    }
    return result;
  }

  onMounted(() => {
    window.addEventListener('keydown', handleKeyDown);
  });

  onUnmounted(() => {
    window.removeEventListener('keydown', handleKeyDown);
  });

  return {
    isEnabled,
    shortcuts: globalShortcuts,
    enable,
    disable,
    addShortcut,
    removeShortcut,
    getShortcutsByCategory,
  };
}

// Export pour le contrôle global
export function useGlobalKeyboard() {
  return {
    isEnabled: isGlobalEnabled,
    enable: () => {
      isGlobalEnabled.value = true;
    },
    disable: () => {
      isGlobalEnabled.value = false;
    },
    shortcuts: globalShortcuts,
  };
}

// Helper pour formater un raccourci en string lisible
export function formatShortcut(shortcut: KeyboardShortcut): string {
  const parts: string[] = [];
  if (shortcut.ctrl) parts.push('Ctrl');
  if (shortcut.shift) parts.push('Shift');
  if (shortcut.alt) parts.push('Alt');
  parts.push(shortcut.key === ' ' ? 'Space' : shortcut.key);
  return parts.join('+');
}
