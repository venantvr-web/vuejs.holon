// src/composables/traits/useKeyboardable.ts
import { ref, onMounted, onUnmounted, type Ref } from 'vue';
import { useGraphStore } from '../../stores/graph';
import { useSelectionState } from './useSelectable';
import { useUndoable } from './useUndoable';

/**
 * Définition d'un raccourci clavier.
 */
export interface KeyboardShortcut {
  /**
   * Touche principale du raccourci.
   */
  key: string;
  /**
   * Nécessite la touche Ctrl (ou Cmd sur Mac).
   */
  ctrl?: boolean;
  /**
   * Nécessite la touche Shift.
   */
  shift?: boolean;
  /**
   * Nécessite la touche Alt.
   */
  alt?: boolean;
  /**
   * Nécessite la touche Meta (Cmd sur Mac).
   */
  meta?: boolean;
  /**
   * Action à exécuter quand le raccourci est activé.
   */
  action: () => void;
  /**
   * Description lisible du raccourci.
   */
  description: string;
  /**
   * Catégorie pour organisation (Édition, Sélection, etc.).
   */
  category: string;
}

/**
 * Options de configuration pour le trait Keyboardable.
 */
export interface KeyboardableOptions {
  /**
   * État d'activation des raccourcis (défaut: true).
   */
  enabled?: Ref<boolean>;
  /**
   * Raccourcis personnalisés à ajouter.
   */
  customShortcuts?: KeyboardShortcut[];
}

/**
 * État réactif exposé par le trait Keyboardable.
 */
export interface KeyboardableState {
  /**
   * Indique si les raccourcis sont activés.
   */
  isEnabled: Ref<boolean>;
  /**
   * Liste de tous les raccourcis enregistrés.
   */
  shortcuts: Ref<KeyboardShortcut[]>;
}

/**
 * Handlers (actions) exposés par le trait Keyboardable.
 */
export interface KeyboardableHandlers {
  /**
   * Active les raccourcis clavier.
   */
  enable: () => void;
  /**
   * Désactive les raccourcis clavier.
   */
  disable: () => void;
  /**
   * Ajoute ou met à jour un raccourci clavier.
   * @param shortcut - Raccourci à ajouter
   */
  addShortcut: (shortcut: KeyboardShortcut) => void;
  /**
   * Retire un raccourci clavier.
   * @param key - Touche du raccourci à retirer
   */
  removeShortcut: (key: string) => void;
  /**
   * Récupère les raccourcis groupés par catégorie.
   * @returns Raccourcis organisés par catégorie
   */
  getShortcutsByCategory: () => Record<string, KeyboardShortcut[]>;
}

// État global des raccourcis
const globalShortcuts = ref<KeyboardShortcut[]>([]);
const isGlobalEnabled = ref(true);

/**
 * Trait permettant de gérer les raccourcis clavier globaux de l'application.
 *
 * Fournit des raccourcis par défaut (Ctrl+Z, Delete, Ctrl+A, etc.) et permet
 * l'ajout de raccourcis personnalisés. Ignore automatiquement les événements
 * dans les champs de saisie.
 *
 * @param options - Configuration du trait
 * @returns État réactif et handlers pour les raccourcis clavier
 *
 * @example
 * ```typescript
 * const { addShortcut, shortcuts } = useKeyboardable({
 *   customShortcuts: [{
 *     key: 'g',
 *     ctrl: true,
 *     action: () => console.log('Custom shortcut'),
 *     description: 'Mon raccourci',
 *     category: 'Personnalisé'
 *   }]
 * });
 * ```
 */
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
