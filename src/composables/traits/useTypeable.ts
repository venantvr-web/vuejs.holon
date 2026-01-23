// src/composables/traits/useTypeable.ts
import { computed, type Ref } from 'vue';
import { useGraphStore } from '../../stores/graph';

// Types Archimate standards
export const ARCHIMATE_TYPES = {
  // Business Layer
  business: {
    label: 'Business',
    color: '#FFFFB5',
    types: {
      'business-actor': { label: 'Actor', icon: '👤' },
      'business-role': { label: 'Role', icon: '🎭' },
      'business-collaboration': { label: 'Collaboration', icon: '🤝' },
      'business-interface': { label: 'Interface', icon: '🔌' },
      'business-process': { label: 'Process', icon: '⚙️' },
      'business-function': { label: 'Function', icon: '📦' },
      'business-interaction': { label: 'Interaction', icon: '↔️' },
      'business-event': { label: 'Event', icon: '⚡' },
      'business-service': { label: 'Service', icon: '🎯' },
      'business-object': { label: 'Object', icon: '📄' },
      'business-contract': { label: 'Contract', icon: '📜' },
      'business-representation': { label: 'Representation', icon: '🖼️' },
      'business-product': { label: 'Product', icon: '📦' },
    },
  },
  // Application Layer
  application: {
    label: 'Application',
    color: '#B5FFFF',
    types: {
      'application-component': { label: 'Component', icon: '🧩' },
      'application-collaboration': { label: 'Collaboration', icon: '🤝' },
      'application-interface': { label: 'Interface', icon: '🔌' },
      'application-function': { label: 'Function', icon: '⚡' },
      'application-interaction': { label: 'Interaction', icon: '↔️' },
      'application-process': { label: 'Process', icon: '⚙️' },
      'application-event': { label: 'Event', icon: '📡' },
      'application-service': { label: 'Service', icon: '🎯' },
      'application-data-object': { label: 'Data Object', icon: '💾' },
    },
  },
  // Technology Layer
  technology: {
    label: 'Technology',
    color: '#C9E7B7',
    types: {
      'technology-node': { label: 'Node', icon: '🖥️' },
      'technology-device': { label: 'Device', icon: '📱' },
      'technology-system-software': { label: 'System Software', icon: '💿' },
      'technology-collaboration': { label: 'Collaboration', icon: '🤝' },
      'technology-interface': { label: 'Interface', icon: '🔌' },
      'technology-path': { label: 'Path', icon: '🛤️' },
      'technology-communication-network': { label: 'Network', icon: '🌐' },
      'technology-function': { label: 'Function', icon: '⚡' },
      'technology-process': { label: 'Process', icon: '⚙️' },
      'technology-interaction': { label: 'Interaction', icon: '↔️' },
      'technology-event': { label: 'Event', icon: '📡' },
      'technology-service': { label: 'Service', icon: '🎯' },
      'technology-artifact': { label: 'Artifact', icon: '📦' },
    },
  },
  // Motivation Layer
  motivation: {
    label: 'Motivation',
    color: '#CCCCFF',
    types: {
      'motivation-stakeholder': { label: 'Stakeholder', icon: '👥' },
      'motivation-driver': { label: 'Driver', icon: '🎯' },
      'motivation-assessment': { label: 'Assessment', icon: '📊' },
      'motivation-goal': { label: 'Goal', icon: '🏆' },
      'motivation-outcome': { label: 'Outcome', icon: '✅' },
      'motivation-principle': { label: 'Principle', icon: '📐' },
      'motivation-requirement': { label: 'Requirement', icon: '📋' },
      'motivation-constraint': { label: 'Constraint', icon: '🚫' },
      'motivation-meaning': { label: 'Meaning', icon: '💡' },
      'motivation-value': { label: 'Value', icon: '💎' },
    },
  },
  // Strategy Layer
  strategy: {
    label: 'Strategy',
    color: '#F5DEAA',
    types: {
      'strategy-resource': { label: 'Resource', icon: '🔧' },
      'strategy-capability': { label: 'Capability', icon: '💪' },
      'strategy-course-of-action': { label: 'Course of Action', icon: '🗺️' },
      'strategy-value-stream': { label: 'Value Stream', icon: '📈' },
    },
  },
  // Implementation & Migration
  implementation: {
    label: 'Implementation',
    color: '#FFE0E0',
    types: {
      'implementation-work-package': { label: 'Work Package', icon: '📁' },
      'implementation-deliverable': { label: 'Deliverable', icon: '📦' },
      'implementation-event': { label: 'Event', icon: '🎉' },
      'implementation-plateau': { label: 'Plateau', icon: '🏔️' },
      'implementation-gap': { label: 'Gap', icon: '⚠️' },
    },
  },
  // Physical Layer
  physical: {
    label: 'Physical',
    color: '#C9E7B7',
    types: {
      'physical-equipment': { label: 'Equipment', icon: '🔧' },
      'physical-facility': { label: 'Facility', icon: '🏭' },
      'physical-distribution-network': { label: 'Distribution Network', icon: '🚚' },
      'physical-material': { label: 'Material', icon: '📦' },
    },
  },
  // Generic / Other
  generic: {
    label: 'Generic',
    color: '#E0E0E0',
    types: {
      'generic-grouping': { label: 'Grouping', icon: '📂' },
      'generic-location': { label: 'Location', icon: '📍' },
      'generic-junction': { label: 'Junction', icon: '⊕' },
      'generic-note': { label: 'Note', icon: '📝' },
    },
  },
} as const;

export type ArchimateLayer = keyof typeof ARCHIMATE_TYPES;
export type ArchimateType = string;

export interface TypeableOptions {
  nodeId: Ref<string>;
}

export interface TypeableState {
  archimateType: Ref<ArchimateType | null>;
  archimateLayer: Ref<ArchimateLayer | null>;
  typeLabel: Ref<string>;
  typeIcon: Ref<string>;
  typeColor: Ref<string>;
}

export interface TypeableHandlers {
  setType: (type: ArchimateType) => void;
  clearType: () => void;
}

export function useTypeable(options: TypeableOptions): TypeableState & TypeableHandlers {
  const graphStore = useGraphStore();

  const archimateType = computed(() => {
    const node = graphStore.nodes[options.nodeId.value];
    return node?.data?.archimateType ?? null;
  });

  const archimateLayer = computed((): ArchimateLayer | null => {
    const type = archimateType.value;
    if (!type) return null;

    for (const [layer, config] of Object.entries(ARCHIMATE_TYPES)) {
      if (type in config.types) {
        return layer as ArchimateLayer;
      }
    }
    return null;
  });

  const typeLabel = computed(() => {
    const type = archimateType.value;
    if (!type) return '';

    for (const config of Object.values(ARCHIMATE_TYPES)) {
      if (type in config.types) {
        return (config.types as Record<string, { label: string }>)[type]?.label ?? '';
      }
    }
    return '';
  });

  const typeIcon = computed(() => {
    const type = archimateType.value;
    if (!type) return '';

    for (const config of Object.values(ARCHIMATE_TYPES)) {
      if (type in config.types) {
        return (config.types as Record<string, { icon: string }>)[type]?.icon ?? '';
      }
    }
    return '';
  });

  const typeColor = computed(() => {
    const layer = archimateLayer.value;
    if (!layer) return '#ffffff';
    return ARCHIMATE_TYPES[layer]?.color ?? '#ffffff';
  });

  function setType(type: ArchimateType) {
    const node = graphStore.nodes[options.nodeId.value];
    if (!node) return;

    // Déterminer la couleur du layer
    let layerColor = '#ffffff';
    for (const config of Object.values(ARCHIMATE_TYPES)) {
      if (type in config.types) {
        layerColor = config.color;
        break;
      }
    }

    graphStore.updateNode(options.nodeId.value, {
      data: {
        ...node.data,
        archimateType: type,
      },
      styling: {
        ...node.styling,
        fill: layerColor,
      },
    });
  }

  function clearType() {
    const node = graphStore.nodes[options.nodeId.value];
    if (!node) return;

    const newData = { ...node.data };
    delete newData.archimateType;

    graphStore.updateNode(options.nodeId.value, {
      data: newData,
    });
  }

  return {
    archimateType: computed(() => archimateType.value),
    archimateLayer: computed(() => archimateLayer.value),
    typeLabel,
    typeIcon,
    typeColor,
    setType,
    clearType,
  };
}

// Helper pour obtenir tous les types à plat
export function getAllArchimateTypes(): Array<{
  type: string;
  label: string;
  icon: string;
  layer: string;
  layerLabel: string;
  color: string;
}> {
  const result: Array<{
    type: string;
    label: string;
    icon: string;
    layer: string;
    layerLabel: string;
    color: string;
  }> = [];

  for (const [layer, config] of Object.entries(ARCHIMATE_TYPES)) {
    for (const [type, typeConfig] of Object.entries(config.types)) {
      result.push({
        type,
        label: typeConfig.label,
        icon: typeConfig.icon,
        layer,
        layerLabel: config.label,
        color: config.color,
      });
    }
  }

  return result;
}
