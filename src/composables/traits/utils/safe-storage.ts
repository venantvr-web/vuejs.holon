// src/composables/traits/utils/safe-storage.ts

/**
 * Accès `localStorage` tolérant aux pannes.
 *
 * En navigation privée, quota dépassé ou stockage désactivé par la politique
 * du navigateur, les appels natifs lèvent une exception. Ces helpers
 * l'absorbent afin qu'un échec de persistance ne remonte jamais jusqu'à l'UI :
 * la fonctionnalité concernée continue de tourner en mémoire, seule la
 * persistance est perdue.
 */

/**
 * Lit une valeur brute. Renvoie `null` si la clé est absente ou si le stockage
 * est indisponible.
 */
export function safeGetItem(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

/**
 * Écrit une valeur brute. Renvoie `true` si l'écriture a réussi, `false` sinon.
 */
export function safeSetItem(key: string, value: string): boolean {
  try {
    localStorage.setItem(key, value)
    return true
  } catch {
    return false
  }
}

/**
 * Lit et désérialise une valeur JSON. Renvoie `fallback` si la clé est absente,
 * le stockage indisponible ou le contenu illisible.
 */
export function safeGetJSON<T>(key: string, fallback: T): T {
  const raw = safeGetItem(key)
  if (raw === null) return fallback
  try {
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

/**
 * Sérialise et écrit une valeur JSON. Renvoie `true` en cas de succès.
 */
export function safeSetJSON(key: string, value: unknown): boolean {
  try {
    return safeSetItem(key, JSON.stringify(value))
  } catch {
    // JSON.stringify peut lever (référence circulaire) : on reste non bloquant.
    return false
  }
}
