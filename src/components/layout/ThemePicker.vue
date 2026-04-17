
<!-- src/components/layout/ThemePicker.vue -->
<script setup lang="ts">
import { useThemeable } from '../../composables/traits/useThemeable';

const { isDarkMode, toggleDarkMode } = useThemeable();
</script>

<template>
  <button
    @click="toggleDarkMode"
    class="px-2 py-1.5 text-sm app-btn rounded transition-colors"
    :title="isDarkMode ? 'Passer en mode Jour' : 'Passer en mode Nuit'"
    :aria-label="isDarkMode ? 'Passer en mode Jour' : 'Passer en mode Nuit'"
  >
    <!-- Convention standard : l'icône montre le mode CIBLE (où cliquer mène).
         En Nuit → soleil (cliquer = retour au Jour).
         En Jour → lune (cliquer = aller en Nuit). -->
    {{ isDarkMode ? '☀️' : '🌙' }}
  </button>
</template>
