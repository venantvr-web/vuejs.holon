<!-- src/components/layout/UserManualModal.vue -->
<script setup lang="ts">
import { computed, ref, onMounted, onBeforeUnmount } from 'vue'
import { ChevronLeft, ChevronRight, X } from 'lucide-vue-next'
import manualSource from '../../docs/user-manual.md?raw'
import { useI18n } from '../../composables/useI18n'

const { t } = useI18n()

const emit = defineEmits<{ (e: 'close'): void }>()

interface Section {
  title: string
  html: string
}

/**
 * Convertit un sous-ensemble de Markdown en HTML sans dépendance externe.
 * Couvre : h2/h3/h4, paragraphes, listes ordonnées et non ordonnées, bold,
 * italic, code inline. Suffisant pour le manuel utilisateur.
 */
function parseMarkdown(md: string): string {
  const escaped = md.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

  const lines = escaped.split('\n')
  const out: string[] = []
  let inList: 'ul' | 'ol' | null = null
  let paraBuf: string[] = []

  function flushPara() {
    if (paraBuf.length > 0) {
      out.push(`<p>${paraBuf.join(' ')}</p>`)
      paraBuf = []
    }
  }
  function closeList() {
    if (inList) {
      out.push(`</${inList}>`)
      inList = null
    }
  }

  for (const rawLine of lines) {
    const line = rawLine.trimEnd()

    // Empty line → separates paragraphs
    if (line === '') {
      flushPara()
      closeList()
      continue
    }

    // Headings
    const h4 = line.match(/^#### (.*)$/)
    if (h4) {
      flushPara()
      closeList()
      out.push(`<h4>${h4[1]}</h4>`)
      continue
    }
    const h3 = line.match(/^### (.*)$/)
    if (h3) {
      flushPara()
      closeList()
      out.push(`<h3>${h3[1]}</h3>`)
      continue
    }
    const h2 = line.match(/^## (.*)$/)
    if (h2) {
      flushPara()
      closeList()
      out.push(`<h2>${h2[1]}</h2>`)
      continue
    }

    // Unordered list
    const ul = line.match(/^- (.*)$/)
    if (ul) {
      flushPara()
      if (inList !== 'ul') {
        closeList()
        out.push('<ul>')
        inList = 'ul'
      }
      out.push(`<li>${formatInline(ul[1])}</li>`)
      continue
    }

    // Ordered list
    const ol = line.match(/^\d+\. (.*)$/)
    if (ol) {
      flushPara()
      if (inList !== 'ol') {
        closeList()
        out.push('<ol>')
        inList = 'ol'
      }
      out.push(`<li>${formatInline(ol[1])}</li>`)
      continue
    }

    // Paragraph line (accumulate across soft wraps)
    closeList()
    paraBuf.push(formatInline(line))
  }
  flushPara()
  closeList()
  return out.join('\n')
}

/** Met en forme l'inline : **bold**, _italic_ / *italic*, `code`. */
function formatInline(text: string): string {
  return text
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\b_([^_]+)_\b/g, '<em>$1</em>')
}

const sections = computed((): Section[] => {
  // Split par `^# ` (H1). Le split garde tout sauf les H1 ; on parse le reste.
  const parts = manualSource.split(/^# /gm).filter((p) => p.trim())
  return parts.map((part) => {
    const nlIdx = part.indexOf('\n')
    const title = nlIdx === -1 ? part.trim() : part.slice(0, nlIdx).trim()
    const body = nlIdx === -1 ? '' : part.slice(nlIdx + 1).trim()
    return { title, html: parseMarkdown(body) }
  })
})

const index = ref(0)
const current = computed(() => sections.value[index.value])
const total = computed(() => sections.value.length)
const canPrev = computed(() => index.value > 0)
const canNext = computed(() => index.value < total.value - 1)

function next() {
  if (canNext.value) index.value++
}
function prev() {
  if (canPrev.value) index.value--
}
function jumpTo(i: number) {
  index.value = Math.max(0, Math.min(i, total.value - 1))
}

function handleKey(e: KeyboardEvent) {
  if (e.key === 'Escape') emit('close')
  else if (e.key === 'ArrowRight') next()
  else if (e.key === 'ArrowLeft') prev()
}

onMounted(() => window.addEventListener('keydown', handleKey))
onBeforeUnmount(() => window.removeEventListener('keydown', handleKey))
</script>

<template>
  <div
    class="app-overlay fixed inset-0 z-50 flex items-center justify-center"
    @click.self="emit('close')"
  >
    <div
      class="app-surface border app-border rounded-lg shadow-xl w-[760px] max-h-[85vh] flex flex-col"
    >
      <!-- Header -->
      <header class="px-4 py-3 border-b app-border flex items-center justify-between">
        <div>
          <div class="text-xs font-semibold uppercase tracking-wide app-subtle">
            {{ t('manual.header') }}
          </div>
          <h2 class="text-lg font-semibold app-fg">{{ current?.title }}</h2>
        </div>
        <button
          @click="emit('close')"
          class="app-subtle hover:app-muted transition-colors duration-150"
          :aria-label="t('manual.closeAria')"
          v-tooltip="t('manual.closeTooltip')"
        >
          <X :size="18" />
        </button>
      </header>

      <!-- Liste des sections (chips navigables) -->
      <nav class="px-4 py-2 border-b app-border flex gap-1 overflow-x-auto flex-shrink-0">
        <button
          v-for="(s, i) in sections"
          :key="i"
          class="px-2 py-0.5 text-xs rounded whitespace-nowrap transition-colors"
          :class="i === index ? 'app-selected app-fg font-medium' : 'app-subtle app-hover'"
          @click="jumpTo(i)"
        >
          {{ s.title }}
        </button>
      </nav>

      <!-- Contenu -->
      <article
        class="user-manual-content flex-1 overflow-y-auto px-6 py-5"
        v-html="current?.html"
      />

      <!-- Footer navigation -->
      <footer class="px-4 py-3 border-t app-border flex items-center justify-between">
        <button
          @click="prev"
          :disabled="!canPrev"
          class="app-btn px-3 py-1.5 rounded text-sm flex items-center gap-1 transition-colors duration-150"
        >
          <ChevronLeft :size="16" />
          {{ t('manual.previous') }}
        </button>
        <span class="text-xs app-subtle font-mono"> {{ index + 1 }} / {{ total }} </span>
        <button
          @click="next"
          :disabled="!canNext"
          class="app-btn px-3 py-1.5 rounded text-sm flex items-center gap-1 transition-colors duration-150"
        >
          {{ t('manual.next') }}
          <ChevronRight :size="16" />
        </button>
      </footer>
    </div>
  </div>
</template>
