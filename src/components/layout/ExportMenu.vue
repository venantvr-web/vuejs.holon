<!-- src/components/layout/ExportMenu.vue -->
<script setup lang="ts">
import { ref } from 'vue'
import { ChevronDown, Download, Loader2 } from 'lucide-vue-next'
import { useExportable } from '../../composables/traits/useExportable'

const { exportAsPNG, exportAsSVG, exportAsPDF, exportAsJSON, downloadFile, downloadText } =
  useExportable()

const isOpen = ref(false)
const isBusy = ref(false)
const status = ref<string | null>(null)

function stamp(): string {
  const d = new Date()
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}-${String(d.getHours()).padStart(2, '0')}${String(d.getMinutes()).padStart(2, '0')}`
}

async function doExport(fn: () => Promise<void> | void, label: string) {
  isBusy.value = true
  status.value = `Export ${label}…`
  try {
    await fn()
    status.value = `✓ ${label} exporté`
  } catch (e) {
    console.error(e)
    status.value = `✗ Erreur : ${(e as Error).message}`
  } finally {
    isBusy.value = false
    isOpen.value = false
    setTimeout(() => {
      status.value = null
    }, 2500)
  }
}

// PNG — scale mappe à une résolution cible (96 DPI de base navigateur).
async function exportPng(scale: number, label: string) {
  await doExport(async () => {
    const blob = await exportAsPNG({ scale, quality: 1 })
    downloadFile(blob, `holon-${stamp()}.png`)
  }, `PNG ${label}`)
}

async function exportSvg() {
  await doExport(async () => {
    const blob = await exportAsSVG()
    downloadFile(blob, `holon-${stamp()}.svg`)
  }, 'SVG')
}

async function exportPdf() {
  await doExport(async () => {
    const blob = await exportAsPDF({ scale: 3, quality: 0.95 })
    downloadFile(blob, `holon-${stamp()}.pdf`)
  }, 'PDF')
}

function exportJson() {
  void doExport(() => {
    const json = exportAsJSON({ includeMetadata: true })
    downloadText(json, `holon-${stamp()}.json`, 'application/json')
  }, 'JSON')
}
</script>

<template>
  <div class="relative">
    <button
      @click="isOpen = !isOpen"
      :disabled="isBusy"
      class="app-btn-primary px-3 py-1.5 text-sm rounded transition-colors duration-150 inline-flex items-center gap-1.5"
      title="Exporter le diagramme"
      aria-label="Exporter le diagramme"
    >
      <Loader2 v-if="isBusy" :size="16" class="animate-spin" />
      <template v-else>
        <Download :size="16" />
        <span>Exporter</span>
        <ChevronDown :size="14" />
      </template>
    </button>
    <div
      v-if="isOpen"
      class="absolute top-full right-0 mt-1 app-surface border app-border rounded shadow-lg py-1 w-64 z-40 text-sm"
      @mouseleave="isOpen = false"
    >
      <div class="px-3 py-1 text-xs font-semibold app-subtle uppercase tracking-wide">
        Image raster
      </div>
      <button
        class="w-full text-left px-3 py-1.5 app-hover transition-colors duration-150"
        @click="exportPng(1, '96 DPI')"
      >
        PNG · Écran (96 DPI)
      </button>
      <button
        class="w-full text-left px-3 py-1.5 app-hover transition-colors duration-150"
        @click="exportPng(2, '200 DPI')"
      >
        PNG · Haute qualité (200 DPI)
      </button>
      <button
        class="w-full text-left px-3 py-1.5 app-hover transition-colors duration-150"
        @click="exportPng(3.125, '300 DPI')"
      >
        PNG · Impression (300 DPI)
      </button>

      <div class="my-1 border-t app-border"></div>
      <div class="px-3 py-1 text-xs font-semibold app-subtle uppercase tracking-wide">
        Vectoriel / Document
      </div>
      <button
        class="w-full text-left px-3 py-1.5 app-hover transition-colors duration-150"
        @click="exportSvg"
      >
        SVG
      </button>
      <button
        class="w-full text-left px-3 py-1.5 app-hover transition-colors duration-150"
        @click="exportPdf"
      >
        PDF
      </button>

      <div class="my-1 border-t app-border"></div>
      <div class="px-3 py-1 text-xs font-semibold app-subtle uppercase tracking-wide">Données</div>
      <button
        class="w-full text-left px-3 py-1.5 app-hover transition-colors duration-150"
        @click="exportJson"
      >
        JSON (v1.0, avec métadonnées)
      </button>
    </div>
    <div
      v-if="status"
      class="app-status-pill absolute top-full right-0 mt-1 px-3 py-1.5 text-xs z-50 whitespace-nowrap"
    >
      {{ status }}
    </div>
  </div>
</template>
