
<!-- src/components/ui/ContextMenu.vue -->
<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref, nextTick } from 'vue';

export interface ContextMenuItem {
  label: string;
  shortcut?: string;
  icon?: string;
  disabled?: boolean;
  danger?: boolean;
  separator?: boolean;
  action?: () => void;
}

interface Props {
  x: number;
  y: number;
  items: ContextMenuItem[];
}

const props = defineProps<Props>();
const emit = defineEmits<{ (e: 'close'): void }>();

const root = ref<HTMLDivElement | null>(null);
const adjustedX = ref(props.x);
const adjustedY = ref(props.y);

function handleItemClick(item: ContextMenuItem) {
  if (item.disabled || item.separator) return;
  item.action?.();
  emit('close');
}

function handleOutsideClick(event: MouseEvent) {
  if (!root.value) return;
  if (!root.value.contains(event.target as Node)) emit('close');
}

function handleKey(event: KeyboardEvent) {
  if (event.key === 'Escape') emit('close');
}

onMounted(async () => {
  // Décaler si le menu déborde de la fenêtre.
  await nextTick();
  const el = root.value;
  if (el) {
    const rect = el.getBoundingClientRect();
    if (rect.right > window.innerWidth) {
      adjustedX.value = Math.max(0, window.innerWidth - rect.width - 4);
    }
    if (rect.bottom > window.innerHeight) {
      adjustedY.value = Math.max(0, window.innerHeight - rect.height - 4);
    }
  }
  // Écouteurs hors composant : clic n'importe où pour fermer, Échap.
  window.addEventListener('mousedown', handleOutsideClick, true);
  window.addEventListener('keydown', handleKey);
});

onBeforeUnmount(() => {
  window.removeEventListener('mousedown', handleOutsideClick, true);
  window.removeEventListener('keydown', handleKey);
});
</script>

<template>
  <div
    ref="root"
    class="context-menu fixed z-50 bg-white border border-gray-300 rounded-md shadow-lg py-1 min-w-[200px] text-sm"
    :style="{ left: adjustedX + 'px', top: adjustedY + 'px' }"
    @contextmenu.prevent
  >
    <template v-for="(item, i) in items" :key="i">
      <div
        v-if="item.separator"
        class="my-1 border-t border-gray-200"
      />
      <button
        v-else
        :disabled="item.disabled"
        class="w-full flex items-center justify-between px-3 py-1.5 text-left hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
        :class="{ 'text-red-600 hover:bg-red-50': item.danger }"
        @click="handleItemClick(item)"
      >
        <span class="flex items-center gap-2">
          <span v-if="item.icon" class="w-4 inline-block text-center">{{ item.icon }}</span>
          <span>{{ item.label }}</span>
        </span>
        <span v-if="item.shortcut" class="text-xs text-gray-400 ml-4">{{ item.shortcut }}</span>
      </button>
    </template>
  </div>
</template>
