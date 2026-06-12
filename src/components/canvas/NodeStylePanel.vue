<!-- src/components/canvas/NodeStylePanel.vue -->
<script setup lang="ts">
import { ref, computed } from 'vue'
import {
  PRESET_COLORS,
  ARCHIMATE_TYPES,
  type ArchimateType,
  useShapeable,
  useTypeable,
  useLockable,
  useZIndexable,
  useStyleable,
  getShapesByCategory,
} from '../../composables/traits'

/**
 * Panneau contextuel d'édition du style d'un noeud (couleurs, forme, type,
 * actions). Affiché à droite du noeud sélectionné via `foreignObject` SVG.
 *
 * Extrait de `NodeRenderer` pour réduire son volume et isoler la grande
 * surface UI dédiée au style. Le panneau ne stocke pas d'état métier : tout
 * passe par les traits, qui partagent l'état via le store.
 */
const props = defineProps<{
  nodeId: string
  width: number
}>()

const emit = defineEmits<{
  (e: 'add-to-library'): void
}>()

const nodeIdRef = computed(() => props.nodeId)
const { currentStyle, updateFill, updateStroke } = useStyleable({ nodeId: nodeIdRef })
const shapeable = useShapeable({ nodeId: nodeIdRef })
const typeable = useTypeable({ nodeId: nodeIdRef })
const lockable = useLockable({ nodeId: nodeIdRef })
const zIndexable = useZIndexable({ nodeId: nodeIdRef })

const showShapePanel = ref(false)
const showTypePanel = ref(false)
const shapeGroups = getShapesByCategory()

// Les couches d'ARCHIMATE_TYPES ont des clés hétérogènes ; on uniformise pour
// que le v-for ne tombe pas sur un type `never` côté Vue.
interface ArchimateTypeEntry {
  label: string
  icon: string
}
function typesOf(layerConfig: {
  types: Record<string, ArchimateTypeEntry>
}): Record<ArchimateType, ArchimateTypeEntry> {
  return layerConfig.types as Record<ArchimateType, ArchimateTypeEntry>
}
</script>

<template>
  <foreignObject :x="width + 8" y="0" width="280" height="500">
    <div
      class="app-surface border app-border rounded-lg shadow-lg p-3 text-sm max-h-96 overflow-y-auto"
      @pointerdown.stop
      @click.stop
    >
      <!-- Couleurs -->
      <div class="font-medium mb-2">Couleur de fond</div>
      <div class="grid grid-cols-6 gap-1 mb-3">
        <button
          v-for="color in PRESET_COLORS.slice(0, 24)"
          :key="'fill-' + color"
          :style="{ backgroundColor: color }"
          class="w-6 h-6 rounded border app-border hover:scale-110 transition-transform"
          :class="{ 'ring-2 ring-blue-500': currentStyle.fill === color }"
          @click="updateFill(color)"
        />
      </div>

      <div class="font-medium mb-2">Couleur de bordure</div>
      <div class="grid grid-cols-6 gap-1 mb-3">
        <button
          v-for="color in PRESET_COLORS.slice(0, 24)"
          :key="'stroke-' + color"
          :style="{ backgroundColor: color }"
          class="w-6 h-6 rounded border app-border hover:scale-110 transition-transform"
          :class="{ 'ring-2 ring-blue-500': currentStyle.stroke === color }"
          @click="updateStroke(color)"
        />
      </div>

      <!-- Formes -->
      <div class="border-t pt-3 mt-3">
        <div class="font-medium mb-2 flex justify-between items-center">
          <span>Forme: {{ shapeable.shapeLabel.value }}</span>
          <button
            @click="showShapePanel = !showShapePanel"
            class="text-xs text-blue-500 hover:text-blue-700"
          >
            {{ showShapePanel ? 'Masquer' : 'Changer' }}
          </button>
        </div>
        <div v-if="showShapePanel" class="space-y-2">
          <div v-for="(shapes, category) in shapeGroups" :key="category">
            <div class="text-xs app-subtle mb-1 capitalize">{{ category }}</div>
            <div class="grid grid-cols-4 gap-1">
              <button
                v-for="shapeItem in shapes"
                :key="shapeItem.shape"
                @click="shapeable.setShape(shapeItem.shape)"
                class="p-1 text-xs border rounded app-hover"
                :class="{
                  'bg-blue-100 border-blue-500': shapeable.shape.value === shapeItem.shape,
                }"
                :title="shapeItem.label"
              >
                {{ shapeItem.label.slice(0, 6) }}
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Types Archimate -->
      <div class="border-t pt-3 mt-3">
        <div class="font-medium mb-2 flex justify-between items-center">
          <span>Type: {{ typeable.typeLabel.value || 'Aucun' }}</span>
          <button
            @click="showTypePanel = !showTypePanel"
            class="text-xs text-blue-500 hover:text-blue-700"
          >
            {{ showTypePanel ? 'Masquer' : 'Changer' }}
          </button>
        </div>
        <div v-if="showTypePanel" class="space-y-2 max-h-40 overflow-y-auto">
          <button
            @click="typeable.clearType()"
            class="w-full text-left p-1 text-xs app-hover rounded"
            :class="{ 'app-surface-3': !typeable.archimateType.value }"
          >
            Aucun type
          </button>
          <div v-for="(layerConfig, layerKey) in ARCHIMATE_TYPES" :key="layerKey">
            <div
              class="text-xs font-medium px-1 py-0.5 rounded mb-1"
              :style="{ backgroundColor: layerConfig.color }"
            >
              {{ layerConfig.label }}
            </div>
            <div class="grid grid-cols-2 gap-1">
              <button
                v-for="(typeConfig, typeKey) in typesOf(layerConfig)"
                :key="typeKey"
                @click="typeable.setType(typeKey)"
                class="p-1 text-xs border rounded app-hover text-left"
                :class="{ 'app-ring-accent ring-2': typeable.archimateType.value === typeKey }"
              >
                {{ typeConfig.icon }} {{ typeConfig.label }}
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Actions -->
      <div class="border-t pt-3 mt-3 space-y-2">
        <div class="font-medium mb-2">Actions</div>
        <div class="flex flex-wrap gap-2">
          <button
            @click="lockable.toggleLock()"
            class="px-2 py-1 text-xs border rounded app-hover"
            :class="{ 'bg-yellow-100': lockable.isLocked.value }"
          >
            {{ lockable.isLocked.value ? '🔓 Déverrouiller' : '🔒 Verrouiller' }}
          </button>
          <button
            @click="zIndexable.bringToFront()"
            class="px-2 py-1 text-xs border rounded app-hover"
          >
            ↑ Devant
          </button>
          <button
            @click="zIndexable.sendToBack()"
            class="px-2 py-1 text-xs border rounded app-hover"
          >
            ↓ Derrière
          </button>
          <button
            @click="emit('add-to-library')"
            class="px-2 py-1 text-xs border rounded app-hover"
            title="Sauvegarder ce bloc comme modèle réutilisable"
          >
            📚 Bibliothèque
          </button>
        </div>
      </div>
    </div>
  </foreignObject>
</template>
