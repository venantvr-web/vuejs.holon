<!-- src/components/ui/ConfirmHost.vue -->
<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useConfirm } from '../../composables/useConfirm'
import { useI18n } from '../../composables/useI18n'

/**
 * Hôte unique du système de confirmation modale (`useConfirm`), monté une seule
 * fois dans `App.vue`. Remplace `window.confirm` par une boîte thémée et
 * accessible :
 *
 * - **Thème** : surfaces et boutons pilotés par les variables CSS de l'app.
 * - **Accessibilité** : `role="dialog"` + `aria-modal`, libellé et description
 *   liés via `aria-labelledby`/`aria-describedby`, focus déplacé sur le bouton
 *   de confirmation à l'ouverture et piégé dans la boîte (Tab cyclique).
 * - **Clavier** : Échap annule, Entrée confirme.
 * - **Restauration du focus** : l'élément actif avant ouverture retrouve le
 *   focus à la fermeture.
 */
const { activeConfirm, respond } = useConfirm()
const { t } = useI18n()

const dialogRef = ref<HTMLElement | null>(null)
const confirmBtnRef = ref<HTMLButtonElement | null>(null)
/** Élément à re-focaliser après fermeture (déclencheur d'origine). */
let previouslyFocused: HTMLElement | null = null

const visible = computed(() => activeConfirm.value !== null)

const confirmLabel = computed(() => activeConfirm.value?.confirmLabel ?? t('common.confirm'))
const cancelLabel = computed(() => activeConfirm.value?.cancelLabel ?? t('common.cancel'))
const isDanger = computed(() => activeConfirm.value?.tone === 'danger')

watch(activeConfirm, async (next) => {
  if (next) {
    previouslyFocused = document.activeElement as HTMLElement | null
    await nextTick()
    confirmBtnRef.value?.focus()
  } else if (previouslyFocused) {
    // Rendre le focus au déclencheur pour ne pas le perdre dans le vide.
    previouslyFocused.focus()
    previouslyFocused = null
  }
})

function handleKeydown(event: KeyboardEvent) {
  if (!activeConfirm.value) return

  if (event.key === 'Escape') {
    event.preventDefault()
    respond(false)
    return
  }

  if (event.key === 'Enter') {
    event.preventDefault()
    respond(true)
    return
  }

  // Piège à focus : Tab reste dans la boîte (deux boutons focusables).
  if (event.key === 'Tab') {
    const focusables = dialogRef.value?.querySelectorAll<HTMLElement>('button')
    if (!focusables || focusables.length === 0) return
    const first = focusables[0]
    const last = focusables[focusables.length - 1]
    const active = document.activeElement
    if (event.shiftKey && active === first) {
      event.preventDefault()
      last.focus()
    } else if (!event.shiftKey && active === last) {
      event.preventDefault()
      first.focus()
    }
  }
}

onMounted(() => window.addEventListener('keydown', handleKeydown))
onBeforeUnmount(() => window.removeEventListener('keydown', handleKeydown))
</script>

<template>
  <Teleport to="body">
    <div v-if="visible" class="confirm-overlay" @mousedown.self="respond(false)">
      <div
        ref="dialogRef"
        role="dialog"
        aria-modal="true"
        :aria-labelledby="activeConfirm?.title ? 'confirm-title' : undefined"
        aria-describedby="confirm-message"
        class="confirm-dialog app-surface app-fg border app-border"
      >
        <h2 v-if="activeConfirm?.title" id="confirm-title" class="confirm-title">
          {{ activeConfirm.title }}
        </h2>
        <p id="confirm-message" class="confirm-message app-muted">
          {{ activeConfirm?.message }}
        </p>
        <div class="confirm-actions">
          <button type="button" class="px-3 py-1.5 text-sm app-btn rounded" @click="respond(false)">
            {{ cancelLabel }}
          </button>
          <button
            ref="confirmBtnRef"
            type="button"
            class="px-3 py-1.5 text-sm rounded"
            :class="isDanger ? 'app-btn-danger' : 'app-btn'"
            @click="respond(true)"
          >
            {{ confirmLabel }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.confirm-overlay {
  position: fixed;
  inset: 0;
  z-index: 10000;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.4);
}
.confirm-dialog {
  width: min(90vw, 26rem);
  padding: 1.25rem;
  border-radius: 10px;
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.25);
}
.confirm-title {
  font-size: 1rem;
  font-weight: 600;
  margin-bottom: 0.5rem;
}
.confirm-message {
  font-size: 0.875rem;
  line-height: 1.45;
  white-space: pre-line;
}
.confirm-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  margin-top: 1.25rem;
}
</style>
