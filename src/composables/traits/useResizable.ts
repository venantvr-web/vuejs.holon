// src/composables/traits/useResizable.ts
import { ref, computed, onMounted, onUnmounted, getCurrentInstance, type Ref } from 'vue';
import { useGraphStore } from '../../stores/graph';

/**
 * Configuration du dimensionnement automatique.
 */
export interface AutosizeConfig {
  /** Active le dimensionnement automatique */
  enabled: boolean;
  /** Marge intérieure de base en pixels (à zoom 1) */
  padding: number;
  /** Marge supérieure pour laisser place au label parent */
  paddingTop: number;
  /** Indique si la marge s'adapte au niveau de zoom */
  paddingScaleWithZoom: boolean;
  /** Marge minimale quand zoomé très loin */
  minPaddingAtZoom: number;
  /** Marge maximale quand zoomé très près */
  maxPaddingAtZoom: number;
  /** Durée de l'animation en millisecondes (0 = instantané) */
  animationDuration: number;
  /** Délai avant recalcul pour éviter les recalculs en cascade */
  debounceMs: number;
}

export const DEFAULT_AUTOSIZE_CONFIG: AutosizeConfig = {
  enabled: true,
  padding: 20,
  paddingTop: 35,                // Plus haut pour le label du parent
  paddingScaleWithZoom: true,
  minPaddingAtZoom: 10,
  maxPaddingAtZoom: 40,
  animationDuration: 150,
  debounceMs: 50,
};

/**
 * Options de configuration pour le trait Resizable.
 */
export interface ResizableOptions {
  /** Identifiant réactif du noeud */
  nodeId: Ref<string>;
  /** Niveau de zoom actuel pour ajuster les calculs */
  zoomLevel?: Ref<number>;
  /** Taille minimale autorisée */
  minSize?: number;
  /** Préserve le ratio d'aspect lors du redimensionnement */
  preserveAspectRatio?: boolean;
  /** Configuration du dimensionnement automatique */
  autosizeConfig?: Partial<AutosizeConfig>;
  /** Callback appelé au début du redimensionnement */
  onResizeStart?: () => void;
  /** Callback appelé à la fin du redimensionnement */
  onResizeEnd?: () => void;
  /** Callback appelé après application de l'autosize */
  onAutosizeApplied?: (bounds: ChildrenBounds) => void;
}

/**
 * État réactif géré par le trait Resizable.
 */
export interface ResizableState {
  /** Indique si un redimensionnement manuel est en cours */
  isResizing: Ref<boolean>;
  /** Indique si le dimensionnement automatique est actif */
  autosize: Ref<boolean>;
  /** Configuration complète de l'autosize */
  autosizeConfig: Ref<AutosizeConfig>;
  /** Limites calculées des enfants */
  childrenBounds: Ref<ChildrenBounds | null>;
  /** Marge effective tenant compte du zoom */
  effectivePadding: Ref<number>;
}

/**
 * Gestionnaires d'actions fournis par le trait Resizable.
 */
export interface ResizableHandlers {
  /** Démarre un redimensionnement manuel par drag */
  handleResizeStart: (event: MouseEvent) => void;
  /** Active ou désactive le dimensionnement automatique */
  setAutosize: (enabled: boolean) => void;
  /** Met à jour la configuration de l'autosize */
  setAutosizeConfig: (config: Partial<AutosizeConfig>) => void;
  /** Applique immédiatement le dimensionnement automatique */
  applyAutosize: () => void;
  /** Calcule les limites rectangulaires englobant tous les enfants */
  calculateChildrenBounds: () => ChildrenBounds | null;
  /** Ajuste la taille du conteneur pour englober tous les enfants */
  fitToChildren: () => void;
  /** Agrandit le conteneur si un enfant dépasse */
  expandToFitChild: (childId: string) => void;
}

/**
 * Limites rectangulaires englobant tous les enfants d'un conteneur.
 */
export interface ChildrenBounds {
  /** Coordonnée X minimale */
  minX: number;
  /** Coordonnée Y minimale */
  minY: number;
  /** Coordonnée X maximale */
  maxX: number;
  /** Coordonnée Y maximale */
  maxY: number;
  /** Largeur de la zone englobante */
  width: number;
  /** Hauteur de la zone englobante */
  height: number;
  /** Nombre d'enfants */
  childCount: number;
}

interface GeometrySnapshot {
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * Ajoute la capacité de redimensionnement manuel et automatique à un conteneur.
 *
 * Gère le redimensionnement manuel par drag avec mise à l'échelle proportionnelle
 * des enfants, et le dimensionnement automatique (autosize) qui ajuste la taille
 * du conteneur pour englober tous ses enfants avec des marges configurables.
 * Les marges s'adaptent au niveau de zoom pour une meilleure UX.
 *
 * @param options - Configuration du trait
 * @returns État réactif et gestionnaires pour le redimensionnement
 *
 * @example
 * ```ts
 * const { autosize, setAutosize, fitToChildren } = useResizable({ nodeId });
 * setAutosize(true); // Active l'autosize
 * fitToChildren(); // Ajuste immédiatement la taille
 * ```
 */
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

  // Padding top effectif (pour laisser place au label du parent)
  const effectivePaddingTop = computed(() => {
    const config = autosizeConfigRef.value;
    const zoom = options.zoomLevel?.value ?? 1;

    if (!config.paddingScaleWithZoom) {
      return config.paddingTop;
    }

    const scaledPadding = config.paddingTop * Math.sqrt(zoom);
    return Math.max(
      config.minPaddingAtZoom,
      Math.min(config.maxPaddingAtZoom * 1.5, scaledPadding)
    );
  });

  // Bounds des enfants (calculé)
  const childrenBounds = ref<ChildrenBounds | null>(null);

  // Debounce pour autosize
  let autosizeTimeout: ReturnType<typeof setTimeout> | null = null;
  // Autosize suspendu le temps d'un resize manuel (restauré au mouseup).
  let autosizeSuspended = false;

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

    // Suspendre l'autosize PENDANT le resize manuel uniquement ; il est
    // restauré dans handleResizeEnd. Comme l'état est persisté dans
    // node.data, l'oublier rendait la désactivation définitive.
    autosizeSuspended = autosize.value;
    if (autosizeSuspended) {
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

    // Restaurer l'autosize suspendu au début du resize.
    if (autosizeSuspended) {
      autosizeSuspended = false;
      autosize.value = true;
    }

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
    const paddingTop = effectivePaddingTop.value;

    // === STRATÉGIE D'ENGLOBEMENT ===
    //
    // Les bounds donnent la zone rectangulaire couverte par tous les enfants:
    //   - minX, minY : coin supérieur gauche de la zone enfants
    //   - maxX, maxY : coin inférieur droit de la zone enfants
    //   - width, height : taille de la zone (maxX - minX, maxY - minY)
    //
    // Le parent doit englober cette zone avec un padding sur tous les côtés.
    // Le padding top est plus grand pour laisser place au label du parent.
    //
    // Si les enfants ne sont pas positionnés correctement,
    // on les décale tous pour qu'ils respectent les paddings.

    // Taille nécessaire pour englober tous les enfants + padding
    // Hauteur = paddingTop + hauteur_enfants + padding (bas)
    const newW = Math.max(minSize, bounds.width + padding * 2);
    const newH = Math.max(minSize, bounds.height + paddingTop + padding);

    // Décalage à appliquer aux enfants pour que le premier enfant (minX, minY)
    // soit positionné à (padding, paddingTop) dans le parent
    const childOffsetX = padding - bounds.minX;
    const childOffsetY = paddingTop - bounds.minY;

    // Appliquer le décalage aux enfants si nécessaire
    if (Math.abs(childOffsetX) > 0.5 || Math.abs(childOffsetY) > 0.5) {
      const children = Object.values(graphStore.nodes).filter(
        n => n.parentId === options.nodeId.value
      );

      for (const child of children) {
        graphStore.updateNode(child.id, {
          geometry: {
            ...child.geometry,
            x: child.geometry.x + childOffsetX,
            y: child.geometry.y + childOffsetY,
          },
        });
      }
    }

    // Mettre à jour la taille du parent
    const geometryChanged =
      Math.abs(node.geometry.w - newW) > 1 ||
      Math.abs(node.geometry.h - newH) > 1;

    if (geometryChanged) {
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

  function fitToChildren() {
    // Ajustement ponctuel : activer le temps d'appliquer, puis restaurer
    // l'état persistant. L'ancien paramètre `animate` conditionnait à tort
    // la restauration et activait définitivement l'autosize par défaut.
    const wasAutosize = autosize.value;
    autosize.value = true;
    applyAutosize();
    autosize.value = wasAutosize;
  }

  function expandToFitChild(childId: string) {
    const node = graphStore.nodes[options.nodeId.value];
    const child = graphStore.nodes[childId];

    if (!node || !child || child.parentId !== options.nodeId.value) return;

    const padding = effectivePadding.value;
    const paddingTop = effectivePaddingTop.value;

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

    // Utiliser paddingTop pour la marge supérieure (espace pour le label)
    if (child.geometry.y < paddingTop) {
      const offset = paddingTop - child.geometry.y;
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

  // === ÉCOUTE DES ÉVÉNEMENTS DE DÉPLACEMENT D'ENFANTS ===

  function handleChildMoved(event: Event) {
    const customEvent = event as CustomEvent<{ childId: string; parentId: string }>;
    const { parentId } = customEvent.detail;

    // Vérifier si c'est un de nos enfants
    if (parentId === options.nodeId.value) {
      scheduleAutosize();
    }
  }

  // Enregistrer/désenregistrer l'écouteur d'événements
  // Note: Ces hooks ne sont appelés que dans le contexte d'un composant Vue
  const instance = getCurrentInstance();
  if (instance) {
    onMounted(() => {
      window.addEventListener('child-moved', handleChildMoved);
    });

    onUnmounted(() => {
      window.removeEventListener('child-moved', handleChildMoved);
    });
  } else {
    // Fallback pour les tests ou les appels hors composant
    window.addEventListener('child-moved', handleChildMoved);
  }

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
