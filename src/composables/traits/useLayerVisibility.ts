// src/composables/traits/useLayerVisibility.ts
import { computed, ref } from 'vue'
import { ARCHIMATE_TYPES, type ArchimateLayer } from './useTypeable'
import type { Node } from '../../types'

export type { ArchimateLayer }

/**
 * Visibilité par couche Archimate.
 *
 * Permet de masquer rapidement tous les noeuds d'une couche (Business,
 * Application, Technology, etc.) sans avoir à les sélectionner un par un.
 * État partagé module-level pour rester cohérent entre LayersPanel,
 * NodeRenderer, MiniMap, etc.
 */

const hiddenLayers = ref<Set<ArchimateLayer>>(new Set())

/**
 * Index inverse type Archimate → couche, construit une seule fois au load
 * pour accélérer la lookup à chaque render.
 */
const typeToLayer = new Map<string, ArchimateLayer>()
for (const [layerKey, layer] of Object.entries(ARCHIMATE_TYPES)) {
  for (const typeKey of Object.keys(layer.types)) {
    typeToLayer.set(typeKey, layerKey as ArchimateLayer)
  }
}

/**
 * Renvoie la liste ordonnée des couches Archimate (avec label et couleur).
 */
export function getArchimateLayers(): Array<{
  key: ArchimateLayer
  label: string
  color: string
}> {
  return (
    Object.entries(ARCHIMATE_TYPES) as [ArchimateLayer, (typeof ARCHIMATE_TYPES)[ArchimateLayer]][]
  ).map(([key, layer]) => ({ key, label: layer.label, color: layer.color }))
}

/**
 * Vrai si la couche d'un noeud (déduite de `data.archimateType`) est
 * actuellement masquée. Renvoie `false` pour les noeuds sans type Archimate
 * (ils ne participent à aucun layer toggle).
 */
export function isNodeLayerHidden(node: Node | undefined | null): boolean {
  if (!node) return false
  const archimateType = node.data?.archimateType as string | undefined
  if (!archimateType) return false
  const layer = typeToLayer.get(archimateType)
  if (!layer) return false
  return hiddenLayers.value.has(layer)
}

/**
 * Composable d'accès et de pilotage de la visibilité par couche.
 */
export function useLayerVisibility() {
  const layers = computed(() => getArchimateLayers())

  function isHidden(layer: ArchimateLayer): boolean {
    return hiddenLayers.value.has(layer)
  }

  function toggle(layer: ArchimateLayer): void {
    // On reconstruit le Set pour déclencher la réactivité Vue (mutation
    // interne d'un Set n'est pas suivie).
    const next = new Set(hiddenLayers.value)
    if (next.has(layer)) next.delete(layer)
    else next.add(layer)
    hiddenLayers.value = next
  }

  function showAll(): void {
    hiddenLayers.value = new Set()
  }

  function hideAll(): void {
    hiddenLayers.value = new Set(layers.value.map((l) => l.key))
  }

  return {
    layers,
    hiddenLayers: computed(() => hiddenLayers.value),
    isHidden,
    toggle,
    showAll,
    hideAll,
  }
}
