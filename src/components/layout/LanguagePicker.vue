
<!-- src/components/layout/LanguagePicker.vue -->
<script setup lang="ts">
import { ref } from 'vue';
import { useI18n, AVAILABLE_LOCALES, type Locale } from '../../composables/useI18n';

const { locale, setLocale } = useI18n();
const isOpen = ref(false);

function choose(v: Locale) {
  setLocale(v);
  isOpen.value = false;
}
</script>

<template>
  <div class="relative">
    <button
      @click="isOpen = !isOpen"
      class="px-2 py-1.5 text-sm app-btn rounded transition-colors"
      :title="`Langue : ${locale}`"
      aria-label="Choisir la langue"
    >
      🌐 {{ locale }}
    </button>
    <div
      v-if="isOpen"
      class="absolute top-full right-0 mt-1 app-surface border app-border rounded shadow-lg py-1 w-40 z-40 text-sm"
      @mouseleave="isOpen = false"
    >
      <button
        v-for="l in AVAILABLE_LOCALES"
        :key="l.value"
        class="w-full text-left px-3 py-1.5 app-hover flex items-center gap-2"
        :class="{ 'bg-blue-50 font-medium': locale === l.value }"
        @click="choose(l.value)"
      >
        <span>{{ l.flag }}</span>
        <span>{{ l.label }}</span>
      </button>
    </div>
  </div>
</template>
