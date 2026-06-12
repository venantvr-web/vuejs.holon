// src/composables/useSound.ts
import { ref, watch } from 'vue'

/**
 * Familles de petits sons synthétisés associés aux actions principales.
 *
 * Les sons ne sont **jamais** chargés depuis des fichiers externes : ils sont
 * générés à la volée via l'API Web Audio (oscillateurs + enveloppes de gain),
 * ce qui évite tout asset binaire, toute licence, et garde la latence sous
 * les 5 ms.
 */
export type SoundKind =
  | 'click'
  | 'select'
  | 'create'
  | 'delete'
  | 'connect'
  | 'undo'
  | 'redo'
  | 'snap'
  | 'error'

const MUTE_STORAGE_KEY = 'holon:sound:muted'

/**
 * État global du mute, persisté dans `localStorage` pour survivre aux rechargements.
 */
const isMuted = ref<boolean>(
  typeof localStorage !== 'undefined' && localStorage.getItem(MUTE_STORAGE_KEY) === 'true'
)

watch(isMuted, (value) => {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(MUTE_STORAGE_KEY, value ? 'true' : 'false')
  }
})

/**
 * Instance unique d'`AudioContext` créée paresseusement au premier son. Les
 * navigateurs bloquent la création avant interaction utilisateur ; comme on
 * ne joue de son que depuis un handler d'interaction, ça passe en pratique.
 */
let audioContext: AudioContext | null = null

function ensureContext(): AudioContext | null {
  if (typeof window === 'undefined') return null
  const AC =
    typeof window.AudioContext !== 'undefined'
      ? window.AudioContext
      : (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!AC) return null
  if (!audioContext) {
    try {
      audioContext = new AC()
    } catch {
      return null
    }
  }
  // Safari suspend le contexte tant qu'un geste utilisateur n'a pas eu lieu ;
  // on tente une reprise silencieuse, le navigateur fera échouer proprement
  // si on n'a pas l'autorisation.
  if (audioContext.state === 'suspended') {
    audioContext.resume().catch(() => {
      /* sans-bruit */
    })
  }
  return audioContext
}

interface ToneSpec {
  freq: number
  duration: number
  volume?: number
  type?: OscillatorType
  delay?: number
}

/**
 * Joue une note unique avec attaque immédiate et décroissance exponentielle.
 * Volume par défaut volontairement très bas (un cinquième d'un son système
 * standard) pour rester sous le seuil de l'agaçant.
 */
function playTone(spec: ToneSpec): void {
  const ctx = ensureContext()
  if (!ctx) return
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.type = spec.type ?? 'sine'
  osc.frequency.value = spec.freq
  const startTime = ctx.currentTime + (spec.delay ?? 0)
  const volume = spec.volume ?? 0.04
  gain.gain.setValueAtTime(volume, startTime)
  // Décroissance exponentielle : pas de clic en fin de note.
  gain.gain.exponentialRampToValueAtTime(0.0001, startTime + spec.duration)
  osc.connect(gain).connect(ctx.destination)
  osc.start(startTime)
  osc.stop(startTime + spec.duration + 0.02)
}

/**
 * Presets : durée < 150 ms, fréquences évitant les harmoniques d'alerte
 * système (téléphones, notifications), volumes harmonisés autour de 0.04.
 */
const PRESETS: Record<SoundKind, () => void> = {
  click: () => playTone({ freq: 800, duration: 0.04, volume: 0.025 }),
  select: () => playTone({ freq: 1000, duration: 0.05, volume: 0.03 }),
  create: () => {
    playTone({ freq: 523.25, duration: 0.06, volume: 0.04 })
    playTone({ freq: 784, duration: 0.07, volume: 0.04, delay: 0.04 })
  },
  delete: () => {
    playTone({ freq: 440, duration: 0.08, volume: 0.04 })
    playTone({ freq: 329.63, duration: 0.1, volume: 0.04, delay: 0.05 })
  },
  connect: () => {
    playTone({ freq: 659.25, duration: 0.05, volume: 0.035 })
    playTone({ freq: 880, duration: 0.07, volume: 0.035, delay: 0.04 })
  },
  undo: () => playTone({ freq: 440, duration: 0.07, volume: 0.035, type: 'triangle' }),
  redo: () => playTone({ freq: 587.33, duration: 0.07, volume: 0.035, type: 'triangle' }),
  snap: () => playTone({ freq: 1200, duration: 0.03, volume: 0.03 }),
  error: () => playTone({ freq: 220, duration: 0.12, volume: 0.05, type: 'square' }),
}

/**
 * Composable principal exposant le toggle de mute et la fonction `play`.
 * État partagé module-level pour garder l'unique `AudioContext` et la
 * cohérence du mute entre tous les composants qui en dépendent.
 */
export function useSound() {
  function play(kind: SoundKind): void {
    if (isMuted.value) return
    const preset = PRESETS[kind]
    if (!preset) return
    try {
      preset()
    } catch {
      // Un échec audio ne doit jamais casser l'UX.
    }
  }

  function toggleMute(): void {
    isMuted.value = !isMuted.value
  }

  function setMuted(value: boolean): void {
    isMuted.value = value
  }

  return { isMuted, play, toggleMute, setMuted }
}

/**
 * Helper sans contexte de composant pour les sites d'appel ponctuels
 * (stores Pinia, traits qui ne veulent pas faire `useSound()` à chaque appel).
 */
export function playSound(kind: SoundKind): void {
  useSound().play(kind)
}
