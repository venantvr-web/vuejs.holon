<!-- src/components/layout/ThemePicker.vue -->
<script setup lang="ts">
import { computed } from 'vue'
import { Moon, Sun } from 'lucide-vue-next'
import { useThemeable } from '../../composables/traits/useThemeable'
import { useI18n } from '../../composables/useI18n'

const { isDarkMode, toggleDarkMode } = useThemeable()
const { t } = useI18n()

const label = computed(() =>
  isDarkMode.value ? t('toolbar.tooltip.themeToLight') : t('toolbar.tooltip.themeToDark')
)
</script>

<template>
  <button
    @click="toggleDarkMode"
    class="px-2 py-1.5 text-sm app-btn rounded transition-colors duration-150 inline-flex items-center"
    v-tooltip="label"
    :aria-label="label"
  >
    <!-- Convention standard : l'icône montre le mode CIBLE (où cliquer mène).
         En Nuit → soleil (cliquer = retour au Jour).
         En Jour → lune (cliquer = aller en Nuit). -->
    <Sun v-if="isDarkMode" :size="16" />
    <Moon v-else :size="16" />
  </button>
</template>
