// src/composables/traits/useBackupable.ts
import { computed, onUnmounted, ref } from 'vue'
import { nanoid } from 'nanoid'
import { useGraphStore } from '../../stores/graph'
import { db, type BackupEntry } from '../../db'
import type { Node, Edge } from '../../types'

/**
 * Configuration du système de backups automatiques.
 */
export interface BackupableOptions {
  /**
   * Intervalle entre deux auto-backups, en millisecondes.
   * @default 300_000 (5 minutes)
   */
  intervalMs?: number
  /**
   * Nombre maximum d'entrées conservées (les plus anciennes sont purgées).
   * @default 10
   */
  maxBackups?: number
  /**
   * Si vrai, on démarre l'auto-backup au montage du composable.
   * @default false
   */
  autoStart?: boolean
}

/**
 * État réactif exposé par le trait Backupable.
 */
export interface BackupableState {
  backups: typeof backups
  isAutoBackupActive: typeof isAutoBackupActive
  lastBackupAt: typeof lastBackupAt
}

/**
 * Handlers du trait Backupable.
 */
export interface BackupableHandlers {
  /**
   * Crée un backup immédiat (source = 'manual').
   *
   * @param label - Étiquette descriptive optionnelle (« avant import », etc.)
   * @returns L'entrée créée
   */
  createBackup: (label?: string) => Promise<BackupEntry>
  /**
   * Restaure un backup donné dans le graphe. L'état courant est remplacé
   * atomiquement (replaceAll côté store).
   */
  restoreBackup: (id: string) => Promise<void>
  /** Supprime un backup par ID. */
  deleteBackup: (id: string) => Promise<void>
  /** Vide la liste de backups. */
  clearBackups: () => Promise<void>
  /** Recharge la liste depuis IndexedDB. */
  refreshBackups: () => Promise<void>
  /** Lance l'auto-backup avec l'intervalle configuré. */
  startAutoBackup: () => void
  /** Arrête l'auto-backup. */
  stopAutoBackup: () => void
}

/**
 * État module-level partagé entre tous les consommateurs : la liste des
 * backups, l'activité de l'auto-backup et le timestamp du dernier backup.
 */
const backups = ref<BackupEntry[]>([])
const isAutoBackupActive = ref(false)
const lastBackupAt = ref<number | null>(null)
let autoTimer: ReturnType<typeof setInterval> | null = null

/**
 * Déproxifie une valeur réactive en une copie native sérialisable.
 *
 * IndexedDB / structured clone rejettent les `Proxy` Vue ; le cycle JSON
 * matérialise un objet pur en un passage.
 */
function toPlain<T>(value: T): T {
  return JSON.parse(JSON.stringify(value))
}

/**
 * Charge les backups depuis IndexedDB en ordre antichronologique (les plus
 * récents en premier).
 */
async function refreshFromDB(): Promise<void> {
  const all = await db.backups.orderBy('createdAt').reverse().toArray()
  backups.value = all
  lastBackupAt.value = all[0]?.createdAt ?? null
}

/**
 * Trait de gestion de backups locaux.
 *
 * - Stockage : table `backups` de la base Dexie (v3).
 * - Sécurité : rétention configurable, purge automatique des plus anciens.
 * - Auto-backup : timer périodique géré au niveau module pour rester actif
 *   même si le composable est démonté/remonté (App.vue → singleton).
 *
 * @example
 * ```ts
 * const { createBackup, restoreBackup, startAutoBackup } = useBackupable({
 *   intervalMs: 600_000, // 10 min
 *   maxBackups: 20,
 *   autoStart: true,
 * })
 * ```
 */
export function useBackupable(
  options: BackupableOptions = {}
): BackupableState & BackupableHandlers {
  const { intervalMs = 300_000, maxBackups = 10, autoStart = false } = options
  const graphStore = useGraphStore()

  async function pruneOldBackups(): Promise<void> {
    const excess = backups.value.length - maxBackups
    if (excess <= 0) return
    // backups est trié antichronologique, donc les "excess" derniers sont les
    // plus anciens.
    const toRemove = backups.value.slice(backups.value.length - excess)
    await db.transaction('rw', db.backups, async () => {
      for (const entry of toRemove) {
        await db.backups.delete(entry.id)
      }
    })
    await refreshFromDB()
  }

  async function createBackup(label?: string): Promise<BackupEntry> {
    return doCreateBackup(label, 'manual')
  }

  async function doCreateBackup(
    label: string | undefined,
    source: 'auto' | 'manual'
  ): Promise<BackupEntry> {
    const entry: BackupEntry = {
      id: nanoid(),
      createdAt: Date.now(),
      label,
      source,
      nodes: toPlain(graphStore.nodes) as Record<string, Node>,
      edges: toPlain(graphStore.edges) as Record<string, Edge>,
    }
    await db.backups.put(entry)
    await refreshFromDB()
    await pruneOldBackups()
    return entry
  }

  async function restoreBackup(id: string): Promise<void> {
    const entry = await db.backups.get(id)
    if (!entry) return
    await graphStore.replaceAll(entry.nodes, entry.edges)
  }

  async function deleteBackup(id: string): Promise<void> {
    await db.backups.delete(id)
    await refreshFromDB()
  }

  async function clearBackups(): Promise<void> {
    await db.backups.clear()
    await refreshFromDB()
  }

  async function refreshBackups(): Promise<void> {
    await refreshFromDB()
  }

  function startAutoBackup(): void {
    if (autoTimer) return
    isAutoBackupActive.value = true
    autoTimer = setInterval(() => {
      // On capture sans bloquer : si la persistence échoue, on signale dans
      // la console et on continue d'essayer au tick suivant.
      doCreateBackup(undefined, 'auto').catch((err) => {
        console.warn('[useBackupable] auto-backup en échec :', err)
      })
    }, intervalMs)
  }

  function stopAutoBackup(): void {
    if (autoTimer) {
      clearInterval(autoTimer)
      autoTimer = null
    }
    isAutoBackupActive.value = false
  }

  // Démarrage paresseux : si demandé et pas déjà démarré ailleurs.
  if (autoStart && !autoTimer) startAutoBackup()

  // Nettoyage propre côté tests : un onUnmounted seul ne suffit pas si le
  // composable n'est jamais monté dans un composant ; l'utilisateur final
  // appellera stopAutoBackup à la fermeture de session.
  onUnmounted(() => {
    // Volontairement : on N'arrête PAS l'auto-backup ici, le timer est
    // module-level et survit aux montages multiples du composable.
  })

  // Première hydratation depuis IndexedDB (idempotente).
  refreshFromDB().catch(() => {
    // En cas d'échec de lecture (DB corrompue ou bloquée), on laisse la
    // liste vide ; l'utilisateur pourra créer un nouveau backup.
  })

  return {
    backups,
    isAutoBackupActive,
    lastBackupAt,
    createBackup,
    restoreBackup,
    deleteBackup,
    clearBackups,
    refreshBackups,
    startAutoBackup,
    stopAutoBackup,
  }
}

/**
 * Accès en lecture seule à l'état de backup pour les composants qui ne
 * veulent que l'afficher (sans manipuler le cycle de vie de l'auto-backup).
 */
export function useBackupState() {
  return {
    backups: computed(() => backups.value),
    isAutoBackupActive: computed(() => isAutoBackupActive.value),
    lastBackupAt: computed(() => lastBackupAt.value),
  }
}
