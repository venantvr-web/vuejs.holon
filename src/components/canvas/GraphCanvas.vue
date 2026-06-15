<!-- src/components/canvas/GraphCanvas.vue -->
<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useGraphStore } from '../../stores/graph'
import { useGeometry } from '../../composables/useGeometry'
import {
  useSelectionState,
  useGroupState,
  useClipboardable,
  useSnapState,
  useFocusedNodeState,
} from '../../composables/traits'
import { useLibraryStore } from '../../stores/library'
import { useViewport } from '../../composables/useViewport'
import { isNodeVisible } from '../../composables/traits/utils/culling'
import { rafThrottle } from '../../composables/traits/utils/raf-throttle'
import NodeRenderer from './NodeRenderer.vue'
import EdgeLayer from './EdgeLayer.vue'
import Minimap from './Minimap.vue'
import Breadcrumb from './Breadcrumb.vue'
import CanvasEmptyState from './CanvasEmptyState.vue'
import SearchPanel from './SearchPanel.vue'
import NodeArchimateTypePicker from './NodeArchimateTypePicker.vue'
import { useTypeable, type ArchimateType } from '../../composables/traits/useTypeable'
import ContextMenu, { type ContextMenuItem } from '../ui/ContextMenu.vue'
import { useI18n } from '../../composables/useI18n'

const { t } = useI18n()
const graphStore = useGraphStore()
const libraryStore = useLibraryStore()
const { screenToLocalCoordinates, getNodeAbsolutePosition } = useGeometry()
const { selectedNodeIds, clearSelection } = useSelectionState()
const { groups, createGroupFromSelection, dissolveGroup } = useGroupState()
const { copy, cut, paste, duplicate, canPaste } = useClipboardable()
const { focusInDirection } = useFocusedNodeState()
const { pan, zoomLevel, zoomAroundScreenPoint, visibleWorldRect, setCanvasSize } = useViewport()
// Facteur inverse du zoom pour les textes d'étiquette (halos de groupe, etc.)
// qui doivent garder une taille écran constante.
const fontMul = computed(() => 1 / zoomLevel.value)
const { config: snapConfig, activeGuides: snapGuides } = useSnapState()

// État du menu contextuel
const contextMenu = ref<{ x: number; y: number; items: ContextMenuItem[] } | null>(null)

function closeContextMenu() {
  contextMenu.value = null
}

// Panneau de recherche (Ctrl+F).
const searchOpen = ref(false)

// Popup du sélecteur Archimate (rendu en overlay HTML pour garder une taille
// constante au zoom). x/y sont en coordonnées écran.
const typePicker = ref<{ nodeId: string; x: number; y: number } | null>(null)

function openTypePicker(payload: { nodeId: string; x: number; y: number }) {
  typePicker.value = payload
}

function closeTypePicker() {
  typePicker.value = null
}

/** Applique le type Archimate au noeud cible et réinitialise customFill
 *  pour que le tint de la layer prenne effet immédiatement. */
function applyTypeToNode(nodeId: string, type: string | null) {
  const nodeIdRef = computed(() => nodeId)
  const { setType, clearType } = useTypeable({ nodeId: nodeIdRef })
  if (type === null) {
    clearType()
  } else {
    setType(type as ArchimateType)
    // Reset du flag customFill pour que le nouveau tint soit visible.
    const node = graphStore.nodes[nodeId]
    if (node?.data?.customFill) {
      graphStore.updateNode(nodeId, {
        data: { ...(node.data ?? {}), customFill: false },
      })
    }
  }
}

const typePickerCurrent = computed(() => {
  if (!typePicker.value) return null
  return graphStore.nodes[typePicker.value.nodeId]?.data?.archimateType ?? null
})

const svgRoot = ref<SVGSVGElement | null>(null)

// État pour le pan avec la souris
const isPanning = ref(false)
const lastMousePos = ref({ x: 0, y: 0 })

// État pour la sélection rectangle (marquee / rubber-band).
// Coordonnées en espace monde (après pan/zoom).
const marquee = ref<{ startX: number; startY: number; endX: number; endY: number } | null>(null)

// État pour le mode connexion
const connectionMode = ref(false)
const connectionSource = ref<string | null>(null)
const connectionPreview = ref<{ x: number; y: number } | null>(null)

// Centre absolu du noeud source pour l'aperçu de connexion
const connectionSourceCenter = computed(() => {
  if (!connectionSource.value) return { x: 0, y: 0 }
  const node = graphStore.nodes[connectionSource.value]
  if (!node) return { x: 0, y: 0 }

  // Obtenir la position absolue du noeud (en tenant compte des parents)
  const absPos = getNodeAbsolutePosition(connectionSource.value)
  return {
    x: absPos.x + node.geometry.w / 2,
    y: absPos.y + node.geometry.h / 2,
  }
})

// Transformation pour le groupe SVG principal
const transform = computed(
  () => `translate(${pan.value.x} ${pan.value.y}) scale(${zoomLevel.value})`
)

// Source de vérité O(1) : l'index parent → enfants tenu par le store.
// Le rectangle visible (monde) sert au culling : on ne rend pas les noeuds
// racines complètement hors du viewport (avec hystérésis pour absorber le pan).
const rootNodes = computed(() => {
  const visible = visibleWorldRect.value
  const allNodes = graphStore.nodes as Record<string, import('../../types').Node>
  return graphStore.rootNodes.filter((n) => isNodeVisible(n, allNodes, visible))
})

// L'overlay d'onboarding ne s'affiche QUE quand le graphe est strictement
// vide (zéro noeud, peu importe la sélection ou le viewport). On ne se base
// pas sur rootNodes filtrés pour éviter un faux empty-state si l'utilisateur
// panne loin de son contenu.
const isGraphEmpty = computed(() => Object.keys(graphStore.nodes).length === 0)

// --- Drop depuis la sidebar ---
function handleDrop(event: DragEvent) {
  event.preventDefault()
  const itemJSON = event.dataTransfer?.getData('application/json')
  if (!itemJSON || !svgRoot.value) return

  const item = JSON.parse(itemJSON)
  // screenToLocalCoordinates retourne désormais des coordonnées monde
  // (pan/zoom déjà défaits).
  const { x, y } = screenToLocalCoordinates(event.clientX, event.clientY, svgRoot.value, null)

  graphStore.createNode({ ...item, geometry: { ...item.geometry, x, y } }, null)
}

function handleDragOver(event: DragEvent) {
  event.preventDefault()
}

// --- Zoom avec la molette ---
function handleWheel(event: WheelEvent) {
  event.preventDefault()
  const zoomFactor = event.deltaY > 0 ? 0.9 : 1.1
  if (!svgRoot.value) {
    zoomAroundScreenPoint(zoomFactor, 0, 0)
    return
  }
  const rect = svgRoot.value.getBoundingClientRect()
  zoomAroundScreenPoint(zoomFactor, event.clientX - rect.left, event.clientY - rect.top)
}

// --- Pan, marquee de sélection, et clic sur fond ---
function handleMouseDown(event: MouseEvent) {
  // Clic milieu pour pan
  if (event.button === 1) {
    event.preventDefault()
    isPanning.value = true
    lastMousePos.value = { x: event.clientX, y: event.clientY }
    return
  }

  // Clic gauche sur le fond
  if (event.button === 0) {
    const target = event.target as Element
    const isCanvasClick =
      target.tagName === 'svg' ||
      target.classList.contains('canvas-root') ||
      target.classList.contains('canvas-background')

    if (!isCanvasClick) return
    event.preventDefault()

    // Shift+drag = sélection rectangle (marquee).
    // Sinon = pan classique.
    if (event.shiftKey && svgRoot.value) {
      const { x: worldX, y: worldY } = screenToWorld(event.clientX, event.clientY)
      marquee.value = { startX: worldX, startY: worldY, endX: worldX, endY: worldY }
    } else {
      // Désélectionner si clic simple sur le fond sans modificateur
      if (!event.ctrlKey && !event.metaKey) {
        clearSelection()
      }
      isPanning.value = true
      lastMousePos.value = { x: event.clientX, y: event.clientY }
    }
  }
}

function handleMouseMoveRaw(event: MouseEvent) {
  if (isPanning.value) {
    const dx = event.clientX - lastMousePos.value.x
    const dy = event.clientY - lastMousePos.value.y
    pan.value.x += dx
    pan.value.y += dy
    lastMousePos.value = { x: event.clientX, y: event.clientY }
  }

  if (marquee.value && svgRoot.value) {
    const { x: worldX, y: worldY } = screenToWorld(event.clientX, event.clientY)
    marquee.value.endX = worldX
    marquee.value.endY = worldY
  }

  // Mise à jour de l'aperçu de connexion : on lit la ligne fantôme tant que
  // le mode connexion est actif, sinon on s'assure de nettoyer (cas typique :
  // toggle off du mode pendant qu'un pointermove est en vol → sans cette
  // remise à null, l'aperçu restait dessiné).
  if (connectionMode.value && connectionSource.value && svgRoot.value) {
    connectionPreview.value = screenToLocalCoordinates(
      event.clientX,
      event.clientY,
      svgRoot.value,
      null
    )
  } else if (connectionPreview.value) {
    connectionPreview.value = null
  }
}

// Tous les coûts visuels du mousemove (pan, marquee, aperçu de connexion) se
// matérialisent au rendu suivant. Throttler à 1 fois par frame divise par 2 à 4
// le nombre de mutations sans perte de fluidité perçue.
const handleMouseMove = rafThrottle(handleMouseMoveRaw)

function handleMouseUp(event: MouseEvent) {
  isPanning.value = false

  if (marquee.value) {
    commitMarqueeSelection(event.ctrlKey || event.metaKey)
    marquee.value = null
  }
}

/** Convertit des coordonnées écran en coordonnées monde (après pan/zoom). */
function screenToWorld(screenX: number, screenY: number): { x: number; y: number } {
  if (!svgRoot.value) return { x: 0, y: 0 }
  return screenToLocalCoordinates(screenX, screenY, svgRoot.value, null)
}

/** Rectangle normalisé du marquee en espace monde. */
const marqueeRect = computed(() => {
  if (!marquee.value) return null
  const { startX, startY, endX, endY } = marquee.value
  return {
    x: Math.min(startX, endX),
    y: Math.min(startY, endY),
    w: Math.abs(endX - startX),
    h: Math.abs(endY - startY),
  }
})

/** Commit la sélection courante à partir du rectangle marquee. */
function commitMarqueeSelection(addToSelection: boolean) {
  const rect = marqueeRect.value
  if (!rect || (rect.w < 2 && rect.h < 2)) return

  const hits: string[] = []
  for (const node of Object.values(graphStore.nodes)) {
    const abs = getNodeAbsolutePosition(node.id)
    if (!abs) continue
    // Intersection de bounding box (pas inclusion stricte, plus naturel).
    const nx1 = abs.x
    const ny1 = abs.y
    const nx2 = abs.x + node.geometry.w
    const ny2 = abs.y + node.geometry.h
    const intersects =
      nx1 < rect.x + rect.w && nx2 > rect.x && ny1 < rect.y + rect.h && ny2 > rect.y
    if (intersects) hits.push(node.id)
  }

  if (!addToSelection) selectedNodeIds.value.clear()
  for (const id of hits) selectedNodeIds.value.add(id)
}

// --- Halos de groupes ---
// Pour chaque groupe non vide, calculer la bounding box englobante de ses membres.
interface GroupHalo {
  id: string
  name: string
  color: string
  x: number
  y: number
  w: number
  h: number
}

const GROUP_PALETTE = [
  '#3b82f6',
  '#10b981',
  '#f59e0b',
  '#ef4444',
  '#8b5cf6',
  '#ec4899',
  '#14b8a6',
  '#f97316',
]

function colorForGroup(groupId: string, explicit?: string): string {
  if (explicit) return explicit
  // Hash simple de l'ID pour palette stable.
  let h = 0
  for (let i = 0; i < groupId.length; i++) h = (h * 31 + groupId.charCodeAt(i)) | 0
  return GROUP_PALETTE[Math.abs(h) % GROUP_PALETTE.length]
}

// Guides de magnétisme actifs, transformés en coordonnées monde pour le rendu.
// Le snap opère en coordonnées locales au parent du noeud traîné ; on remonte
// la hiérarchie pour obtenir la position absolue du guide.
const worldSnapGuides = computed(() => {
  return snapGuides.value.map((guide) => {
    let offsetX = 0
    let offsetY = 0
    if (guide.sourceNodeId) {
      const source = graphStore.nodes[guide.sourceNodeId]
      if (source?.parentId) {
        const parentAbs = getNodeAbsolutePosition(source.parentId)
        if (parentAbs) {
          offsetX = parentAbs.x
          offsetY = parentAbs.y
        }
      }
    }
    return {
      type: guide.type,
      // Coordonnée monde de la ligne, extension sur tout l'écran via des valeurs
      // géantes pour simplifier (le clipping viewport SVG fait le reste).
      position: guide.position + (guide.type === 'vertical' ? offsetX : offsetY),
    }
  })
})

const groupHalos = computed((): GroupHalo[] => {
  const halos: GroupHalo[] = []
  const PADDING = 8
  for (const group of groups.value.values()) {
    if (group.nodeIds.size < 2) continue

    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity
    let found = false
    for (const nodeId of group.nodeIds) {
      const node = graphStore.nodes[nodeId]
      if (!node) continue
      const abs = getNodeAbsolutePosition(nodeId)
      if (!abs) continue
      found = true
      minX = Math.min(minX, abs.x)
      minY = Math.min(minY, abs.y)
      maxX = Math.max(maxX, abs.x + node.geometry.w)
      maxY = Math.max(maxY, abs.y + node.geometry.h)
    }
    if (!found) continue

    halos.push({
      id: group.id,
      name: group.name,
      color: colorForGroup(group.id, group.color),
      x: minX - PADDING,
      y: minY - PADDING,
      w: maxX - minX + PADDING * 2,
      h: maxY - minY + PADDING * 2,
    })
  }
  return halos
})

// --- Menu contextuel ---
function openNodeContextMenu(payload: { nodeId: string; x: number; y: number }) {
  const { nodeId, x, y } = payload
  const hasMulti = selectedNodeIds.value.size > 1
  const gid = graphStore.nodes[nodeId]?.data?.groupId as string | undefined

  const items: ContextMenuItem[] = [
    {
      label: t('menu.duplicate'),
      shortcut: 'Ctrl+D',
      icon: '⎘',
      action: () => {
        void duplicate()
      },
    },
    {
      label: t('menu.copy'),
      shortcut: 'Ctrl+C',
      icon: '⧉',
      action: () => copy(),
    },
    {
      label: t('menu.cut'),
      shortcut: 'Ctrl+X',
      icon: '✂',
      action: () => cut(),
    },
    {
      label: t('menu.paste'),
      shortcut: 'Ctrl+V',
      icon: '📋',
      disabled: !canPaste(),
      action: () => {
        void paste()
      },
    },
    { label: '', separator: true },
    {
      label: hasMulti ? t('menu.group') : t('menu.groupRequires'),
      shortcut: 'Ctrl+G',
      icon: '◫',
      disabled: !hasMulti,
      action: () => createGroupFromSelection(),
    },
    {
      label: t('menu.ungroup'),
      shortcut: 'Ctrl+Maj+G',
      disabled: !gid,
      action: () => {
        if (gid) dissolveGroup(gid)
      },
    },
    { label: '', separator: true },
    {
      label: t('menu.addToLibrary'),
      icon: '📚',
      action: () => addSelectionToLibrary(nodeId),
    },
    { label: '', separator: true },
    {
      label: t('common.delete'),
      shortcut: 'Suppr',
      icon: '🗑',
      danger: true,
      action: () => {
        for (const id of Array.from(selectedNodeIds.value)) graphStore.deleteNode(id)
        clearSelection()
      },
    },
  ]

  contextMenu.value = { x, y, items }
}

function openBackgroundContextMenu(event: MouseEvent) {
  event.preventDefault()
  const items: ContextMenuItem[] = [
    {
      label: t('menu.pasteHere'),
      shortcut: 'Ctrl+V',
      icon: '📋',
      disabled: !canPaste(),
      action: () => {
        void paste()
      },
    },
    { label: '', separator: true },
    {
      label: t('menu.selectAll'),
      shortcut: 'Ctrl+A',
      action: () => {
        selectedNodeIds.value = new Set(Object.keys(graphStore.nodes))
      },
    },
    {
      label: t('menu.deselect'),
      shortcut: 'Échap',
      disabled: selectedNodeIds.value.size === 0,
      action: () => clearSelection(),
    },
  ]
  contextMenu.value = { x: event.clientX, y: event.clientY, items }
}

async function addSelectionToLibrary(fallbackNodeId: string) {
  // Si sélection multiple, on ajoute uniquement la racine cliquée pour
  // éviter de polluer la bibliothèque avec des variantes incomplètes.
  const node = graphStore.nodes[fallbackNodeId]
  if (!node) return
  const defaultName = (node.data?.name as string) ?? t('library.defaultBlockName')
  const name = window.prompt(t('library.blockNamePrompt'), defaultName)
  if (!name) return
  await libraryStore.addFromNode(node, name)
}

function handleSvgContextMenu(event: MouseEvent) {
  const target = event.target as Element
  const isCanvasClick =
    target.tagName === 'svg' ||
    target.classList.contains('canvas-root') ||
    target.classList.contains('canvas-background')
  if (isCanvasClick) openBackgroundContextMenu(event)
}

// --- Mode connexion ---
// Message diffusé aux lecteurs d'écran via aria-live, mis à jour aux
// transitions de mode importantes.
const liveAnnouncement = ref('')

function startConnection(nodeId: string) {
  connectionMode.value = true
  connectionSource.value = nodeId
  liveAnnouncement.value = t('canvas.connectionStarted') || 'Mode connexion activé'
}

function finishConnection(targetId: string) {
  if (connectionSource.value && connectionSource.value !== targetId) {
    graphStore.createEdge(connectionSource.value, targetId)
    liveAnnouncement.value = t('canvas.connectionCreated') || 'Connexion créée'
  }
  cancelConnection()
}

function cancelConnection() {
  if (connectionMode.value) {
    liveAnnouncement.value = t('canvas.connectionCancelled') || 'Mode connexion annulé'
  }
  connectionMode.value = false
  connectionSource.value = null
  connectionPreview.value = null
}

// Gestion des touches clavier
function handleKeyDown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    cancelConnection()
    if (marquee.value) marquee.value = null
    if (searchOpen.value) searchOpen.value = false
  }

  // Ignorer les raccourcis pendant l'édition de texte, SAUF Ctrl+F
  // qui doit toujours pouvoir ouvrir le panneau de recherche.
  const target = event.target as HTMLElement | null
  const isEditingText =
    target &&
    (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)

  // Ctrl+F : ouvrir la recherche globale (priorité sur la recherche navigateur).
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'f') {
    event.preventDefault()
    searchOpen.value = true
    return
  }

  if (isEditingText) return

  // Navigation spatiale (WCAG 2.1.1 + 2.1.2) : flèches déplacent le focus
  // vers le voisin le plus proche dans la direction donnée. Aucune
  // modification de sélection ; combinables avec Espace/Enter pour activer.
  if (
    event.key === 'ArrowUp' ||
    event.key === 'ArrowDown' ||
    event.key === 'ArrowLeft' ||
    event.key === 'ArrowRight'
  ) {
    const direction =
      event.key === 'ArrowUp'
        ? 'up'
        : event.key === 'ArrowDown'
          ? 'down'
          : event.key === 'ArrowLeft'
            ? 'left'
            : 'right'
    event.preventDefault()
    focusInDirection(direction)
    return
  }

  // Ctrl+G : grouper la sélection. Ctrl+Shift+G : dégrouper.
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'g') {
    event.preventDefault()
    if (event.shiftKey) {
      // Dégrouper : dissoudre chaque groupe touché par la sélection
      const affected = new Set<string>()
      for (const nodeId of selectedNodeIds.value) {
        const gid = graphStore.nodes[nodeId]?.data?.groupId as string | undefined
        if (gid) affected.add(gid)
      }
      for (const gid of affected) dissolveGroup(gid)
    } else if (selectedNodeIds.value.size >= 2) {
      createGroupFromSelection()
    }
  }
}

// --- Taille du container (pour la minimap et zoom to fit) ---
const container = ref<HTMLDivElement | null>(null)
const containerSize = ref({ w: 800, h: 600 })
let resizeObserver: ResizeObserver | null = null

function updateContainerSize() {
  if (!container.value) return
  const rect = container.value.getBoundingClientRect()
  containerSize.value = { w: rect.width, h: rect.height }
  // Publier la taille au viewport pour que tout le monde (notamment le culling
  // des noeuds dans NodeRenderer) accède au rectangle visible monde.
  setCanvasSize(rect.width, rect.height)
}

onMounted(() => {
  window.addEventListener('keydown', handleKeyDown)
  window.addEventListener('pointerup', handleMouseUp)
  updateContainerSize()
  if (container.value && 'ResizeObserver' in window) {
    resizeObserver = new ResizeObserver(updateContainerSize)
    resizeObserver.observe(container.value)
  }
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown)
  window.removeEventListener('pointerup', handleMouseUp)
  resizeObserver?.disconnect()
})

// Exposer la ref SVG pour l'export
defineExpose({ svgRoot, pan, zoomLevel })
</script>

<template>
  <div
    ref="container"
    class="graph-canvas-container flex-grow h-full app-surface overflow-hidden relative"
    @drop="handleDrop"
    @dragover="handleDragOver"
  >
    <!-- Indicateur de mode connexion -->
    <div
      v-if="connectionMode"
      class="absolute top-2 left-1/2 -translate-x-1/2 bg-blue-500 text-white px-3 py-1 rounded-full text-sm z-10"
      role="status"
    >
      {{ t('canvas.connectionMode') }}
    </div>

    <!-- Région ARIA live pour annonces aux lecteurs d'écran (changement de
         mode, raccourcis...). Visuellement masquée, lue par AT. -->
    <div aria-live="polite" aria-atomic="true" class="sr-only">
      {{ liveAnnouncement }}
    </div>

    <!-- Onboarding : carte centrée sur le canevas tant qu'aucun noeud n'existe.
         Couvre les trois chemins de démarrage (drag, import, F1) et liste les
         raccourcis non évidents (Shift+drag, Shift+clic, Alt). -->
    <CanvasEmptyState :visible="isGraphEmpty" />

    <svg
      ref="svgRoot"
      width="100%"
      height="100%"
      role="application"
      :aria-label="t('canvas.ariaLabel')"
      @wheel="handleWheel"
      @pointerdown="handleMouseDown"
      @pointermove="handleMouseMove"
      @contextmenu="handleSvgContextMenu"
      :class="['graph-canvas', { 'cursor-grab': !isPanning, 'cursor-grabbing': isPanning }]"
    >
      <!-- Définition de la grille (pattern SVG) et marqueur d'aperçu de connexion -->
      <defs>
        <pattern
          id="canvas-grid"
          :width="snapConfig.gridSize"
          :height="snapConfig.gridSize"
          patternUnits="userSpaceOnUse"
        >
          <path
            :d="`M ${snapConfig.gridSize} 0 L 0 0 0 ${snapConfig.gridSize}`"
            fill="none"
            stroke="var(--grid)"
            stroke-width="1"
            vector-effect="non-scaling-stroke"
          />
        </pattern>
        <!-- Flèche de l'aperçu de connexion en cours -->
        <marker
          id="connection-preview-arrow"
          markerWidth="12"
          markerHeight="12"
          refX="10"
          refY="6"
          orient="auto"
          markerUnits="userSpaceOnUse"
        >
          <path d="M 0 0 L 10 6 L 0 12 Z" fill="var(--accent-selected)" />
        </marker>
      </defs>

      <g :transform="transform" class="canvas-root">
        <!-- Rectangle de fond pour capturer les clics sur le canvas vide -->
        <rect
          x="-10000"
          y="-10000"
          width="20000"
          height="20000"
          :fill="snapConfig.snapToGrid ? 'url(#canvas-grid)' : 'transparent'"
          class="canvas-background"
        />

        <!-- Guides de magnétisme actifs -->
        <g class="snap-guides pointer-events-none">
          <line
            v-for="(guide, i) in worldSnapGuides"
            :key="i"
            :x1="guide.type === 'vertical' ? guide.position : -10000"
            :y1="guide.type === 'horizontal' ? guide.position : -10000"
            :x2="guide.type === 'vertical' ? guide.position : 10000"
            :y2="guide.type === 'horizontal' ? guide.position : 10000"
            stroke="var(--accent-guide)"
            stroke-width="1"
            stroke-dasharray="4,3"
            vector-effect="non-scaling-stroke"
          />
        </g>

        <!-- Halos de groupes (sous les noeuds, au-dessus du fond) -->
        <g class="group-halos pointer-events-none">
          <g v-for="halo in groupHalos" :key="halo.id">
            <rect
              :x="halo.x"
              :y="halo.y"
              :width="halo.w"
              :height="halo.h"
              :stroke="halo.color"
              :fill="halo.color"
              fill-opacity="0.08"
              stroke-width="1.5"
              stroke-dasharray="6,4"
              rx="6"
              vector-effect="non-scaling-stroke"
            />
            <text
              :x="halo.x + 6 * fontMul"
              :y="halo.y - 4 * fontMul"
              :fill="halo.color"
              :font-size="11 * fontMul"
              font-weight="600"
            >
              {{ halo.name }}
            </text>
          </g>
        </g>

        <!-- Rendu récursif des noeuds racines -->
        <NodeRenderer
          v-for="node in rootNodes"
          :key="node.id"
          :node-id="node.id"
          :connection-mode="connectionMode"
          :zoom-level="zoomLevel"
          @start-connection="startConnection"
          @finish-connection="finishConnection"
          @context-menu="openNodeContextMenu"
          @open-type-picker="openTypePicker"
        />

        <!-- Calque des arêtes (au-dessus des noeuds pour que les flèches
             restent visibles même quand elles passent sur un bloc). -->
        <EdgeLayer />

        <!-- Aperçu de la connexion en cours (au-dessus de tout) -->
        <g
          v-if="connectionMode && connectionSource && connectionPreview"
          class="pointer-events-none"
        >
          <line
            :x1="connectionSourceCenter.x"
            :y1="connectionSourceCenter.y"
            :x2="connectionPreview.x"
            :y2="connectionPreview.y"
            stroke="var(--accent-selected)"
            stroke-width="3"
            stroke-dasharray="6,4"
            vector-effect="non-scaling-stroke"
            marker-end="url(#connection-preview-arrow)"
          >
            <animate
              attributeName="stroke-dashoffset"
              from="0"
              to="20"
              dur="0.6s"
              repeatCount="indefinite"
            />
          </line>
          <!-- Point pulsant à l'extrémité suivant le curseur -->
          <circle
            :cx="connectionPreview.x"
            :cy="connectionPreview.y"
            r="6"
            fill="var(--accent-selected)"
            fill-opacity="0.3"
            stroke="var(--accent-selected)"
            stroke-width="2"
            vector-effect="non-scaling-stroke"
          >
            <animate attributeName="r" values="4;8;4" dur="1s" repeatCount="indefinite" />
          </circle>
        </g>

        <!-- Rectangle de sélection (marquee) -->
        <rect
          v-if="marqueeRect"
          :x="marqueeRect.x"
          :y="marqueeRect.y"
          :width="marqueeRect.w"
          :height="marqueeRect.h"
          fill="var(--accent-selected)"
          fill-opacity="0.1"
          stroke="var(--accent-selected)"
          stroke-width="1"
          stroke-dasharray="4,3"
          vector-effect="non-scaling-stroke"
          class="pointer-events-none"
        />
      </g>
    </svg>

    <!-- Fil d'Ariane (coin supérieur gauche) -->
    <Breadcrumb :canvas-width="containerSize.w" :canvas-height="containerSize.h" />

    <!-- Panneau de recherche (Ctrl+F) -->
    <SearchPanel
      v-if="searchOpen"
      :canvas-width="containerSize.w"
      :canvas-height="containerSize.h"
      @close="searchOpen = false"
    />

    <!-- Minimap (coin inférieur droit) -->
    <Minimap
      class="absolute bottom-3 right-3 z-10"
      :canvas-width="containerSize.w"
      :canvas-height="containerSize.h"
    />

    <!-- Menu contextuel (clic droit) -->
    <ContextMenu
      v-if="contextMenu"
      :x="contextMenu.x"
      :y="contextMenu.y"
      :items="contextMenu.items"
      @close="closeContextMenu"
    />

    <!-- Sélecteur de type Archimate, rendu en HTML overlay pour taille
         constante au zoom. Positionné à droite du chip qui a émis l'event. -->
    <div
      v-if="typePicker"
      class="fixed z-40"
      :style="{ left: typePicker.x + 8 + 'px', top: typePicker.y - 200 + 'px' }"
    >
      <NodeArchimateTypePicker
        :current-type="typePickerCurrent"
        @select="(t) => typePicker && applyTypeToNode(typePicker.nodeId, t)"
        @close="closeTypePicker"
      />
    </div>
  </div>
</template>
