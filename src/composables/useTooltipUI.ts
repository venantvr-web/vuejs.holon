// src/composables/useTooltipUI.ts
import { computed, ref, type ObjectDirective } from 'vue'

/**
 * Placement préféré du tooltip par rapport à la cible. Si la place manque
 * dans la direction demandée, l'hôte bascule automatiquement à l'opposé
 * (top ↔ bottom, left ↔ right).
 */
export type TooltipPlacement = 'top' | 'bottom' | 'left' | 'right'

/**
 * Options déclarables côté directive ou côté composable.
 */
export interface TooltipOptions {
  text: string
  placement?: TooltipPlacement
  /** Délai d'apparition (ms) après l'événement déclencheur. */
  delay?: number
}

/**
 * État partagé module-level d'un *unique* tooltip visible à la fois. La
 * sémantique « un seul tooltip rendu » colle au comportement attendu par les
 * lecteurs d'écran et évite les empilements visuels lors d'un déplacement
 * rapide entre boutons.
 */
interface ActiveTooltip {
  text: string
  placement: TooltipPlacement
  targetRect: { x: number; y: number; w: number; h: number }
  /** ID de la cible (pour aria-describedby + revoke). */
  targetKey: number
}

const activeTooltip = ref<ActiveTooltip | null>(null)

/**
 * ID stable injecté sur l'élément hôte (`<div role="tooltip">`). Permet aux
 * cibles d'utiliser `aria-describedby="holon-tooltip"` même quand l'élément
 * n'est pas visible : les lecteurs d'écran ignorent simplement la référence
 * orpheline si l'hôte est démonté.
 */
export const TOOLTIP_HOST_ID = 'holon-tooltip'

/**
 * Accès en lecture / écriture programmatique au tooltip actif. Utilisé par
 * `TooltipHost.vue` pour le rendu et par les sites d'appel exceptionnels.
 */
export function useTooltipUI() {
  function show(text: string, target: Element, placement: TooltipPlacement = 'top') {
    if (!text) return
    const rect = target.getBoundingClientRect()
    activeTooltip.value = {
      text,
      placement,
      targetRect: { x: rect.left, y: rect.top, w: rect.width, h: rect.height },
      targetKey: nextTargetKey(),
    }
  }

  function hide() {
    activeTooltip.value = null
  }

  return {
    activeTooltip: computed(() => activeTooltip.value),
    show,
    hide,
  }
}

let _targetKey = 0
function nextTargetKey(): number {
  _targetKey = (_targetKey + 1) | 0
  return _targetKey
}

/**
 * Délai d'apparition par défaut, en millisecondes. WCAG 1.4.13 demande qu'un
 * tooltip soit « dismissible » et reste lisible : 350 ms évite le spam au
 * survol rapide tout en restant suffisamment réactif au pointage volontaire.
 */
const DEFAULT_DELAY = 350

/**
 * Parse les arguments acceptés par la directive (string ou objet).
 */
function normalize(value: unknown): TooltipOptions | null {
  if (!value) return null
  if (typeof value === 'string') {
    return { text: value, placement: 'top', delay: DEFAULT_DELAY }
  }
  if (typeof value === 'object' && value !== null && 'text' in value) {
    const opts = value as TooltipOptions
    if (!opts.text) return null
    return {
      text: opts.text,
      placement: opts.placement ?? 'top',
      delay: opts.delay ?? DEFAULT_DELAY,
    }
  }
  return null
}

interface DirectiveCtx {
  options: TooltipOptions
  showTimer: number | null
  /** Listeners pour pouvoir les retirer proprement au démontage. */
  onEnter: () => void
  onLeave: () => void
  onFocus: () => void
  onBlur: () => void
  /** Conserve le `title` natif retiré pour permettre une restauration au démontage. */
  originalTitle: string | null
}

// On stocke les contextes via WeakMap pour ne pas fuir si l'élément est
// retiré du DOM sans que la directive l'apprenne (cas de patterns hors API).
const ctxMap = new WeakMap<HTMLElement, DirectiveCtx>()

function clear(el: HTMLElement) {
  const ctx = ctxMap.get(el)
  if (!ctx) return
  if (ctx.showTimer !== null) {
    window.clearTimeout(ctx.showTimer)
  }
  el.removeEventListener('pointerenter', ctx.onEnter)
  el.removeEventListener('pointerleave', ctx.onLeave)
  el.removeEventListener('focus', ctx.onFocus)
  el.removeEventListener('blur', ctx.onBlur)
  // Restaurer le title natif si on l'avait évincé.
  if (ctx.originalTitle !== null) {
    el.setAttribute('title', ctx.originalTitle)
  }
  // On retire aria-describedby uniquement si c'est nous qui l'avons posé.
  if (el.getAttribute('aria-describedby') === TOOLTIP_HOST_ID) {
    el.removeAttribute('aria-describedby')
  }
  ctxMap.delete(el)
}

function apply(el: HTMLElement, value: unknown) {
  // On nettoie systématiquement avant de réappliquer (cas update).
  clear(el)
  const opts = normalize(value)
  if (!opts) return

  const ui = useTooltipUI()

  // Éviter le double-tooltip système : si l'élément a déjà un `title`, on le
  // capture et on l'efface du DOM pour ne pas afficher le tooltip natif
  // par-dessus le nôtre.
  const originalTitle = el.getAttribute('title')
  if (originalTitle !== null) {
    el.removeAttribute('title')
  }

  // aria-describedby pointe vers l'hôte unique : tout lecteur d'écran lira
  // le contenu du tooltip courant quand cet élément reçoit le focus.
  el.setAttribute('aria-describedby', TOOLTIP_HOST_ID)

  const ctx: DirectiveCtx = {
    options: opts,
    showTimer: null,
    originalTitle,
    onEnter: () => {
      if (ctx.showTimer !== null) window.clearTimeout(ctx.showTimer)
      ctx.showTimer = window.setTimeout(() => {
        ui.show(opts.text, el, opts.placement ?? 'top')
        ctx.showTimer = null
      }, opts.delay ?? DEFAULT_DELAY)
    },
    onLeave: () => {
      if (ctx.showTimer !== null) {
        window.clearTimeout(ctx.showTimer)
        ctx.showTimer = null
      }
      ui.hide()
    },
    onFocus: () => {
      // Au focus clavier on affiche immédiatement, sans délai d'hystérésis.
      if (ctx.showTimer !== null) window.clearTimeout(ctx.showTimer)
      ui.show(opts.text, el, opts.placement ?? 'top')
    },
    onBlur: () => {
      ui.hide()
    },
  }
  el.addEventListener('pointerenter', ctx.onEnter)
  el.addEventListener('pointerleave', ctx.onLeave)
  el.addEventListener('focus', ctx.onFocus)
  el.addEventListener('blur', ctx.onBlur)
  ctxMap.set(el, ctx)
}

/**
 * Directive `v-tooltip` : déclarative, compatible argument string ou objet.
 *
 * @example
 * ```vue
 * <button v-tooltip="'Annuler la dernière action'">↶</button>
 * <button v-tooltip="{ text: 'Exporter', placement: 'bottom', delay: 200 }">
 *   Exporter
 * </button>
 * ```
 *
 * Comportement :
 * - apparition au pointage (`pointerenter`) après `delay` ms ;
 * - apparition immédiate au focus clavier (WCAG 2.1.1) ;
 * - disparition au `pointerleave`, `blur` ou `Escape` (géré côté hôte) ;
 * - le `title` natif est neutralisé temporairement pour éviter un double
 *   tooltip système, et restauré à la disparition de la directive ;
 * - `aria-describedby` lie l'élément au seul `TooltipHost`, lui-même
 *   `role="tooltip"`, ce qui satisfait les lecteurs d'écran.
 */
export const tooltipDirective: ObjectDirective<HTMLElement, unknown> = {
  mounted(el, binding) {
    apply(el, binding.value)
  },
  updated(el, binding) {
    if (binding.value === binding.oldValue) return
    apply(el, binding.value)
  },
  unmounted(el) {
    clear(el)
  },
}
