<!-- src/components/layout/ExportMenu.vue -->
<script setup lang="ts">
import { ref } from 'vue'
import { ChevronDown, Download, Loader2 } from 'lucide-vue-next'
import { useExportable } from '../../composables/traits/useExportable'
import { useI18n } from '../../composables/useI18n'

const { t } = useI18n()
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
  status.value = t('export.exporting', { format: label })
  try {
    await fn()
    status.value = t('export.success', { format: label })
  } catch (e) {
    // L'erreur est déjà remontée à l'utilisateur via `status` ; on garde une
    // trace dans la console navigateur pour le diagnostic, avec préfixe.
    console.error('[ExportMenu] échec export', e)
    status.value = t('export.error', { message: (e as Error).message })
  } finally {
    isBusy.value = false
    isOpen.value = false
    setTimeout(() => {
      status.value = null
    }, 2500)
  }
}

// PNG — scale mappe à une résolution cible (96 DPI de base navigateur).
async function exportPng(scale: number, labelKey: string) {
  await doExport(async () => {
    const blob = await exportAsPNG({ scale, quality: 1 })
    downloadFile(blob, `holon-${stamp()}.png`)
  }, t(labelKey))
}

async function exportSvg() {
  await doExport(async () => {
    const blob = await exportAsSVG()
    downloadFile(blob, `holon-${stamp()}.svg`)
  }, t('export.label.svg'))
}

async function exportPdf() {
  await doExport(async () => {
    const blob = await exportAsPDF({ scale: 3, quality: 0.95 })
    downloadFile(blob, `holon-${stamp()}.pdf`)
  }, t('export.label.pdf'))
}

function exportJson() {
  void doExport(() => {
    const json = exportAsJSON({ includeMetadata: true })
    downloadText(json, `holon-${stamp()}.json`, 'application/json')
  }, t('export.label.json'))
}
</script>

<template>
  <div class="relative">
    <button
      @click="isOpen = !isOpen"
      :disabled="isBusy"
      class="app-btn-primary px-3 py-1.5 text-sm rounded transition-colors duration-150 inline-flex items-center gap-1.5"
      v-tooltip="t('toolbar.tooltip.export')"
      :aria-label="t('toolbar.tooltip.export')"
    >
      <Loader2 v-if="isBusy" :size="16" class="animate-spin" />
      <template v-else>
        <Download :size="16" />
        <span>{{ t('toolbar.export') }}</span>
        <ChevronDown :size="14" />
      </template>
    </button>
    <div
      v-if="isOpen"
      class="absolute top-full right-0 mt-1 app-surface border app-border rounded shadow-lg py-1 w-64 z-40 text-sm"
      @mouseleave="isOpen = false"
    >
      <div class="px-3 py-1 text-xs font-semibold app-subtle uppercase tracking-wide">
        {{ t('export.section.raster') }}
      </div>
      <button
        class="w-full text-left px-3 py-1.5 app-hover transition-colors duration-150"
        @click="exportPng(1, 'export.label.png96')"
      >
        {{ t('export.png96') }}
      </button>
      <button
        class="w-full text-left px-3 py-1.5 app-hover transition-colors duration-150"
        @click="exportPng(2, 'export.label.png200')"
      >
        {{ t('export.png200') }}
      </button>
      <button
        class="w-full text-left px-3 py-1.5 app-hover transition-colors duration-150"
        @click="exportPng(3.125, 'export.label.png300')"
      >
        {{ t('export.png300') }}
      </button>

      <div class="my-1 border-t app-border"></div>
      <div class="px-3 py-1 text-xs font-semibold app-subtle uppercase tracking-wide">
        {{ t('export.section.vector') }}
      </div>
      <button
        class="w-full text-left px-3 py-1.5 app-hover transition-colors duration-150"
        @click="exportSvg"
      >
        {{ t('export.svgLabel') }}
      </button>
      <button
        class="w-full text-left px-3 py-1.5 app-hover transition-colors duration-150"
        @click="exportPdf"
      >
        {{ t('export.pdfLabel') }}
      </button>

      <div class="my-1 border-t app-border"></div>
      <div class="px-3 py-1 text-xs font-semibold app-subtle uppercase tracking-wide">
        {{ t('export.section.data') }}
      </div>
      <button
        class="w-full text-left px-3 py-1.5 app-hover transition-colors duration-150"
        @click="exportJson"
      >
        {{ t('export.jsonLabel') }}
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
