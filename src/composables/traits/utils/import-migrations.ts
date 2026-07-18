// src/composables/traits/utils/import-migrations.ts

/**
 * Version courante du format d'export/import JSON propriétaire. Source unique
 * partagée entre `useExportable` (écriture) et `useImportable` (lecture).
 */
export const CURRENT_FORMAT_VERSION = '1.0'

/**
 * Une étape de migration : transforme un document de sa version vers `to`.
 */
interface MigrationStep {
  /** Version cible après application. */
  to: string
  /** Transformation du document (doit renvoyer un nouvel objet). */
  migrate: (data: Record<string, unknown>) => Record<string, unknown>
}

/**
 * Chaîne de migrations, indexée par version source. Vide aujourd'hui (une seule
 * version publiée). Exemple d'ajout futur lorsqu'on passera à « 1.1 » :
 *
 * ```ts
 * '1.0': {
 *   to: '1.1',
 *   migrate: (d) => ({ ...d, edges: renommeChampsAretes(d.edges) }),
 * },
 * ```
 */
const MIGRATIONS: Record<string, MigrationStep> = {}

/**
 * Résultat d'une tentative de migration.
 */
export interface MigrationOutcome {
  /** Vrai si le document est exploitable (déjà à jour ou migré avec succès). */
  ok: boolean
  /** Document normalisé à la version courante (présent si `ok`). */
  data?: Record<string, unknown>
  /** Message d'erreur bloquant (présent si `!ok`). */
  error?: string
  /** Avertissements non bloquants. */
  warnings: string[]
}

/**
 * Compare deux versions « majeur.mineur » (ou « majeur »). Renvoie un nombre
 * négatif si `a < b`, positif si `a > b`, 0 si égales.
 */
export function compareVersions(a: string, b: string): number {
  const pa = a.split('.').map((n) => parseInt(n, 10) || 0)
  const pb = b.split('.').map((n) => parseInt(n, 10) || 0)
  const len = Math.max(pa.length, pb.length)
  for (let i = 0; i < len; i++) {
    const diff = (pa[i] ?? 0) - (pb[i] ?? 0)
    if (diff !== 0) return diff
  }
  return 0
}

/**
 * Amène un document d'import au format courant :
 *
 * - version absente → supposée être la version courante (fichier ancien ou
 *   forgé à la main), avec un avertissement ;
 * - version plus récente que celle supportée → refus explicite (l'outil ne
 *   sait pas lire un format du futur) ;
 * - version antérieure → application séquentielle des migrations jusqu'à la
 *   version courante, ou refus si le chemin de migration est incomplet.
 *
 * @param input - Données JSON déjà désérialisées
 * @returns Résultat de migration (données à jour ou erreur bloquante)
 */
export function migrateImportData(input: unknown): MigrationOutcome {
  const warnings: string[] = []

  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    return { ok: false, error: "Le document importé n'est pas un objet JSON valide", warnings }
  }

  const data = { ...(input as Record<string, unknown>) }

  let version: string
  if (typeof data.version === 'string' && data.version.length > 0) {
    version = data.version
  } else {
    version = CURRENT_FORMAT_VERSION
    data.version = CURRENT_FORMAT_VERSION
    warnings.push(
      `Version de format absente : document supposé en version ${CURRENT_FORMAT_VERSION}`
    )
  }

  // Version du futur : on refuse plutôt que d'importer des données mal comprises.
  if (compareVersions(version, CURRENT_FORMAT_VERSION) > 0) {
    return {
      ok: false,
      error: `Version de format non supportée : ${version} (maximum supporté : ${CURRENT_FORMAT_VERSION})`,
      warnings,
    }
  }

  // Migrations séquentielles jusqu'à la version courante.
  let current = data
  let guard = 0
  while (version !== CURRENT_FORMAT_VERSION) {
    const step = MIGRATIONS[version]
    if (!step) {
      return {
        ok: false,
        error: `Aucun chemin de migration depuis la version ${version} vers ${CURRENT_FORMAT_VERSION}`,
        warnings,
      }
    }
    current = step.migrate(current)
    current.version = step.to
    warnings.push(`Migration ${version} → ${step.to} appliquée`)
    version = step.to
    // Garde-fou contre une chaîne de migrations mal configurée (cycle).
    if (++guard > 50) {
      return { ok: false, error: 'Boucle de migration détectée', warnings }
    }
  }

  return { ok: true, data: current, warnings }
}
