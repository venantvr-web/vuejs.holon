// src/composables/useConfirm.ts
import { computed, ref } from 'vue'

/**
 * Ton visuel du bouton de confirmation. `danger` (rouge) pour les actions
 * destructrices, `default` pour les confirmations neutres.
 */
export type ConfirmTone = 'default' | 'danger'

/**
 * Options d'une demande de confirmation.
 */
export interface ConfirmOptions {
  /** Message principal affiché dans la boîte. */
  message: string
  /** Titre optionnel (gras) au-dessus du message. */
  title?: string
  /** Libellé du bouton de confirmation (défaut : clé i18n `common.confirm`). */
  confirmLabel?: string
  /** Libellé du bouton d'annulation (défaut : clé i18n `common.cancel`). */
  cancelLabel?: string
  /** Ton du bouton de confirmation. */
  tone?: ConfirmTone
}

/**
 * Requête de confirmation active, avec sa fonction de résolution.
 */
interface ActiveConfirm extends ConfirmOptions {
  /** Identifiant stable pour la clé de rendu. */
  key: number
  /** Résout la promesse renvoyée par `confirm()`. */
  resolve: (value: boolean) => void
}

// Une seule confirmation à la fois : la sémantique modale l'impose, et cela
// évite tout empilement de boîtes. État partagé au niveau module, à l'image
// du système de tooltips (`useTooltipUI`).
const activeConfirm = ref<ActiveConfirm | null>(null)
let _key = 0

/**
 * Système de confirmation modale, thémé et accessible, en remplacement de
 * `window.confirm` (qui ignore le thème, casse les tests E2E et n'offre aucun
 * contrôle d'accessibilité).
 *
 * Le rendu est assuré par l'hôte unique `ConfirmHost.vue` monté dans `App.vue`.
 *
 * @example
 * ```typescript
 * const { confirm } = useConfirm();
 * if (await confirm({ message: 'Tout effacer ?', tone: 'danger' })) {
 *   graphStore.clearAll();
 * }
 * ```
 */
export function useConfirm() {
  /**
   * Ouvre une boîte de confirmation et renvoie une promesse résolue à `true`
   * (confirmé) ou `false` (annulé / fermé).
   */
  function confirm(options: ConfirmOptions): Promise<boolean> {
    // Si une confirmation est déjà ouverte, on l'annule proprement avant
    // d'ouvrir la nouvelle pour ne jamais laisser une promesse en suspens.
    if (activeConfirm.value) {
      activeConfirm.value.resolve(false)
    }
    return new Promise<boolean>((resolve) => {
      activeConfirm.value = { ...options, key: (_key = (_key + 1) | 0), resolve }
    })
  }

  /** Répond à la confirmation active puis la ferme. */
  function respond(value: boolean): void {
    const current = activeConfirm.value
    if (!current) return
    activeConfirm.value = null
    current.resolve(value)
  }

  return {
    activeConfirm: computed(() => activeConfirm.value),
    confirm,
    respond,
  }
}
