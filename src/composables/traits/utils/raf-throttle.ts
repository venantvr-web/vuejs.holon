// src/composables/traits/utils/raf-throttle.ts

/**
 * Throttle un handler à la fréquence de rafraîchissement de l'écran via
 * `requestAnimationFrame`.
 *
 * Les événements de souris (`mousemove`, `pointermove`) peuvent émettre à
 * plus de 120 Hz sur certains périphériques, alors que le rendu est plafonné
 * à 60–120 Hz selon l'écran. Réagir à chaque évènement gaspille du CPU pour
 * un résultat indiscernable. `rafThrottle` :
 *
 * 1. Mémorise les *dernières* arguments reçus.
 * 2. Si une frame n'est pas déjà planifiée, en demande une via `rAF`.
 * 3. Sur la frame, appelle le handler avec les derniers arguments puis
 *    libère la réservation.
 *
 * La sémantique « last-write-wins » est exactement ce qu'on veut pour le
 * suivi de souris : si deux évènements arrivent dans la même frame, seul le
 * plus récent compte (la position intermédiaire n'a aucune valeur visuelle).
 *
 * La fonction renvoyée expose un `.cancel()` pour annuler une frame en
 * attente, utile au démontage des composants pour éviter qu'un handler ne
 * s'exécute après un `removeEventListener`.
 */
export function rafThrottle<TArgs extends unknown[]>(
  fn: (...args: TArgs) => void
): ((...args: TArgs) => void) & { cancel: () => void } {
  let pending = false
  let frameId = 0
  let latest: TArgs | null = null

  function throttled(...args: TArgs): void {
    latest = args
    if (pending) return
    pending = true
    frameId = requestAnimationFrame(() => {
      pending = false
      const last = latest
      latest = null
      if (last) fn(...last)
    })
  }

  throttled.cancel = () => {
    if (pending) {
      cancelAnimationFrame(frameId)
      pending = false
      latest = null
    }
  }

  return throttled
}
