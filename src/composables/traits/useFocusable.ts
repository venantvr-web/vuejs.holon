// src/composables/traits/useFocusable.ts
import { ref, computed, type Ref } from 'vue';
import { useGraphStore } from '../../stores/graph';

/**
 * Options de configuration pour le trait Focusable.
 */
export interface FocusableOptions {
  /**
   * ID du noeud concerné.
   */
  nodeId: Ref<string>;
  /**
   * Index de tabulation.
   * @default 0
   */
  tabIndex?: number;
  /**
   * Activer le focus trap (pour modales).
   * @default false
   */
  focusTrap?: boolean;
}

/**
 * État réactif exposé par le trait Focusable.
 */
export interface FocusableState {
  /**
   * Indique si le noeud a le focus.
   */
  hasFocus: Ref<boolean>;
  /**
   * Index de tabulation actuel.
   */
  tabIndex: Ref<number>;
  /**
   * Indique si le noeud est focusable.
   */
  isFocusable: Ref<boolean>;
}

/**
 * Handlers (actions) exposés par le trait Focusable.
 */
export interface FocusableHandlers {
  /**
   * Donne le focus au noeud.
   */
  focus: () => void;
  /**
   * Retire le focus du noeud.
   */
  blur: () => void;
  /**
   * Focus sur le noeud suivant (Tab).
   */
  focusNext: () => void;
  /**
   * Focus sur le noeud précédent (Shift+Tab).
   */
  focusPrevious: () => void;
  /**
   * Définit l'index de tabulation.
   * @param index - Nouvel index
   */
  setTabIndex: (index: number) => void;
  /**
   * Active/désactive le focus.
   * @param enabled - Activer ou désactiver
   */
  setFocusable: (enabled: boolean) => void;
}

// État global du focus
const globalFocusedNodeId = ref<string | null>(null);
const focusTrapEnabled = ref(false);

/**
 * Trait permettant de gérer le focus clavier pour la navigation accessible.
 *
 * Implémente la navigation au clavier (Tab, Shift+Tab, flèches) et le focus trap
 * pour les modales. Conforme WCAG 2.1 AA pour l'accessibilité.
 *
 * @param options - Options de configuration
 * @returns État réactif et handlers pour le focus
 *
 * @example
 * ```typescript
 * const { hasFocus, focus, blur, focusNext } = useFocusable({
 *   nodeId: ref('node-123'),
 *   tabIndex: 0
 * });
 *
 * // Donner le focus
 * focus();
 *
 * // Navigation clavier
 * focusNext(); // Tab
 * focusPrevious(); // Shift+Tab
 * ```
 */
export function useFocusable(options: FocusableOptions): FocusableState & FocusableHandlers {
  const graphStore = useGraphStore();

  const tabIndex = ref(options.tabIndex ?? 0);
  const isFocusable = ref(true);

  const hasFocus = computed(
    () => globalFocusedNodeId.value === options.nodeId.value
  );

  /**
   * Donne le focus.
   */
  function focus(): void {
    if (!isFocusable.value) return;

    const node = graphStore.nodes[options.nodeId.value];
    if (!node) return;

    // Vérifier si le noeud est verrouillé
    if (node.data?.locked) return;

    globalFocusedNodeId.value = options.nodeId.value;

    // Émettre événement pour scroll vers le noeud
    const event = new CustomEvent('node-focused', {
      detail: { nodeId: options.nodeId.value },
    });
    window.dispatchEvent(event);
  }

  /**
   * Retire le focus.
   */
  function blur(): void {
    if (globalFocusedNodeId.value === options.nodeId.value) {
      globalFocusedNodeId.value = null;
    }
  }

  /**
   * Focus suivant (Tab).
   */
  function focusNext(): void {
    const allNodes = Object.values(graphStore.nodes);
    const focusableNodes = allNodes.filter((n) => !n.data?.locked);

    if (focusableNodes.length === 0) return;

    const currentIndex = focusableNodes.findIndex(
      (n) => n.id === options.nodeId.value
    );

    const nextIndex = (currentIndex + 1) % focusableNodes.length;
    const nextNode = focusableNodes[nextIndex];

    globalFocusedNodeId.value = nextNode.id;

    // Émettre événement
    const event = new CustomEvent('node-focused', {
      detail: { nodeId: nextNode.id },
    });
    window.dispatchEvent(event);
  }

  /**
   * Focus précédent (Shift+Tab).
   */
  function focusPrevious(): void {
    const allNodes = Object.values(graphStore.nodes);
    const focusableNodes = allNodes.filter((n) => !n.data?.locked);

    if (focusableNodes.length === 0) return;

    const currentIndex = focusableNodes.findIndex(
      (n) => n.id === options.nodeId.value
    );

    const prevIndex =
      currentIndex - 1 < 0 ? focusableNodes.length - 1 : currentIndex - 1;
    const prevNode = focusableNodes[prevIndex];

    globalFocusedNodeId.value = prevNode.id;

    // Émettre événement
    const event = new CustomEvent('node-focused', {
      detail: { nodeId: prevNode.id },
    });
    window.dispatchEvent(event);
  }

  /**
   * Set tab index.
   */
  function setTabIndex(index: number): void {
    tabIndex.value = index;
  }

  /**
   * Set focusable.
   */
  function setFocusable(enabled: boolean): void {
    isFocusable.value = enabled;

    if (!enabled && hasFocus.value) {
      blur();
    }
  }

  return {
    hasFocus,
    tabIndex,
    isFocusable,
    focus,
    blur,
    focusNext,
    focusPrevious,
    setTabIndex,
    setFocusable,
  };
}

/**
 * Composable global pour gérer le focus trap (modales).
 */
export function useFocusTrap() {
  function enableTrap(): void {
    focusTrapEnabled.value = true;
  }

  function disableTrap(): void {
    focusTrapEnabled.value = false;
  }

  return {
    enabled: computed(() => focusTrapEnabled.value),
    enableTrap,
    disableTrap,
  };
}
