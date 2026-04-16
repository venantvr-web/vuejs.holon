// src/composables/traits/useLockable.ts
import { computed, type Ref } from 'vue';
import { useGraphStore } from '../../stores/graph';

/**
 * Options de configuration pour le trait Lockable.
 */
export interface LockableOptions {
  /**
   * Référence réactive vers l'ID du noeud concerné.
   */
  nodeId: Ref<string>;
}

/**
 * État de verrouillage détaillé pour chaque aspect d'un noeud.
 */
export interface LockState {
  /**
   * Verrouillage de la position du noeud.
   */
  position: boolean;
  /**
   * Verrouillage de la taille du noeud.
   */
  size: boolean;
  /**
   * Verrouillage du style du noeud.
   */
  style: boolean;
  /**
   * Verrouillage du contenu du noeud.
   */
  content: boolean;
}

/**
 * État réactif exposé par le trait Lockable.
 */
export interface LockableState {
  /**
   * Indique si le noeud est verrouillé (au moins un aspect).
   */
  isLocked: Ref<boolean>;
  /**
   * Indique si la position est verrouillée.
   */
  isPositionLocked: Ref<boolean>;
  /**
   * Indique si la taille est verrouillée.
   */
  isSizeLocked: Ref<boolean>;
  /**
   * Indique si le style est verrouillé.
   */
  isStyleLocked: Ref<boolean>;
  /**
   * Indique si le contenu est verrouillé.
   */
  isContentLocked: Ref<boolean>;
  /**
   * État de verrouillage complet du noeud.
   */
  lockState: Ref<LockState>;
}

/**
 * Handlers (actions) exposés par le trait Lockable.
 */
export interface LockableHandlers {
  /**
   * Verrouille tous les aspects du noeud.
   */
  lock: () => void;
  /**
   * Déverrouille tous les aspects du noeud.
   */
  unlock: () => void;
  /**
   * Bascule l'état de verrouillage global.
   */
  toggleLock: () => void;
  /**
   * Verrouille uniquement la position.
   */
  lockPosition: () => void;
  /**
   * Déverrouille uniquement la position.
   */
  unlockPosition: () => void;
  /**
   * Verrouille uniquement la taille.
   */
  lockSize: () => void;
  /**
   * Déverrouille uniquement la taille.
   */
  unlockSize: () => void;
  /**
   * Verrouille uniquement le style.
   */
  lockStyle: () => void;
  /**
   * Déverrouille uniquement le style.
   */
  unlockStyle: () => void;
  /**
   * Verrouille uniquement le contenu.
   */
  lockContent: () => void;
  /**
   * Déverrouille uniquement le contenu.
   */
  unlockContent: () => void;
  /**
   * Définit un état de verrouillage personnalisé.
   * @param state - État de verrouillage partiel à appliquer
   */
  setLockState: (state: Partial<LockState>) => void;
}

/**
 * Trait permettant de verrouiller sélectivement différents aspects d'un noeud.
 *
 * Offre un contrôle granulaire sur ce qui peut être modifié : position, taille,
 * style ou contenu. Utile pour protéger certains éléments du diagramme.
 *
 * @param options - Configuration du trait
 * @returns État réactif et handlers pour la gestion du verrouillage
 *
 * @example
 * ```typescript
 * const { isLocked, lockPosition, unlock } = useLockable({ nodeId: ref('node-123') });
 * lockPosition(); // Verrouille uniquement la position
 * ```
 */
export function useLockable(options: LockableOptions): LockableState & LockableHandlers {
  const graphStore = useGraphStore();

  const lockState = computed((): LockState => {
    const node = graphStore.nodes[options.nodeId.value];
    return {
      position: node?.data?.locked?.position ?? false,
      size: node?.data?.locked?.size ?? false,
      style: node?.data?.locked?.style ?? false,
      content: node?.data?.locked?.content ?? false,
    };
  });

  const isLocked = computed(() => {
    const state = lockState.value;
    return state.position || state.size || state.style || state.content;
  });

  const isPositionLocked = computed(() => lockState.value.position);
  const isSizeLocked = computed(() => lockState.value.size);
  const isStyleLocked = computed(() => lockState.value.style);
  const isContentLocked = computed(() => lockState.value.content);

  function setLockState(state: Partial<LockState>) {
    const node = graphStore.nodes[options.nodeId.value];
    if (!node) return;

    const currentLock = node.data?.locked ?? {};
    const newLock = { ...currentLock, ...state };

    graphStore.updateNode(options.nodeId.value, {
      data: {
        ...node.data,
        locked: newLock,
      },
    });
  }

  function lock() {
    setLockState({ position: true, size: true, style: true, content: true });
  }

  function unlock() {
    setLockState({ position: false, size: false, style: false, content: false });
  }

  function toggleLock() {
    if (isLocked.value) {
      unlock();
    } else {
      lock();
    }
  }

  function lockPosition() {
    setLockState({ position: true });
  }

  function unlockPosition() {
    setLockState({ position: false });
  }

  function lockSize() {
    setLockState({ size: true });
  }

  function unlockSize() {
    setLockState({ size: false });
  }

  function lockStyle() {
    setLockState({ style: true });
  }

  function unlockStyle() {
    setLockState({ style: false });
  }

  function lockContent() {
    setLockState({ content: true });
  }

  function unlockContent() {
    setLockState({ content: false });
  }

  return {
    isLocked,
    isPositionLocked,
    isSizeLocked,
    isStyleLocked,
    isContentLocked,
    lockState,
    lock,
    unlock,
    toggleLock,
    lockPosition,
    unlockPosition,
    lockSize,
    unlockSize,
    lockStyle,
    unlockStyle,
    lockContent,
    unlockContent,
    setLockState,
  };
}
