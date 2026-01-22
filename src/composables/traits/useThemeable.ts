// src/composables/traits/useThemeable.ts
import { ref, computed, watch, type Ref } from 'vue';
import { useGraphStore } from '../../stores/graph';

// Définition d'un thème
export interface ColorPalette {
  // Couleurs de base
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  surface: string;
  text: string;
  textMuted: string;
  border: string;

  // États
  success: string;
  warning: string;
  error: string;
  info: string;

  // Sélection / Interaction
  selection: string;
  hover: string;
  focus: string;
}

export interface ArchimateLayerColors {
  business: string;
  application: string;
  technology: string;
  motivation: string;
  strategy: string;
  implementation: string;
  physical: string;
  generic: string;
}

export interface Theme {
  id: string;
  name: string;
  description?: string;
  isDark: boolean;
  colors: ColorPalette;
  archimate: ArchimateLayerColors;
  // Styles par défaut pour les noeuds
  nodeDefaults: {
    fill: string;
    stroke: string;
    strokeWidth: number;
    opacity: number;
    borderRadius: number;
  };
  // Styles par défaut pour les edges
  edgeDefaults: {
    stroke: string;
    strokeWidth: number;
    arrowColor: string;
  };
  // Métadonnées
  createdAt?: number;
  modifiedAt?: number;
  author?: string;
}

// Thèmes prédéfinis
export const PRESET_THEMES: Record<string, Theme> = {
  light: {
    id: 'light',
    name: 'Clair',
    description: 'Thème clair par défaut',
    isDark: false,
    colors: {
      primary: '#3b82f6',
      secondary: '#64748b',
      accent: '#8b5cf6',
      background: '#ffffff',
      surface: '#f8fafc',
      text: '#1e293b',
      textMuted: '#64748b',
      border: '#e2e8f0',
      success: '#22c55e',
      warning: '#f59e0b',
      error: '#ef4444',
      info: '#3b82f6',
      selection: '#3b82f6',
      hover: '#f1f5f9',
      focus: '#dbeafe',
    },
    archimate: {
      business: '#FFFFB5',
      application: '#B5FFFF',
      technology: '#C9E7B7',
      motivation: '#CCCCFF',
      strategy: '#F5DEAA',
      implementation: '#FFE0E0',
      physical: '#C9E7B7',
      generic: '#E0E0E0',
    },
    nodeDefaults: {
      fill: '#ffffff',
      stroke: '#333333',
      strokeWidth: 1,
      opacity: 1,
      borderRadius: 4,
    },
    edgeDefaults: {
      stroke: '#333333',
      strokeWidth: 2,
      arrowColor: '#333333',
    },
  },

  dark: {
    id: 'dark',
    name: 'Sombre',
    description: 'Thème sombre',
    isDark: true,
    colors: {
      primary: '#60a5fa',
      secondary: '#94a3b8',
      accent: '#a78bfa',
      background: '#0f172a',
      surface: '#1e293b',
      text: '#f1f5f9',
      textMuted: '#94a3b8',
      border: '#334155',
      success: '#4ade80',
      warning: '#fbbf24',
      error: '#f87171',
      info: '#60a5fa',
      selection: '#60a5fa',
      hover: '#334155',
      focus: '#1e3a5f',
    },
    archimate: {
      business: '#8B8B00',
      application: '#008B8B',
      technology: '#4A7A3A',
      motivation: '#6666AA',
      strategy: '#A08040',
      implementation: '#AA6060',
      physical: '#4A7A3A',
      generic: '#606060',
    },
    nodeDefaults: {
      fill: '#1e293b',
      stroke: '#94a3b8',
      strokeWidth: 1,
      opacity: 1,
      borderRadius: 4,
    },
    edgeDefaults: {
      stroke: '#94a3b8',
      strokeWidth: 2,
      arrowColor: '#94a3b8',
    },
  },

  archimate: {
    id: 'archimate',
    name: 'Archimate Standard',
    description: 'Couleurs officielles Archimate',
    isDark: false,
    colors: {
      primary: '#1a73e8',
      secondary: '#5f6368',
      accent: '#9334e6',
      background: '#ffffff',
      surface: '#f8f9fa',
      text: '#202124',
      textMuted: '#5f6368',
      border: '#dadce0',
      success: '#34a853',
      warning: '#fbbc04',
      error: '#ea4335',
      info: '#4285f4',
      selection: '#1a73e8',
      hover: '#f1f3f4',
      focus: '#e8f0fe',
    },
    archimate: {
      business: '#FFFFB5',
      application: '#B5FFFF',
      technology: '#C9E7B7',
      motivation: '#CCCCFF',
      strategy: '#F5DEAA',
      implementation: '#FFE0E0',
      physical: '#C9E7B7',
      generic: '#E0E0E0',
    },
    nodeDefaults: {
      fill: '#ffffff',
      stroke: '#000000',
      strokeWidth: 1,
      opacity: 1,
      borderRadius: 0,
    },
    edgeDefaults: {
      stroke: '#000000',
      strokeWidth: 1,
      arrowColor: '#000000',
    },
  },

  blueprint: {
    id: 'blueprint',
    name: 'Blueprint',
    description: 'Style plan technique',
    isDark: true,
    colors: {
      primary: '#4fc3f7',
      secondary: '#81d4fa',
      accent: '#00bcd4',
      background: '#0d47a1',
      surface: '#1565c0',
      text: '#e3f2fd',
      textMuted: '#90caf9',
      border: '#1976d2',
      success: '#00e676',
      warning: '#ffea00',
      error: '#ff5252',
      info: '#40c4ff',
      selection: '#4fc3f7',
      hover: '#1976d2',
      focus: '#1e88e5',
    },
    archimate: {
      business: '#fff59d',
      application: '#80deea',
      technology: '#a5d6a7',
      motivation: '#b39ddb',
      strategy: '#ffcc80',
      implementation: '#ef9a9a',
      physical: '#a5d6a7',
      generic: '#bdbdbd',
    },
    nodeDefaults: {
      fill: 'transparent',
      stroke: '#4fc3f7',
      strokeWidth: 2,
      opacity: 1,
      borderRadius: 0,
    },
    edgeDefaults: {
      stroke: '#4fc3f7',
      strokeWidth: 1,
      arrowColor: '#4fc3f7',
    },
  },

  highContrast: {
    id: 'highContrast',
    name: 'Contraste élevé',
    description: 'Pour accessibilité',
    isDark: true,
    colors: {
      primary: '#ffff00',
      secondary: '#00ffff',
      accent: '#ff00ff',
      background: '#000000',
      surface: '#1a1a1a',
      text: '#ffffff',
      textMuted: '#cccccc',
      border: '#ffffff',
      success: '#00ff00',
      warning: '#ffff00',
      error: '#ff0000',
      info: '#00ffff',
      selection: '#ffff00',
      hover: '#333333',
      focus: '#444444',
    },
    archimate: {
      business: '#ffff00',
      application: '#00ffff',
      technology: '#00ff00',
      motivation: '#ff00ff',
      strategy: '#ffa500',
      implementation: '#ff6666',
      physical: '#00ff00',
      generic: '#ffffff',
    },
    nodeDefaults: {
      fill: '#000000',
      stroke: '#ffffff',
      strokeWidth: 2,
      opacity: 1,
      borderRadius: 0,
    },
    edgeDefaults: {
      stroke: '#ffffff',
      strokeWidth: 2,
      arrowColor: '#ffffff',
    },
  },
};

// État global du thème
const currentThemeId = ref<string>('light');
const customThemes = ref<Map<string, Theme>>(new Map());

export interface ThemeableState {
  currentTheme: Ref<Theme>;
  currentThemeId: Ref<string>;
  availableThemes: Ref<Theme[]>;
  isDarkMode: Ref<boolean>;
}

export interface ThemeableHandlers {
  setTheme: (themeId: string) => void;
  createTheme: (theme: Omit<Theme, 'id' | 'createdAt'>) => string;
  updateTheme: (themeId: string, updates: Partial<Theme>) => void;
  deleteTheme: (themeId: string) => boolean;
  duplicateTheme: (themeId: string, newName: string) => string | null;
  exportTheme: (themeId: string) => string | null;
  importTheme: (json: string) => string | null;
  getColor: (key: keyof ColorPalette) => string;
  getArchimateColor: (layer: keyof ArchimateLayerColors) => string;
  applyThemeToNode: (nodeId: string) => void;
  toggleDarkMode: () => void;
}

export function useThemeable(): ThemeableState & ThemeableHandlers {
  const graphStore = useGraphStore();

  const currentTheme = computed((): Theme => {
    const custom = customThemes.value.get(currentThemeId.value);
    if (custom) return custom;
    return PRESET_THEMES[currentThemeId.value] ?? PRESET_THEMES.light;
  });

  const availableThemes = computed((): Theme[] => {
    const presets = Object.values(PRESET_THEMES);
    const customs = Array.from(customThemes.value.values());
    return [...presets, ...customs];
  });

  const isDarkMode = computed(() => currentTheme.value.isDark);

  function setTheme(themeId: string) {
    if (PRESET_THEMES[themeId] || customThemes.value.has(themeId)) {
      currentThemeId.value = themeId;
      applyThemeToCss();
    }
  }

  function createTheme(theme: Omit<Theme, 'id' | 'createdAt'>): string {
    const id = `custom-${Date.now()}`;
    const newTheme: Theme = {
      ...theme,
      id,
      createdAt: Date.now(),
      modifiedAt: Date.now(),
    };
    customThemes.value.set(id, newTheme);
    return id;
  }

  function updateTheme(themeId: string, updates: Partial<Theme>) {
    const theme = customThemes.value.get(themeId);
    if (theme) {
      const updated = {
        ...theme,
        ...updates,
        id: theme.id, // Empêcher la modification de l'ID
        modifiedAt: Date.now(),
      };
      customThemes.value.set(themeId, updated);

      // Si c'est le thème actuel, réappliquer
      if (currentThemeId.value === themeId) {
        applyThemeToCss();
      }
    }
  }

  function deleteTheme(themeId: string): boolean {
    // Ne pas supprimer les presets
    if (PRESET_THEMES[themeId]) return false;

    const deleted = customThemes.value.delete(themeId);

    // Si c'était le thème actuel, revenir au light
    if (deleted && currentThemeId.value === themeId) {
      setTheme('light');
    }

    return deleted;
  }

  function duplicateTheme(themeId: string, newName: string): string | null {
    const source = PRESET_THEMES[themeId] ?? customThemes.value.get(themeId);
    if (!source) return null;

    return createTheme({
      ...source,
      name: newName,
      description: `Copie de ${source.name}`,
    });
  }

  function exportTheme(themeId: string): string | null {
    const theme = PRESET_THEMES[themeId] ?? customThemes.value.get(themeId);
    if (!theme) return null;
    return JSON.stringify(theme, null, 2);
  }

  function importTheme(json: string): string | null {
    try {
      const theme = JSON.parse(json) as Theme;
      // Valider la structure minimale
      if (!theme.name || !theme.colors || !theme.archimate) {
        return null;
      }
      return createTheme(theme);
    } catch {
      return null;
    }
  }

  function getColor(key: keyof ColorPalette): string {
    return currentTheme.value.colors[key];
  }

  function getArchimateColor(layer: keyof ArchimateLayerColors): string {
    return currentTheme.value.archimate[layer];
  }

  function applyThemeToNode(nodeId: string) {
    const node = graphStore.nodes[nodeId];
    if (!node) return;

    const defaults = currentTheme.value.nodeDefaults;

    graphStore.updateNode(nodeId, {
      style: {
        ...node.style,
        fill: defaults.fill,
        stroke: defaults.stroke,
        strokeWidth: defaults.strokeWidth,
        opacity: defaults.opacity,
      },
    });
  }

  function toggleDarkMode() {
    if (isDarkMode.value) {
      setTheme('light');
    } else {
      setTheme('dark');
    }
  }

  // Applique les variables CSS du thème
  function applyThemeToCss() {
    const theme = currentTheme.value;
    const root = document.documentElement;

    // Couleurs de base
    for (const [key, value] of Object.entries(theme.colors)) {
      root.style.setProperty(`--color-${key}`, value);
    }

    // Couleurs Archimate
    for (const [key, value] of Object.entries(theme.archimate)) {
      root.style.setProperty(`--archimate-${key}`, value);
    }

    // Classe dark mode
    if (theme.isDark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }

  // Appliquer le thème initial
  applyThemeToCss();

  return {
    currentTheme,
    currentThemeId: computed(() => currentThemeId.value),
    availableThemes,
    isDarkMode,
    setTheme,
    createTheme,
    updateTheme,
    deleteTheme,
    duplicateTheme,
    exportTheme,
    importTheme,
    getColor,
    getArchimateColor,
    applyThemeToNode,
    toggleDarkMode,
  };
}

// Export de l'état global pour persistance
export function useThemeState() {
  return {
    currentThemeId,
    customThemes,
    saveToStorage: () => {
      localStorage.setItem('holon-theme', currentThemeId.value);
      localStorage.setItem(
        'holon-custom-themes',
        JSON.stringify(Array.from(customThemes.value.entries()))
      );
    },
    loadFromStorage: () => {
      const savedTheme = localStorage.getItem('holon-theme');
      if (savedTheme) {
        currentThemeId.value = savedTheme;
      }

      const savedCustom = localStorage.getItem('holon-custom-themes');
      if (savedCustom) {
        try {
          const entries = JSON.parse(savedCustom) as [string, Theme][];
          customThemes.value = new Map(entries);
        } catch {
          // Ignorer les erreurs de parsing
        }
      }
    },
  };
}
