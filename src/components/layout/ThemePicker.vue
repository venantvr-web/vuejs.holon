
<!-- src/components/layout/ThemePicker.vue -->
<script setup lang="ts">
import { ref } from 'vue';
import { useThemeable } from '../../composables/traits/useThemeable';

const { availableThemes, currentThemeId, setTheme, toggleDarkMode, isDarkMode } = useThemeable();
const isOpen = ref(false);

function choose(id: string) {
  setTheme(id);
  isOpen.value = false;
}
</script>

<template>
  <div class="relative">
    <button
      @click="isOpen = !isOpen"
      class="px-2 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded transition-colors"
      :title="`Thème : ${currentThemeId}`"
    >
      🎨
    </button>
    <div
      v-if="isOpen"
      class="absolute top-full right-0 mt-1 bg-white border border-gray-300 rounded shadow-lg py-1 w-48 z-40 text-sm"
      @mouseleave="isOpen = false"
    >
      <div class="px-3 py-1 text-xs font-semibold text-gray-500 uppercase">Thèmes</div>
      <button
        v-for="theme in availableThemes"
        :key="theme.id"
        class="w-full text-left px-3 py-1.5 hover:bg-gray-100 flex items-center gap-2"
        :class="{ 'bg-blue-50 font-medium': currentThemeId === theme.id }"
        @click="choose(theme.id)"
      >
        <span
          class="w-4 h-4 rounded border border-gray-300"
          :style="{ backgroundColor: theme.colors.primary }"
        />
        <span class="truncate">{{ theme.name }}</span>
      </button>

      <div class="my-1 border-t border-gray-200"></div>
      <button
        class="w-full text-left px-3 py-1.5 hover:bg-gray-100"
        @click="toggleDarkMode"
      >
        {{ isDarkMode ? '☀ Basculer en clair' : '🌙 Basculer en sombre' }}
      </button>
    </div>
  </div>
</template>
