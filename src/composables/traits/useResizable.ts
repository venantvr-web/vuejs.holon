// src/composables/traits/useResizable.ts
import { ref, computed, type Ref } from 'vue';
import { useGraphStore } from '../../stores/graph';

// === CONFIGURATION AUTOSIZE ===

export interface AutosizeConfig {
  enabled: boolean;              // Activer l'autosize
  padding: number;               // Marge intérieure de base (en pixels à zoom 1)
  paddingScaleWithZoom: boolean; // La marge s'adapte au zoom
  minPaddingAtZoom: number;      // Padding minimum quand zoomé très loin
  maxPaddingAtZoom: number;      // Padding maximum quand zoomé très près
  animationDuration: number;     // Durée de l'animation en ms (0 = instantané)
  debounceMs: number;            // Délai avant recalcul (évite les recalculs en cascade)
}

export const DEFAULT_AUTOSIZE_CONFIG: AutosizeConfig = {
  enabled: true,
  padding: 20,
  paddingScaleWithZoom: true,
  minPaddingAtZoom: 10,
  maxPaddingAtZoom: 40,
  animationDuration: 150,
  debounceMs: 50,
};

// === OPTIONS ===

export interface ResizableOptions {
  nodeId: Ref<string>;
  zoomLevel?: Ref<number>;
  minSize?: number;
  preserveAspectRatio?: boolean;
  // Autosize
  autosizeConfig?: Partial<AutosizeConfig>;
  onResizeStart?: () => void;
  onResizeEnd?: () => void;
  onAutosizeApplied?: (bounds: ChildrenBounds) => void;
}

export interface ResizableState {
  isResizing: Ref<boolean>;
  autosize: Ref<boolean>;
  autosizeConfig: Ref<AutosizeConfig>;
  childrenBounds: Ref<ChildrenBounds | null>;
  effectivePadding: Ref<number>;
}

export interface ResizableHandlers {
  handleResizeStart: (event: MouseEvent) => void;
  // Autosize
  setAutosize: (enabled: boolean) => void;
  setAutosizeConfig: (config: Partial<AutosizeConfig>) => void;
  applyAutosize: () => void;
  calculateChildrenBounds: () => ChildrenBounds | null;
  fitToChildren: (animate?: boolean) => void;
  expandToFitChild: (childId: string) => void;
}

// === BOUNDS DES ENFANTS ===

export interface ChildrenBounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
  childCount: number;
}

interface GeometrySnapshot {
  x: number;
  y: number;
  w: number;
  h: number;
}

export function useResizable(options: ResizableOptions): ResizableState & ResizableHandlers {
  const graphStore = useGraphStore();
  const minSize = options.minSize ?? 30;

  // État de base
  const isResizing = ref(false);
  const dragStart = ref({ x: 0, y: 0 });
  const initialSize = ref({ w: 0, h: 0 });
  const initialChildrenGeometry = ref<Map<string, GeometrySnapshot>>(new Map());

  // État autosize
  const autosizeConfigRef = ref<AutosizeConfig>({
    ...DEFAULT_AUTOSIZE_CONFIG,
    ...options.autosizeConfig,
  });

  // Autosize activé (stocké dans node.data)
  const autosize = computed({
    get: () => {
      const node = graphStore.nodes[options.nodeId.value];
      return (node?.data?.autosize as boolean) ?? autosizeConfigRef.value.enabled;
    },
    set: (value: boolean) => {
      const node = graphStore.nodes[options.nodeId.value];
      if (node) {
        graphStore.updateNode(options.nodeId.value, {
          data: { ...node.data, autosize: value },
        });
      }
    },
  });

  // Padding effectif selon le zoom
  const effectivePadding = computed(() => {
    const config = autosizeConfigRef.value;
    const zoom = options.zoomLevel?.value ?? 1;

    if (!config.paddingScaleWithZoom) {
      return config.padding;
    }

    // Adapter le padding au zoom
    // À zoom 1: padding normal
    // À zoom < 1 (vue large): padding plus petit
    // À zoom > 1 (vue rapprochée): padding plus grand
    const scaledPadding = config.padding * Math.sqrt(zoom);
    return Math.max(
      config.minPaddingAtZoom,
      Math.min(config.maxPaddingAtZoom, scaledPadding)
    );
  });

  // Bounds des enfants (calculé)
  const childrenBounds = ref<ChildrenBounds | null>(null);

  // Debounce pour autosize
  let autosizeTimeout: ReturnType<typeof setTimeout> | null = null;

  // === RESIZE MANUEL ===

  function collectChildrenGeometry(parentId: string, map: Map<string, GeometrySnapshot>) {
    const children = Object.values(graphStore.nodes).filter(n => n.parentId === parentId);
    for (const child of children) {
      map.set(child.id, { ...child.geometry });
      collectChildrenGeometry(child.id, map);
    }
  }

  function handleResizeStart(event: MouseEvent) {
    event.preventDefault();
    event.stopPropagation();

    const node = graphStore.nodes[options.nodeId.value];
    if (!node) return;

    // Désactiver autosize pendant le resize manuel
    const wasAutosize = autosize.value;
    if (wasAutosize) {
      autosize.value = false;
    }

    isResizing.value = true;
    dragStart.value = { x: event.clientX, y: event.clientY };
    initialSize.value = { w: node.geometry.w, h: node.geometry.h };

    initialChildrenGeometry.value.clear();
    collectChildrenGeometry(options.nodeId.value, initialChildrenGeometry.value);

    options.onResizeStart?.();

    window.addEventListener('mousemove', handleResizeMove);
    window.addEventListener('mouseup', handleResizeEnd);
  }

  function handleResizeMove(event: MouseEvent) {
    if (!isResizing.value) return;

    const node = graphStore.nodes[options.nodeId.value];
    if (!node) return;

    const zoom = options.zoomLevel?.value ?? 1;
    const dx = (event.clientX - dragStart.value.x) / zoom;
    const dy = (event.clientY - dragStart.value.y) / zoom;

    let newW: number;
    let newH: number;

    if (options.preserveAspectRatio) {
      const aspectRatio = initialSize.value.w / initialSize.value.h;
      const diagonal = Math.sqrt(dx * dx + dy * dy);
      const direction = (dx + dy) > 0 ? 1 : -1;
      const scale = 1 + (direction * diagonal * 0.005);

      newW = Math.max(minSize, initialSize.value.w * scale);
      newH = Math.max(minSize, initialSize.value.h * scale);

      if (newW / newH > aspectRatio) {
        newW = newH * aspectRatio;
      } else {
        newH = newW / aspectRatio;
      }
    } else {
      newW = Math.max(minSize, initialSize.value.w + dx);
      newH = Math.max(minSize, initialSize.value.h + dy);
    }

    const scaleX = newW / initialSize.value.w;
    const scaleY = newH / initialSize.value.h;

    graphStore.updateNode(options.nodeId.value, {
      geometry: {
        ...node.geometry,
        w: newW,
        h: newH,
      },
    });

    resizeChildrenFromSnapshot(options.nodeId.value, scaleX, scaleY);
  }

  function resizeChildrenFromSnapshot(parentId: string, scaleX: number, scaleY: number) {
    const children = Object.values(graphStore.nodes).filter(n => n.parentId === parentId);

    for (const child of children) {
      const initial = initialChildrenGeometry.value.get(child.id);
      if (!initial) continue;

      const childMinSize = 20;
      graphStore.updateNode(child.id, {
        geometry: {
          x: initial.x * scaleX,
          y: initial.y * scaleY,
          w: Math.max(childMinSize, initial.w * scaleX),
          h: Math.max(childMinSize, initial.h * scaleY),
        },
      });

      resizeChildrenFromSnapshot(child.id, scaleX, scaleY);
    }
  }

  function handleResizeEnd() {
    isResizing.value = false;
    initialChildrenGeometry.value.clear();
    options.onResizeEnd?.();

    window.removeEventListener('mousemove', handleResizeMove);
    window.removeEventListener('mouseup', handleResizeEnd);
  }

  // === AUTOSIZE ===

  function setAutosize(enabled: boolean) {
    autosize.value = enabled;
    if (enabled) {
      applyAutosize();
    }
  }

  function setAutosizeConfig(config: Partial<AutosizeConfig>) {
    autosizeConfigRef.value = {
      ...autosizeConfigRef.value,
      ...config,
    };
    if (autosize.value) {
      applyAutosize();
    }
  }

  function calculateChildrenBounds(): ChildrenBounds | null {
    const children = Object.values(graphStore.nodes).filter(
      n => n.parentId === options.nodeId.value
    );

    if (children.length === 0) {
      return null;
    }

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    for (const child of children) {
      const { x, y, w, h } = child.geometry;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x + w);
      maxY = Math.max(maxY, y + h);
    }

    return {
      minX,
      minY,
      maxX,
      maxY,
      width: maxX - minX,
      height: maxY - minY,
      childCount: children.length,
    };
  }

  function applyAutosize() {
    if (!autosize.value) return;

    const node = graphStore.nodes[options.nodeId.value];
    if (!node) return;

    const bounds = calculateChildrenBounds();
    childrenBounds.value = bounds;

    if (!bounds) {
      // Pas d'enfants, garder une taille minimum
      return;
    }

    const padding = effectivePadding.value;

    // Calculer la nouvelle taille
    const newW = Math.max(minSize, bounds.width + padding * 2);
    const newH = Math.max(minSize, bounds.height + padding * 2);

    // Calculer le décalage nécessaire pour les enfants
    // (si minX ou minY sont négatifs ou trop petits)
    const offsetX = padding - bounds.minX;
    const offsetY = padding - bounds.minY;

    // Appliquer le décalage aux enfants si nécessaire
    if (Math.abs(offsetX) > 1 || Math.abs(offsetY) > 1) {
      const children = Object.values(graphStore.nodes).filter(
        n => n.parentId === options.nodeId.value
      );

      for (const child of children) {
        graphStore.updateNode(child.id, {
          geometry: {
            ...child.geometry,
            x: child.geometry.x + offsetX,
            y: child.geometry.y + offsetY,
          },
        });
      }
    }

    // Mettre à jour la taille du parent
    if (Math.abs(node.geometry.w - newW) > 1 || Math.abs(node.geometry.h - newH) > 1) {
      graphStore.updateNode(options.nodeId.value, {
        geometry: {
          ...node.geometry,
          w: newW,
          h: newH,
        },
      });

      options.onAutosizeApplied?.(bounds);
    }
  }

  function fitToChildren(animate = true) {
    const wasAutosize = autosize.value;

    // Temporairement activer pour appliquer
    autosize.value = true;
    applyAutosize();

    // Restaurer l'état précédent si pas animé
    if (!animate) {
      autosize.value = wasAutosize;
    }
  }

  function expandToFitChild(childId: string) {
    const node = graphStore.nodes[options.nodeId.value];
    const child = graphStore.nodes[childId];

    if (!node || !child || child.parentId !== options.nodeId.value) return;

    const padding = effectivePadding.value;

    // Vérifier si l'enfant dépasse
    const childRight = child.geometry.x + child.geometry.w + padding;
    const childBottom = child.geometry.y + child.geometry.h + padding;

    let needsUpdate = false;
    let newW = node.geometry.w;
    let newH = node.geometry.h;

    if (childRight > node.geometry.w) {
      newW = childRight;
      needsUpdate = true;
    }

    if (childBottom > node.geometry.h) {
      newH = childBottom;
      needsUpdate = true;
    }

    // Vérifier si l'enfant est trop à gauche ou en haut
    if (child.geometry.x < padding) {
      const offset = padding - child.geometry.x;
      // Décaler tous les enfants
      const children = Object.values(graphStore.nodes).filter(
        n => n.parentId === options.nodeId.value
      );
      for (const c of children) {
        graphStore.updateNode(c.id, {
          geometry: { ...c.geometry, x: c.geometry.x + offset },
        });
      }
      newW += offset;
      needsUpdate = true;
    }

    if (child.geometry.y < padding) {
      const offset = padding - child.geometry.y;
      const children = Object.values(graphStore.nodes).filter(
        n => n.parentId === options.nodeId.value
      );
      for (const c of children) {
        graphStore.updateNode(c.id, {
          geometry: { ...c.geometry, y: c.geometry.y + offset },
        });
      }
      newH += offset;
      needsUpdate = true;
    }

    if (needsUpdate) {
      graphStore.updateNode(options.nodeId.value, {
        geometry: { ...node.geometry, w: newW, h: newH },
      });
    }
  }

  // Watcher pour recalculer quand les enfants changent
  // (nécessite que le parent surveille les modifications)
  function scheduleAutosize() {
    if (!autosize.value) return;

    if (autosizeTimeout) {
      clearTimeout(autosizeTimeout);
    }

    autosizeTimeout = setTimeout(() => {
      applyAutosize();
      autosizeTimeout = null;
    }, autosizeConfigRef.value.debounceMs);
  }

  // Exposer la fonction de scheduling pour utilisation externe
  // (le composant parent peut l'appeler quand un enfant change)
  (window as any).__scheduleAutosize = scheduleAutosize;

  return {
    // State
    isResizing,
    autosize: computed(() => autosize.value),
    autosizeConfig: computed(() => autosizeConfigRef.value),
    childrenBounds: computed(() => childrenBounds.value),
    effectivePadding,
    // Handlers
    handleResizeStart,
    setAutosize,
    setAutosizeConfig,
    applyAutosize,
    calculateChildrenBounds,
    fitToChildren,
    expandToFitChild,
  };
}
