// src/composables/traits/useShapeable.ts
import { computed, type Ref } from 'vue';
import { useGraphStore } from '../../stores/graph';

// Enum des formes disponibles
export enum NodeShape {
  Rectangle = 'rectangle',
  RoundedRectangle = 'rounded-rectangle',
  Ellipse = 'ellipse',
  Circle = 'circle',
  Diamond = 'diamond',
  Hexagon = 'hexagon',
  Octagon = 'octagon',
  Triangle = 'triangle',
  InvertedTriangle = 'inverted-triangle',
  Parallelogram = 'parallelogram',
  Trapezoid = 'trapezoid',
  Pentagon = 'pentagon',
  Star = 'star',
  Cloud = 'cloud',
  Cylinder = 'cylinder',
  Document = 'document',
  Folder = 'folder',
  Note = 'note',
  Actor = 'actor',
  // Formes Archimate spécifiques
  ArchimateBehavior = 'archimate-behavior',
  ArchimateInterface = 'archimate-interface',
  ArchimateService = 'archimate-service',
  ArchimateProcess = 'archimate-process',
}

// Metadata pour chaque forme
export const SHAPE_METADATA: Record<
  NodeShape,
  {
    label: string;
    category: 'basic' | 'polygon' | 'archimate' | 'special';
    defaultAspectRatio?: number; // Si défini, la forme a un ratio fixe
  }
> = {
  [NodeShape.Rectangle]: { label: 'Rectangle', category: 'basic' },
  [NodeShape.RoundedRectangle]: { label: 'Rectangle arrondi', category: 'basic' },
  [NodeShape.Ellipse]: { label: 'Ellipse', category: 'basic' },
  [NodeShape.Circle]: { label: 'Cercle', category: 'basic', defaultAspectRatio: 1 },
  [NodeShape.Diamond]: { label: 'Losange', category: 'polygon' },
  [NodeShape.Hexagon]: { label: 'Hexagone', category: 'polygon' },
  [NodeShape.Octagon]: { label: 'Octogone', category: 'polygon' },
  [NodeShape.Triangle]: { label: 'Triangle', category: 'polygon' },
  [NodeShape.InvertedTriangle]: { label: 'Triangle inversé', category: 'polygon' },
  [NodeShape.Parallelogram]: { label: 'Parallélogramme', category: 'polygon' },
  [NodeShape.Trapezoid]: { label: 'Trapèze', category: 'polygon' },
  [NodeShape.Pentagon]: { label: 'Pentagone', category: 'polygon' },
  [NodeShape.Star]: { label: 'Étoile', category: 'special' },
  [NodeShape.Cloud]: { label: 'Nuage', category: 'special' },
  [NodeShape.Cylinder]: { label: 'Cylindre', category: 'special' },
  [NodeShape.Document]: { label: 'Document', category: 'special' },
  [NodeShape.Folder]: { label: 'Dossier', category: 'special' },
  [NodeShape.Note]: { label: 'Note', category: 'special' },
  [NodeShape.Actor]: { label: 'Acteur', category: 'special', defaultAspectRatio: 0.5 },
  [NodeShape.ArchimateBehavior]: { label: 'Comportement', category: 'archimate' },
  [NodeShape.ArchimateInterface]: { label: 'Interface', category: 'archimate' },
  [NodeShape.ArchimateService]: { label: 'Service', category: 'archimate' },
  [NodeShape.ArchimateProcess]: { label: 'Processus', category: 'archimate' },
};

export interface ShapeableOptions {
  nodeId: Ref<string>;
}

export interface ShapeableState {
  shape: Ref<NodeShape>;
  shapePath: Ref<string>;
  shapeLabel: Ref<string>;
  shapeCategory: Ref<string>;
}

export interface ShapeableHandlers {
  setShape: (shape: NodeShape) => void;
  resetShape: () => void;
}

// Génère le path SVG pour une forme donnée
export function generateShapePath(shape: NodeShape, width: number, height: number): string {
  const w = width;
  const h = height;
  const cx = w / 2;
  const cy = h / 2;

  switch (shape) {
    case NodeShape.Rectangle:
      return `M 0 0 L ${w} 0 L ${w} ${h} L 0 ${h} Z`;

    case NodeShape.RoundedRectangle: {
      const r = Math.min(8, w / 4, h / 4);
      return `M ${r} 0 L ${w - r} 0 Q ${w} 0 ${w} ${r} L ${w} ${h - r} Q ${w} ${h} ${w - r} ${h} L ${r} ${h} Q 0 ${h} 0 ${h - r} L 0 ${r} Q 0 0 ${r} 0 Z`;
    }

    case NodeShape.Ellipse:
      return `M ${cx} 0 A ${cx} ${cy} 0 1 1 ${cx} ${h} A ${cx} ${cy} 0 1 1 ${cx} 0 Z`;

    case NodeShape.Circle: {
      const r = Math.min(cx, cy);
      return `M ${cx} ${cy - r} A ${r} ${r} 0 1 1 ${cx} ${cy + r} A ${r} ${r} 0 1 1 ${cx} ${cy - r} Z`;
    }

    case NodeShape.Diamond:
      return `M ${cx} 0 L ${w} ${cy} L ${cx} ${h} L 0 ${cy} Z`;

    case NodeShape.Hexagon: {
      const inset = w / 4;
      return `M ${inset} 0 L ${w - inset} 0 L ${w} ${cy} L ${w - inset} ${h} L ${inset} ${h} L 0 ${cy} Z`;
    }

    case NodeShape.Octagon: {
      const o = Math.min(w, h) / 4;
      return `M ${o} 0 L ${w - o} 0 L ${w} ${o} L ${w} ${h - o} L ${w - o} ${h} L ${o} ${h} L 0 ${h - o} L 0 ${o} Z`;
    }

    case NodeShape.Triangle:
      return `M ${cx} 0 L ${w} ${h} L 0 ${h} Z`;

    case NodeShape.InvertedTriangle:
      return `M 0 0 L ${w} 0 L ${cx} ${h} Z`;

    case NodeShape.Parallelogram: {
      const skew = w / 5;
      return `M ${skew} 0 L ${w} 0 L ${w - skew} ${h} L 0 ${h} Z`;
    }

    case NodeShape.Trapezoid: {
      const inset = w / 5;
      return `M ${inset} 0 L ${w - inset} 0 L ${w} ${h} L 0 ${h} Z`;
    }

    case NodeShape.Pentagon: {
      const angle = (Math.PI * 2) / 5;
      const startAngle = -Math.PI / 2;
      const r = Math.min(cx, cy);
      let path = '';
      for (let i = 0; i < 5; i++) {
        const a = startAngle + i * angle;
        const x = cx + r * Math.cos(a);
        const y = cy + r * Math.sin(a);
        path += i === 0 ? `M ${x} ${y}` : ` L ${x} ${y}`;
      }
      return path + ' Z';
    }

    case NodeShape.Star: {
      const outerR = Math.min(cx, cy);
      const innerR = outerR * 0.4;
      const points = 5;
      let path = '';
      for (let i = 0; i < points * 2; i++) {
        const angle = (i * Math.PI) / points - Math.PI / 2;
        const r = i % 2 === 0 ? outerR : innerR;
        const x = cx + r * Math.cos(angle);
        const y = cy + r * Math.sin(angle);
        path += i === 0 ? `M ${x} ${y}` : ` L ${x} ${y}`;
      }
      return path + ' Z';
    }

    case NodeShape.Cloud: {
      // Forme simplifiée de nuage
      return `M ${w * 0.25} ${h * 0.6}
        Q ${w * 0.05} ${h * 0.6} ${w * 0.1} ${h * 0.4}
        Q ${w * 0.1} ${h * 0.2} ${w * 0.3} ${h * 0.2}
        Q ${w * 0.35} ${h * 0.05} ${w * 0.5} ${h * 0.1}
        Q ${w * 0.7} ${h * 0.05} ${w * 0.75} ${h * 0.25}
        Q ${w * 0.95} ${h * 0.25} ${w * 0.9} ${h * 0.5}
        Q ${w * 0.95} ${h * 0.7} ${w * 0.75} ${h * 0.7}
        L ${w * 0.25} ${h * 0.7}
        Q ${w * 0.1} ${h * 0.7} ${w * 0.25} ${h * 0.6} Z`;
    }

    case NodeShape.Cylinder: {
      const ry = h * 0.1;
      return `M 0 ${ry}
        A ${cx} ${ry} 0 0 1 ${w} ${ry}
        L ${w} ${h - ry}
        A ${cx} ${ry} 0 0 1 0 ${h - ry}
        Z
        M 0 ${ry}
        A ${cx} ${ry} 0 0 0 ${w} ${ry}`;
    }

    case NodeShape.Document: {
      const wave = h * 0.15;
      return `M 0 0 L ${w} 0 L ${w} ${h - wave}
        Q ${w * 0.75} ${h - wave * 2} ${w * 0.5} ${h - wave}
        Q ${w * 0.25} ${h} 0 ${h - wave} Z`;
    }

    case NodeShape.Folder: {
      const tab = h * 0.2;
      const tabW = w * 0.3;
      return `M 0 ${tab} L 0 ${h} L ${w} ${h} L ${w} ${tab}
        L ${tabW + tab} ${tab} L ${tabW} 0 L 0 0 Z`;
    }

    case NodeShape.Note: {
      const fold = Math.min(w, h) * 0.2;
      return `M 0 0 L ${w - fold} 0 L ${w} ${fold} L ${w} ${h} L 0 ${h} Z
        M ${w - fold} 0 L ${w - fold} ${fold} L ${w} ${fold}`;
    }

    case NodeShape.Actor: {
      // Stick figure simplifié
      const headR = Math.min(w, h) * 0.15;
      const headY = headR;
      const bodyTop = headR * 2.2;
      const bodyBottom = h * 0.55;
      const armY = h * 0.35;
      const legBottom = h;
      return `M ${cx} ${headY - headR} A ${headR} ${headR} 0 1 1 ${cx} ${headY + headR} A ${headR} ${headR} 0 1 1 ${cx} ${headY - headR}
        M ${cx} ${bodyTop} L ${cx} ${bodyBottom}
        M 0 ${armY} L ${w} ${armY}
        M ${cx} ${bodyBottom} L 0 ${legBottom}
        M ${cx} ${bodyBottom} L ${w} ${legBottom}`;
    }

    // Formes Archimate
    case NodeShape.ArchimateBehavior: {
      // Rectangle avec coin arrondi en bas à droite
      const r = Math.min(w, h) * 0.2;
      return `M 0 0 L ${w} 0 L ${w} ${h - r} Q ${w} ${h} ${w - r} ${h} L 0 ${h} Z`;
    }

    case NodeShape.ArchimateInterface: {
      // Rectangle avec encoche à gauche
      const notch = h * 0.3;
      return `M ${notch} 0 L ${w} 0 L ${w} ${h} L ${notch} ${h} L ${notch} ${cy + notch / 2} L 0 ${cy} L ${notch} ${cy - notch / 2} Z`;
    }

    case NodeShape.ArchimateService: {
      // Rectangle avec côtés arrondis
      const r = Math.min(w * 0.15, h / 2);
      return `M ${r} 0 L ${w - r} 0 A ${r} ${cy} 0 0 1 ${w - r} ${h} L ${r} ${h} A ${r} ${cy} 0 0 1 ${r} 0 Z`;
    }

    case NodeShape.ArchimateProcess: {
      // Chevron / flèche
      const arrow = w * 0.15;
      return `M 0 0 L ${w - arrow} 0 L ${w} ${cy} L ${w - arrow} ${h} L 0 ${h} L ${arrow} ${cy} Z`;
    }

    default:
      return `M 0 0 L ${w} 0 L ${w} ${h} L 0 ${h} Z`;
  }
}

export function useShapeable(options: ShapeableOptions): ShapeableState & ShapeableHandlers {
  const graphStore = useGraphStore();

  const shape = computed(() => {
    const node = graphStore.nodes[options.nodeId.value];
    return (node?.data?.shape as NodeShape) ?? NodeShape.Rectangle;
  });

  const shapePath = computed(() => {
    const node = graphStore.nodes[options.nodeId.value];
    if (!node) return '';
    return generateShapePath(shape.value, node.geometry.w, node.geometry.h);
  });

  const shapeLabel = computed(() => {
    return SHAPE_METADATA[shape.value]?.label ?? 'Rectangle';
  });

  const shapeCategory = computed(() => {
    return SHAPE_METADATA[shape.value]?.category ?? 'basic';
  });

  function setShape(newShape: NodeShape) {
    const node = graphStore.nodes[options.nodeId.value];
    if (!node) return;

    const metadata = SHAPE_METADATA[newShape];
    let updates: Partial<typeof node> = {
      data: {
        ...node.data,
        shape: newShape,
      },
    };

    // Si la forme a un ratio fixe, ajuster la géométrie
    if (metadata?.defaultAspectRatio) {
      const avgSize = (node.geometry.w + node.geometry.h) / 2;
      if (metadata.defaultAspectRatio === 1) {
        // Cercle/carré
        updates.geometry = {
          ...node.geometry,
          w: avgSize,
          h: avgSize,
        };
      } else {
        updates.geometry = {
          ...node.geometry,
          w: avgSize * metadata.defaultAspectRatio,
          h: avgSize,
        };
      }
    }

    graphStore.updateNode(options.nodeId.value, updates);
  }

  function resetShape() {
    setShape(NodeShape.Rectangle);
  }

  return {
    shape: computed(() => shape.value),
    shapePath,
    shapeLabel,
    shapeCategory,
    setShape,
    resetShape,
  };
}

// Helper pour obtenir les formes par catégorie
export function getShapesByCategory(): Record<string, { shape: NodeShape; label: string }[]> {
  const result: Record<string, { shape: NodeShape; label: string }[]> = {};

  for (const [shape, meta] of Object.entries(SHAPE_METADATA)) {
    if (!result[meta.category]) {
      result[meta.category] = [];
    }
    result[meta.category].push({
      shape: shape as NodeShape,
      label: meta.label,
    });
  }

  return result;
}
