// src/composables/traits/useLockable.ts
import { computed, type Ref } from 'vue';
import { useGraphStore } from '../../stores/graph';

export interface LockableOptions {
  nodeId: Ref<string>;
}

export interface LockState {
  position: boolean;
  size: boolean;
  style: boolean;
  content: boolean;
}

export interface LockableState {
  isLocked: Ref<boolean>;
  isPositionLocked: Ref<boolean>;
  isSizeLocked: Ref<boolean>;
  isStyleLocked: Ref<boolean>;
  isContentLocked: Ref<boolean>;
  lockState: Ref<LockState>;
}

export interface LockableHandlers {
  lock: () => void;
  unlock: () => void;
  toggleLock: () => void;
  lockPosition: () => void;
  unlockPosition: () => void;
  lockSize: () => void;
  unlockSize: () => void;
  lockStyle: () => void;
  unlockStyle: () => void;
  lockContent: () => void;
  unlockContent: () => void;
  setLockState: (state: Partial<LockState>) => void;
}

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
